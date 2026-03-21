-- =============================================================
-- Migration 002: Audit log
-- Records all admin-initiated mutations for accountability.
-- =============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,  -- e.g. 'create_user', 'delete_user', 'assign_sheet'
    target_type TEXT,                  -- 'user' | 'sheet' | 'assignment'
    target_id   UUID,
    metadata    JSONB,                 -- arbitrary extra context
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor   ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON audit_log (action);

-- =============================================================
-- Seed: Insert the first superadmin
-- Replace 'your_username' and 'your_hashed_password'.
-- Generate a bcrypt hash (cost 12) with:
--   node -e "const b=require('bcryptjs'); b.hash('YourPassword123!',12).then(console.log)"
-- =============================================================
-- INSERT INTO users (username, password_hash, role)
-- VALUES ('admin', '$2b$12$REPLACE_WITH_ACTUAL_HASH', 'superadmin');
