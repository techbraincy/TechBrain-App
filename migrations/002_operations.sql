-- ============================================================
-- 002 Operations: hours, agent config, menu, FAQs
-- ============================================================

-- ----------------------------------------------------------------
-- Operating hours
-- ----------------------------------------------------------------
create table if not exists public.operating_hours (
  id           uuid default gen_random_uuid() primary key,
  business_id  uuid references public.businesses(id) on delete cascade not null,
  day_of_week  smallint not null check (day_of_week between 0 and 6), -- 0=Sun … 6=Sat
  is_open      boolean default true,
  open_time    time,   -- null means closed all day
  close_time   time,
  unique (business_id, day_of_week)
);

alter table public.operating_hours enable row level security;

create policy "members_read_hours" on public.operating_hours
  for select using (public.is_business_member(business_id));

create policy "managers_write_hours" on public.operating_hours
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- Agent configuration
-- ----------------------------------------------------------------
create type public.agent_sync_status as enum ('pending', 'synced', 'failed');
create type public.agent_language    as enum ('greek', 'english', 'bilingual');
create type public.agent_tone        as enum ('professional', 'friendly', 'casual');

create table if not exists public.agent_configs (
  id                   uuid default gen_random_uuid() primary key,
  business_id          uuid references public.businesses(id) on delete cascade unique not null,
  -- Language & tone
  language             public.agent_language default 'bilingual',
  tone                 public.agent_tone     default 'friendly',
  -- Greetings
  greeting_greek       text,
  greeting_english     text,
  -- Identity
  agent_name           text default 'Assistant',
  -- Custom instructions (appended to generated system prompt)
  custom_instructions  text,
  -- Escalation
  escalation_enabled   boolean default false,
  escalation_phone     text,
  escalation_message_greek   text,
  escalation_message_english text,
  -- Sync state
  sync_status          public.agent_sync_status default 'pending',
  sync_error           text,
  last_synced_at       timestamptz,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

alter table public.agent_configs enable row level security;

create trigger agent_configs_updated_at before update on public.agent_configs
  for each row execute procedure public.set_updated_at();

create policy "members_read_agent_config" on public.agent_configs
  for select using (public.is_business_member(business_id));

create policy "managers_write_agent_config" on public.agent_configs
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- Menu categories
-- ----------------------------------------------------------------
create table if not exists public.menu_categories (
  id           uuid default gen_random_uuid() primary key,
  business_id  uuid references public.businesses(id) on delete cascade not null,
  name_el      text not null,          -- Greek name
  name_en      text,                   -- English name (optional)
  sort_order   integer default 0,
  is_active    boolean default true,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.menu_categories enable row level security;

create trigger menu_categories_updated_at before update on public.menu_categories
  for each row execute procedure public.set_updated_at();

create policy "members_read_menu_categories" on public.menu_categories
  for select using (public.is_business_member(business_id));

create policy "managers_write_menu_categories" on public.menu_categories
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- Menu items
-- ----------------------------------------------------------------
create table if not exists public.menu_items (
  id          uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  category_id uuid references public.menu_categories(id) on delete set null,
  name_el     text not null,
  name_en     text,
  description_el text,
  description_en text,
  price       numeric(10, 2) not null default 0,
  image_url   text,
  is_available boolean default true,
  is_active    boolean default true,
  sort_order   integer default 0,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.menu_items enable row level security;

create trigger menu_items_updated_at before update on public.menu_items
  for each row execute procedure public.set_updated_at();

create policy "members_read_menu_items" on public.menu_items
  for select using (public.is_business_member(business_id));

-- Customer portal also needs to read menu items (public, scoped by business)
create policy "public_read_active_menu_items" on public.menu_items
  for select using (is_active = true and is_available = true);

create policy "managers_write_menu_items" on public.menu_items
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- FAQs / Knowledge base
-- ----------------------------------------------------------------
create table if not exists public.faqs (
  id          uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  question_el text not null,
  question_en text,
  answer_el   text not null,
  answer_en   text,
  is_active   boolean default true,
  sort_order  integer default 0,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.faqs enable row level security;

create trigger faqs_updated_at before update on public.faqs
  for each row execute procedure public.set_updated_at();

create policy "members_read_faqs" on public.faqs
  for select using (public.is_business_member(business_id));

create policy "managers_write_faqs" on public.faqs
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- Reservation config (slots & rules, one per business)
-- ----------------------------------------------------------------
create table if not exists public.reservation_configs (
  id                    uuid default gen_random_uuid() primary key,
  business_id           uuid references public.businesses(id) on delete cascade unique not null,
  slot_duration_minutes integer default 60,
  max_party_size        integer default 10,
  min_advance_minutes   integer default 60,    -- how far ahead required
  max_advance_days      integer default 30,    -- how far ahead allowed
  buffer_minutes        integer default 15,    -- gap between slots
  auto_confirm          boolean default false, -- confirm without staff action
  created_at            timestamptz default now() not null,
  updated_at            timestamptz default now() not null
);

alter table public.reservation_configs enable row level security;

create trigger reservation_configs_updated_at before update on public.reservation_configs
  for each row execute procedure public.set_updated_at();

create policy "members_read_res_config" on public.reservation_configs
  for select using (public.is_business_member(business_id));

create policy "managers_write_res_config" on public.reservation_configs
  for all using (public.is_business_manager(business_id));


-- ----------------------------------------------------------------
-- Delivery config (one per business)
-- ----------------------------------------------------------------
create table if not exists public.delivery_configs (
  id                  uuid default gen_random_uuid() primary key,
  business_id         uuid references public.businesses(id) on delete cascade unique not null,
  delivery_radius_km  numeric(5, 2) default 5,
  min_order_amount    numeric(10, 2) default 0,
  delivery_fee        numeric(10, 2) default 0,
  free_delivery_above numeric(10, 2),          -- null = never free
  estimated_minutes   integer default 45,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

alter table public.delivery_configs enable row level security;

create trigger delivery_configs_updated_at before update on public.delivery_configs
  for each row execute procedure public.set_updated_at();

create policy "members_read_delivery_config" on public.delivery_configs
  for select using (public.is_business_member(business_id));

create policy "managers_write_delivery_config" on public.delivery_configs
  for all using (public.is_business_manager(business_id));
