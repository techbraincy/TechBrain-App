-- 010_archive_columns.sql
-- Adds soft-archive support to reservations and orders.
-- Records are never deleted; archived_at = NULL means active (visible by default).

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by  uuid        DEFAULT NULL REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by  uuid        DEFAULT NULL REFERENCES auth.users (id) ON DELETE SET NULL;

-- Partial indexes: fast lookup for the common case (unarchived rows).
CREATE INDEX IF NOT EXISTS idx_reservations_active
  ON public.reservations (business_id, reserved_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_active
  ON public.orders (business_id, created_at DESC)
  WHERE archived_at IS NULL;
