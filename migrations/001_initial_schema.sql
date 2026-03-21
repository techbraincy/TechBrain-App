-- =============================================================
-- Migration 001: Initial schema
-- Run this in your Supabase SQL editor or via psql.
-- =============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'superadmin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- SESSIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- =============================================================
-- SHEETS
-- Admin-registered Google Sheets entries.
-- spreadsheet_id = the long ID from the Google Sheet URL.
-- range_notation = e.g. 'Sheet1' or 'Sheet1!A1:Z500'
-- cached_data    = last successful API response (JSONB)
-- cache_expires_at = when the cache should be revalidated
-- =============================================================
CREATE TABLE IF NOT EXISTS sheets (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id   TEXT        NOT NULL UNIQUE,
    display_name     TEXT        NOT NULL,
    range_notation   TEXT        NOT NULL DEFAULT 'Sheet1',
    cached_data      JSONB,
    cache_expires_at TIMESTAMPTZ,
    created_by       UUID        NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheets_spreadsheet_id ON sheets (spreadsheet_id);

CREATE TRIGGER sheets_set_updated_at
  BEFORE UPDATE ON sheets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- USER_SHEETS
-- Many-to-many: which users can see which sheets.
-- =============================================================
CREATE TABLE IF NOT EXISTS user_sheets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    sheet_id    UUID        NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID        NOT NULL REFERENCES users(id),
    UNIQUE (user_id, sheet_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sheets_user_id  ON user_sheets (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sheets_sheet_id ON user_sheets (sheet_id);

-- =============================================================
-- EXPIRED SESSION CLEANUP
-- Schedule via Supabase pg_cron:
--   SELECT cron.schedule('cleanup-sessions', '0 3 * * *',
--     $$DELETE FROM sessions WHERE expires_at < now()$$);
-- Or call from /api/cron/cleanup (add to vercel.json crons).
-- =============================================================
CREATE OR REPLACE FUNCTION delete_expired_sessions()
RETURNS void AS $$
  DELETE FROM sessions WHERE expires_at < now();
$$ LANGUAGE SQL;
