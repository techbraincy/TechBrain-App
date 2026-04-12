-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Portal Upgrade
-- Run in Supabase SQL Editor AFTER migration 006
-- ─────────────────────────────────────────────────────────────────────────────

-- ── business_customers (lightweight CRM per business) ─────────────────────────
CREATE TABLE IF NOT EXISTS business_customers (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  name                TEXT          NOT NULL,
  phone               TEXT,
  email               TEXT,
  preferred_language  TEXT          NOT NULL DEFAULT 'el',
  notes               TEXT,

  total_orders        INTEGER       NOT NULL DEFAULT 0,
  total_reservations  INTEGER       NOT NULL DEFAULT 0,
  total_spend         NUMERIC(10,2) NOT NULL DEFAULT 0,

  last_seen_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- phone per business is unique (allow nulls = multiple null rows via partial index)
CREATE UNIQUE INDEX IF NOT EXISTS business_customers_biz_phone_idx
  ON business_customers(business_id, phone) WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS business_customers_business_id_idx ON business_customers(business_id);

DROP TRIGGER IF EXISTS update_business_customers_updated_at ON business_customers;
CREATE TRIGGER update_business_customers_updated_at
  BEFORE UPDATE ON business_customers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── order_status_history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES business_orders(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON order_status_history(order_id);

-- ── Alter business_orders ─────────────────────────────────────────────────────
-- Update status constraint to include new workflow states
ALTER TABLE business_orders DROP CONSTRAINT IF EXISTS business_orders_status_check;
ALTER TABLE business_orders ADD CONSTRAINT business_orders_status_check
  CHECK (status IN (
    'pending','accepted','rejected',
    'preparing','ready','out_for_delivery',
    'completed','cancelled'
  ));

-- New columns
ALTER TABLE business_orders
  ADD COLUMN IF NOT EXISTS email               TEXT,
  ADD COLUMN IF NOT EXISTS customer_id         UUID REFERENCES business_customers(id),
  ADD COLUMN IF NOT EXISTS payment_status      TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS staff_notes         TEXT,
  ADD COLUMN IF NOT EXISTS estimated_ready_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ;

-- ── Alter business_reservations ───────────────────────────────────────────────
ALTER TABLE business_reservations DROP CONSTRAINT IF EXISTS business_reservations_status_check;
ALTER TABLE business_reservations ADD CONSTRAINT business_reservations_status_check
  CHECK (status IN ('pending','confirmed','cancelled','completed','no_show'));

ALTER TABLE business_reservations
  ADD COLUMN IF NOT EXISTS email               TEXT,
  ADD COLUMN IF NOT EXISTS customer_id         UUID REFERENCES business_customers(id),
  ADD COLUMN IF NOT EXISTS preferred_language  TEXT NOT NULL DEFAULT 'el',
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS staff_notes         TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ;
