-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Business Portal — per-business orders & reservations
-- ─────────────────────────────────────────────────────────────────────────────

-- ── business_orders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_orders (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  customer_name         TEXT        NOT NULL,
  customer_phone        TEXT,
  order_type            TEXT        NOT NULL DEFAULT 'takeaway'
                                    CHECK (order_type IN ('delivery', 'takeaway')),
  items                 JSONB       NOT NULL DEFAULT '[]',
  -- Format: [{ "id": "uuid", "name": "...", "price": "...", "quantity": 1, "notes": "..." }]
  items_summary         TEXT,
  delivery_address      TEXT,
  special_instructions  TEXT,
  total_amount          TEXT,

  status                TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_orders_business_id_idx ON business_orders(business_id);
CREATE INDEX IF NOT EXISTS business_orders_status_idx      ON business_orders(status);
CREATE INDEX IF NOT EXISTS business_orders_created_at_idx  ON business_orders(created_at DESC);

DROP TRIGGER IF EXISTS update_business_orders_updated_at ON business_orders;
CREATE TRIGGER update_business_orders_updated_at
  BEFORE UPDATE ON business_orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── business_reservations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_reservations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  customer_name     TEXT        NOT NULL,
  customer_phone    TEXT,
  reservation_date  DATE        NOT NULL,
  reservation_time  TIME        NOT NULL,
  party_size        INTEGER     NOT NULL DEFAULT 2,
  notes             TEXT,

  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_reservations_business_id_idx ON business_reservations(business_id);
CREATE INDEX IF NOT EXISTS business_reservations_date_idx        ON business_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS business_reservations_status_idx      ON business_reservations(status);

DROP TRIGGER IF EXISTS update_business_reservations_updated_at ON business_reservations;
CREATE TRIGGER update_business_reservations_updated_at
  BEFORE UPDATE ON business_reservations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
