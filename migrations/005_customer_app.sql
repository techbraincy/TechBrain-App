-- ============================================================
-- 005 Customer App: app_customers, addresses, carts, coupons,
--     payment methods, order extensions, status history
-- Run this in Supabase SQL editor
-- ============================================================

-- ----------------------------------------------------------------
-- Customer profiles (extends auth.users for the ordering app)
-- ----------------------------------------------------------------
create table if not exists public.app_customers (
  id                uuid references auth.users(id) on delete cascade primary key,
  first_name        text not null default '',
  last_name         text not null default '',
  phone             text,
  preferred_language text default 'el' check (preferred_language in ('el', 'en')),
  notify_order_updates  boolean default true,
  notify_promotions     boolean default false,
  stripe_customer_id    text,  -- Stripe customer ID for saved cards
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

alter table public.app_customers enable row level security;

create trigger app_customers_updated_at before update on public.app_customers
  for each row execute procedure public.set_updated_at();

-- Users can only read/write their own profile
create policy "app_customers_own" on public.app_customers
  for all using (id = auth.uid());

-- Auto-create stub profile on signup (populated during onboarding)
create or replace function public.handle_new_app_customer()
returns trigger language plpgsql security definer as $$
begin
  insert into public.app_customers (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------
-- Customer saved delivery addresses
-- ----------------------------------------------------------------
create table if not exists public.customer_addresses (
  id           uuid default gen_random_uuid() primary key,
  customer_id  uuid references auth.users(id) on delete cascade not null,
  label        text not null default 'Σπίτι',
  address_text text not null,
  lat          double precision,
  lng          double precision,
  instructions text,
  is_default   boolean default false,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.customer_addresses enable row level security;

create trigger customer_addresses_updated_at before update on public.customer_addresses
  for each row execute procedure public.set_updated_at();

create policy "customer_addresses_own" on public.customer_addresses
  for all using (customer_id = auth.uid());

-- ----------------------------------------------------------------
-- Coupons (per business)
-- ----------------------------------------------------------------
create table if not exists public.coupons (
  id               uuid default gen_random_uuid() primary key,
  business_id      uuid references public.businesses(id) on delete cascade not null,
  code             text not null,
  type             text not null check (type in ('percent', 'fixed')),
  value            numeric(10, 2) not null check (value > 0),
  min_order_amount numeric(10, 2) default 0,
  max_uses         integer,           -- null = unlimited
  uses_count       integer default 0,
  valid_from       timestamptz,
  valid_until      timestamptz,
  is_active        boolean default true,
  created_at       timestamptz default now() not null,
  unique (business_id, code)
);

alter table public.coupons enable row level security;

-- Members can view/manage coupons for their business
create policy "members_manage_coupons" on public.coupons
  for all using (public.is_business_member(business_id));

-- Customers can read active coupons (needed for validation)
create policy "public_read_active_coupons" on public.coupons
  for select using (is_active = true);

-- ----------------------------------------------------------------
-- Saved payment method references (Stripe tokens only — no raw card data)
-- ----------------------------------------------------------------
create table if not exists public.saved_payment_methods (
  id                        uuid default gen_random_uuid() primary key,
  customer_id               uuid references auth.users(id) on delete cascade not null,
  stripe_payment_method_id  text not null unique,
  type                      text not null,   -- card, apple_pay, google_pay
  card_brand                text,            -- visa, mastercard, etc.
  card_last4                text,
  card_exp_month            integer,
  card_exp_year             integer,
  is_default                boolean default false,
  created_at                timestamptz default now() not null
);

alter table public.saved_payment_methods enable row level security;

create policy "saved_pm_own" on public.saved_payment_methods
  for all using (customer_id = auth.uid());

-- ----------------------------------------------------------------
-- Extend orders table for app-specific fields
-- ----------------------------------------------------------------
alter table public.orders
  add column if not exists app_customer_id   uuid references auth.users(id) on delete set null,
  add column if not exists tip_amount        numeric(10, 2) default 0,
  add column if not exists service_fee       numeric(10, 2) default 0,
  add column if not exists coupon_id         uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code       text,
  add column if not exists coupon_discount   numeric(10, 2) default 0,
  add column if not exists driver_comment    text,
  add column if not exists payment_method    text default 'cash',  -- cash, card, apple_pay, google_pay
  add column if not exists payment_reference text,                 -- Stripe PaymentIntent ID
  add column if not exists address_snapshot  jsonb;               -- address at time of order

-- Allow customers to read their own orders
create policy "app_customers_read_own_orders" on public.orders
  for select using (app_customer_id = auth.uid());

-- ----------------------------------------------------------------
-- Order status history
-- ----------------------------------------------------------------
create table if not exists public.order_status_history (
  id         uuid default gen_random_uuid() primary key,
  order_id   uuid references public.orders(id) on delete cascade not null,
  status     text not null,
  note       text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.order_status_history enable row level security;

-- Business members can see history for their orders
create policy "members_read_order_history" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      join public.business_members bm on bm.business_id = o.business_id
      where o.id = order_status_history.order_id
        and bm.user_id = auth.uid()
    )
  );

-- Customers can see history for their own orders
create policy "customers_read_own_order_history" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and o.app_customer_id = auth.uid()
    )
  );

-- Insert via service role (server-side only)

-- ----------------------------------------------------------------
-- Function: record status change in history on order update
-- ----------------------------------------------------------------
create or replace function public.record_order_status_change()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger order_status_history_trigger
  after update on public.orders
  for each row execute procedure public.record_order_status_change();

-- ----------------------------------------------------------------
-- Indexes for performance
-- ----------------------------------------------------------------
create index if not exists idx_orders_app_customer on public.orders (app_customer_id) where app_customer_id is not null;
create index if not exists idx_customer_addresses_customer on public.customer_addresses (customer_id);
create index if not exists idx_coupons_business_code on public.coupons (business_id, code);
create index if not exists idx_order_status_history_order on public.order_status_history (order_id, created_at);
