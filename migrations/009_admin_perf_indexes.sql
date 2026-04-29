-- 009_admin_perf_indexes.sql
-- Admin dashboard performance indexes.
-- All indexes are additive — no table structure or column changes.
-- Safe to run on a live database; CREATE INDEX IF NOT EXISTS is idempotent.

-- Reservations: status filters scoped to a business (e.g. pending count).
CREATE INDEX IF NOT EXISTS idx_reservations_business_status
  ON public.reservations (business_id, status);

-- Reservations: ordered listing by date for a business (admin reservations table).
CREATE INDEX IF NOT EXISTS idx_reservations_business_reserved_at
  ON public.reservations (business_id, reserved_at DESC);

-- Orders: status filters scoped to a business (e.g. awaiting_approval count).
CREATE INDEX IF NOT EXISTS idx_orders_business_status
  ON public.orders (business_id, status);

-- Orders: ordered listing by created_at for a business (admin orders queue).
CREATE INDEX IF NOT EXISTS idx_orders_business_created_at
  ON public.orders (business_id, created_at DESC);
