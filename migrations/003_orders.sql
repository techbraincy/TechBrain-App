-- ORDERS (created by phone calls via ElevenLabs + Twilio + n8n)
CREATE TABLE orders (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coffee_type      TEXT        NOT NULL,
    delivery_address TEXT        NOT NULL,
    caller_phone     TEXT        NOT NULL DEFAULT '',
    status           TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'done')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status     ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);
