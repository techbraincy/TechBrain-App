-- ============================================================
-- 006 Shop: per-business storefront configuration
-- Adds shop_configs for published state, branding, and discovery.
-- The shop itself reuses menu_categories, menu_items, delivery_configs,
-- and operating_hours already in the schema.
-- ============================================================

create table if not exists public.shop_configs (
  id               uuid default gen_random_uuid() primary key,
  business_id      uuid references public.businesses(id) on delete cascade unique not null,

  -- Visibility
  is_published     boolean default true,

  -- Storefront branding (extends business defaults)
  cover_image_url  text,              -- hero/banner image for the shop page
  announcement     text,              -- optional top-of-page banner text (e.g. "Κλειστά Δευτέρα")

  -- SEO / sharing metadata
  seo_title        text,              -- overrides business name in <title>
  seo_description  text,              -- meta description

  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

alter table public.shop_configs enable row level security;

create trigger shop_configs_updated_at before update on public.shop_configs
  for each row execute procedure public.set_updated_at();

-- Business members can read their shop config
create policy "members_read_shop_config" on public.shop_configs
  for select using (public.is_business_member(business_id));

-- Managers can update shop config
create policy "managers_write_shop_config" on public.shop_configs
  for all using (public.is_business_manager(business_id));

-- Public can read published shop configs (for storefront rendering)
create policy "public_read_published_shop" on public.shop_configs
  for select using (is_published = true);

-- ----------------------------------------------------------------
-- Public read policy on menu_categories (storefront needs it)
-- ----------------------------------------------------------------
-- Already covered by public_read_active_menu_items on menu_items.
-- Add a matching policy for categories so the storefront can load them.
create policy "public_read_active_menu_categories" on public.menu_categories
  for select using (is_active = true);

-- ----------------------------------------------------------------
-- Index for fast slug lookup (businesses table already has slug unique)
-- ----------------------------------------------------------------
create index if not exists idx_businesses_slug on public.businesses (slug);
create index if not exists idx_shop_configs_business on public.shop_configs (business_id);
