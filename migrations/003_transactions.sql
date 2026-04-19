-- ============================================================
-- 003 Transactions: customers, orders, reservations, call_logs, audit
-- ============================================================

-- ----------------------------------------------------------------
-- Customers (per-business contact records)
-- ----------------------------------------------------------------
create table if not exists public.customers (
  id          uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  phone       text,
  name        text,
  email       text,
  language    text default 'el',       -- preferred language detected from calls
  notes       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  unique (business_id, phone)
);

alter table public.customers enable row level security;

create trigger customers_updated_at before update on public.customers
  for each row execute procedure public.set_updated_at();

create policy "members_read_customers" on public.customers
  for select using (public.is_business_member(business_id));

create policy "members_write_customers" on public.customers
  for all using (public.is_business_member(business_id));


-- ----------------------------------------------------------------
-- Order status & type enums
-- ----------------------------------------------------------------
create type public.order_type   as enum ('takeaway', 'delivery', 'dine_in');
create type public.order_source as enum ('phone', 'portal', 'staff', 'webhook');
create type public.order_status as enum (
  'pending',
  'awaiting_approval',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'dispatched',
  'completed',
  'cancelled'
);


-- ----------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------
create table if not exists public.orders (
  id              uuid default gen_random_uuid() primary key,
  business_id     uuid references public.businesses(id) on delete cascade not null,
  customer_id     uuid references public.customers(id) on delete set null,
  -- Reference number shown to customers (short, readable)
  reference       text not null,
  type            public.order_type   not null default 'takeaway',
  source          public.order_source not null default 'phone',
  status          public.order_status not null default 'pending',
  -- Financials
  subtotal        numeric(10, 2) default 0,
  delivery_fee    numeric(10, 2) default 0,
  total           numeric(10, 2) default 0,
  -- Delivery details (when type=delivery)
  delivery_address text,
  delivery_notes   text,
  estimated_minutes integer,
  -- Customer info (captured even without a customer record)
  customer_phone  text,
  customer_name   text,
  preferred_language text default 'el',
  -- Staff
  accepted_by     uuid references auth.users(id),
  accepted_at     timestamptz,
  rejected_by     uuid references auth.users(id),
  rejected_at     timestamptz,
  rejection_reason text,
  -- Timestamps
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table public.orders enable row level security;

create trigger orders_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();

-- Generate a short human-readable reference (e.g. ORD-0042)
create or replace function public.generate_order_reference(p_business_id uuid)
returns text language plpgsql as $$
declare
  v_count integer;
begin
  select count(*) + 1 into v_count
  from public.orders
  where business_id = p_business_id;
  return 'ORD-' || lpad(v_count::text, 4, '0');
end;
$$;

create policy "members_read_orders" on public.orders
  for select using (public.is_business_member(business_id));

create policy "members_write_orders" on public.orders
  for all using (public.is_business_member(business_id));

-- Public portal: customers can read their own order by id (no auth)
-- This is handled in the portal API routes using service_role, not RLS


-- ----------------------------------------------------------------
-- Order items
-- ----------------------------------------------------------------
create table if not exists public.order_items (
  id          uuid default gen_random_uuid() primary key,
  order_id    uuid references public.orders(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_el     text not null,
  name_en     text,
  unit_price  numeric(10, 2) not null,
  quantity    integer not null default 1,
  subtotal    numeric(10, 2) generated always as (unit_price * quantity) stored,
  notes       text,
  created_at  timestamptz default now() not null
);

alter table public.order_items enable row level security;

create policy "members_read_order_items" on public.order_items
  for select using (public.is_business_member(business_id));

create policy "members_write_order_items" on public.order_items
  for all using (public.is_business_member(business_id));


-- ----------------------------------------------------------------
-- Reservation status enum
-- ----------------------------------------------------------------
create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'rejected',
  'completed',
  'no_show',
  'cancelled'
);

create type public.reservation_source as enum ('phone', 'portal', 'staff');


-- ----------------------------------------------------------------
-- Reservations
-- ----------------------------------------------------------------
create table if not exists public.reservations (
  id              uuid default gen_random_uuid() primary key,
  business_id     uuid references public.businesses(id) on delete cascade not null,
  customer_id     uuid references public.customers(id) on delete set null,
  reference       text not null,
  status          public.reservation_status not null default 'pending',
  source          public.reservation_source not null default 'phone',
  -- Booking details
  reserved_at     timestamptz not null,       -- the booked date + time slot
  party_size      integer not null default 1,
  duration_minutes integer default 60,
  table_number    text,
  -- Customer info
  customer_name   text,
  customer_phone  text,
  preferred_language text default 'el',
  notes           text,
  -- Staff
  confirmed_by    uuid references auth.users(id),
  confirmed_at    timestamptz,
  rejected_by     uuid references auth.users(id),
  rejected_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table public.reservations enable row level security;

create trigger reservations_updated_at before update on public.reservations
  for each row execute procedure public.set_updated_at();

create or replace function public.generate_reservation_reference(p_business_id uuid)
returns text language plpgsql as $$
declare
  v_count integer;
begin
  select count(*) + 1 into v_count
  from public.reservations
  where business_id = p_business_id;
  return 'RES-' || lpad(v_count::text, 4, '0');
end;
$$;

create policy "members_read_reservations" on public.reservations
  for select using (public.is_business_member(business_id));

create policy "members_write_reservations" on public.reservations
  for all using (public.is_business_member(business_id));


-- ----------------------------------------------------------------
-- Call logs
-- ----------------------------------------------------------------
create type public.call_outcome as enum (
  'completed',
  'no_answer',
  'escalated',
  'error',
  'voicemail'
);

create table if not exists public.call_logs (
  id                  uuid default gen_random_uuid() primary key,
  business_id         uuid references public.businesses(id) on delete cascade not null,
  customer_id         uuid references public.customers(id) on delete set null,
  elevenlabs_call_id  text,
  caller_phone        text,
  language_detected   text,
  duration_seconds    integer,
  outcome             public.call_outcome default 'completed',
  -- What the call produced
  order_id            uuid references public.orders(id) on delete set null,
  reservation_id      uuid references public.reservations(id) on delete set null,
  -- Transcript excerpt (first 2000 chars)
  transcript_excerpt  text,
  created_at          timestamptz default now() not null
);

alter table public.call_logs enable row level security;

create policy "members_read_call_logs" on public.call_logs
  for select using (public.is_business_member(business_id));

create policy "members_insert_call_logs" on public.call_logs
  for insert with check (public.is_business_member(business_id));


-- ----------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,          -- e.g. 'order.accepted', 'reservation.rejected'
  entity_type text,                   -- 'order', 'reservation', 'agent_config', etc.
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  created_at  timestamptz default now() not null
);

alter table public.audit_log enable row level security;

create policy "managers_read_audit" on public.audit_log
  for select using (public.is_business_manager(business_id));

create policy "system_insert_audit" on public.audit_log
  for insert with check (true);       -- written by service_role from API routes

-- Indexes for common query patterns
create index if not exists orders_business_status    on public.orders(business_id, status);
create index if not exists orders_business_created   on public.orders(business_id, created_at desc);
create index if not exists reservations_business_at  on public.reservations(business_id, reserved_at);
create index if not exists call_logs_business_created on public.call_logs(business_id, created_at desc);
create index if not exists audit_log_business_created on public.audit_log(business_id, created_at desc);
create index if not exists customers_business_phone  on public.customers(business_id, phone);
