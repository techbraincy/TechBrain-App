-- ============================================================
-- 004 Live tracking: add driver location columns to orders
-- Run this in Supabase SQL editor
-- ============================================================

alter table public.orders
  add column if not exists driver_lat         double precision,
  add column if not exists driver_lng         double precision,
  add column if not exists driver_updated_at  timestamptz;

-- Enable realtime publication for these new columns
-- (orders table should already be in the realtime publication;
--  this is a no-op if it already exists)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
