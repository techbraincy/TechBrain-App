-- ============================================================
-- 001 Foundation: profiles, businesses, members, features
-- ============================================================

-- Profiles (extends auth.users, created automatically via trigger)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ----------------------------------------------------------------
-- Business types enum
-- ----------------------------------------------------------------
create type public.business_type as enum (
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'retail',
  'services',
  'beauty',
  'healthcare',
  'other'
);

create type public.business_role as enum ('owner', 'manager', 'staff');

create type public.setup_status as enum ('pending', 'in_progress', 'complete', 'failed');


-- ----------------------------------------------------------------
-- Businesses (tenant anchor)
-- ----------------------------------------------------------------
create table if not exists public.businesses (
  id          uuid default gen_random_uuid() primary key,
  slug        text unique not null,
  name        text not null,
  type        public.business_type not null default 'restaurant',
  description text,
  logo_url    text,
  -- Contact
  email       text,
  phone       text,
  website     text,
  -- Location
  address     text,
  city        text,
  postal_code text,
  country     text default 'Greece',
  -- Config
  timezone    text default 'Europe/Athens',
  currency    text default 'EUR',
  locale      text default 'el',           -- primary locale
  -- Branding
  primary_color   text default '#6366f1',
  accent_color    text default '#06b6d4',
  -- ElevenLabs
  elevenlabs_agent_id text,
  -- Setup
  setup_status    public.setup_status default 'pending',
  setup_error     text,
  is_active       boolean default true,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table public.businesses enable row level security;

create trigger businesses_updated_at before update on public.businesses
  for each row execute procedure public.set_updated_at();


-- ----------------------------------------------------------------
-- Business members (user ↔ business ↔ role)
-- ----------------------------------------------------------------
create table if not exists public.business_members (
  id          uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        public.business_role not null default 'staff',
  invited_by  uuid references auth.users(id),
  joined_at   timestamptz default now() not null,
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;

-- Members can see who else is in their business
create policy "members_read_same_business" on public.business_members
  for select using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
        and bm.user_id = auth.uid()
    )
  );

-- Owners/managers can add members
create policy "managers_insert_members" on public.business_members
  for insert with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

-- Owners can remove members (or users can remove themselves)
create policy "owners_delete_members" on public.business_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'owner'
    )
  );

-- Owners can update roles
create policy "owners_update_members" on public.business_members
  for update using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_members.business_id
        and bm.user_id = auth.uid()
        and bm.role = 'owner'
    )
  );

-- RLS for businesses: only members can see their business
create policy "members_read_business" on public.businesses
  for select using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = id
        and bm.user_id = auth.uid()
    )
  );

-- Owners and managers can update business info
create policy "managers_update_business" on public.businesses
  for update using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

-- New businesses are inserted via service role (provisioning), no user policy needed
-- (the provisioning API uses service_role key)


-- ----------------------------------------------------------------
-- Business features (per-tenant feature flags)
-- ----------------------------------------------------------------
create table if not exists public.business_features (
  id                      uuid default gen_random_uuid() primary key,
  business_id             uuid references public.businesses(id) on delete cascade unique not null,
  orders_enabled          boolean default false,
  reservations_enabled    boolean default false,
  takeaway_enabled        boolean default false,
  delivery_enabled        boolean default false,
  staff_approval_enabled  boolean default false,
  faqs_enabled            boolean default true,
  customer_portal_enabled boolean default true,
  live_tracking_enabled   boolean default false,
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

alter table public.business_features enable row level security;

create trigger business_features_updated_at before update on public.business_features
  for each row execute procedure public.set_updated_at();

create policy "members_read_features" on public.business_features
  for select using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_features.business_id
        and bm.user_id = auth.uid()
    )
  );

create policy "managers_update_features" on public.business_features
  for update using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_features.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );


-- ----------------------------------------------------------------
-- Helper function: is user a member of a business?
-- ----------------------------------------------------------------
create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_business_manager(p_business_id uuid)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;
