-- ============================================================
-- 007 Shop Branding: storefront template customisation fields
-- Adds per-shop subtitle, logo override, hero overlay text,
-- and a configurable banners/offers JSON array.
-- ============================================================

alter table public.shop_configs
  add column if not exists subtitle     text,           -- Tagline shown on home and menu header
  add column if not exists logo_url     text,           -- Shop-specific logo URL (overrides business.logo_url)
  add column if not exists hero_tagline text,           -- Optional overlay text on cover hero image
  add column if not exists banners      jsonb           -- Array of promotional offer cards (see format below)
    default '[]'::jsonb;

-- banners JSON format:
-- [
--   {
--     "id":          "string (unique within array)",
--     "title":       "Δωρεάν delivery",
--     "description": "Για παραγγελίες άνω των €25",
--     "image_url":   "https://…",      (optional)
--     "bg_color":    "#FFF5E4",        (optional, default white)
--     "text_color":  "#1A1A1A",        (optional, default black)
--     "emoji":       "🚴",             (optional, shown when no image)
--     "link_cat_id": "uuid"            (optional, deep-link to category on /menu)
--   }
-- ]

comment on column public.shop_configs.subtitle     is 'Short tagline displayed on cover and menu header';
comment on column public.shop_configs.logo_url     is 'Shop-specific logo URL; falls back to businesses.logo_url';
comment on column public.shop_configs.hero_tagline is 'Optional overlay text on the cover hero image';
comment on column public.shop_configs.banners      is 'JSON array of promotional offer cards for the home screen';
