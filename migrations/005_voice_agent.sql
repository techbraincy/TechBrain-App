-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Voice Agent Builder
-- Tables: businesses, elevenlabs_agents
-- ─────────────────────────────────────────────────────────────────────────────

-- ── businesses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Core identity
  business_name            TEXT        NOT NULL,
  phone_number             TEXT,
  business_category        TEXT        NOT NULL DEFAULT 'restaurant',
  address                  TEXT,
  google_maps_link         TEXT,

  -- Operations
  opening_hours            JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "monday": { "open": "09:00", "close": "22:00", "closed": false }, ... }

  languages_supported      TEXT[]      NOT NULL DEFAULT ARRAY['el', 'en'],

  -- Services / menu catalog
  services                 JSONB       NOT NULL DEFAULT '[]',
  -- Format: [{ "id": "uuid", "name": "...", "description": "...", "price": "...", "category": "..." }]

  menu_catalog             JSONB       NOT NULL DEFAULT '[]',
  -- Same structure as services, used for food/drink menus

  -- FAQ
  faq                      JSONB       NOT NULL DEFAULT '[]',
  -- Format: [{ "id": "uuid", "question": "...", "answer": "..." }]

  -- Capabilities
  reservation_enabled      BOOLEAN     NOT NULL DEFAULT false,
  meetings_enabled         BOOLEAN     NOT NULL DEFAULT false,
  delivery_enabled         BOOLEAN     NOT NULL DEFAULT false,
  takeaway_enabled         BOOLEAN     NOT NULL DEFAULT false,

  -- Custom agent instructions
  custom_agent_instructions TEXT,

  -- Escalation rules
  escalation_rules         JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "escalate_on_complaint": true, "human_handoff_number": "+30...", "escalation_triggers": [], "max_failed_attempts": 3 }

  -- Branding & theming
  branding_settings        JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "primary_color": "#8B5CF6", "secondary_color": "#...", "logo_url": null, "accent_color": "#..." }

  theme_settings           JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "font": "inter", "radius": "lg", "dark_mode": false }

  -- Agent voice & greeting
  agent_voice_settings     JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "voice_id": "...", "voice_name": "...", "stability": 0.5, "similarity_boost": 0.75, "speed": 1.0 }

  greeting_settings        JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "greeting_el": "...", "greeting_en": "...", "farewell_el": "...", "farewell_en": "..." }

  -- Workflow settings
  workflow_settings        JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "require_confirmation": true, "booking_lead_time_hours": 1, "max_party_size": 10, "delivery_radius_km": 5, "delivery_fee": "2.00", "min_order_value": "15.00" }

  -- Custom permissions
  custom_permissions       JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "can_book": true, "can_order": true, "can_cancel": false, "allowed_actions": [], "blocked_topics": [] }

  -- Service area
  service_area             TEXT,

  -- Holiday hours / closures
  holiday_hours            JSONB       NOT NULL DEFAULT '[]',
  -- Format: [{ "date": "2024-12-25", "name": "Christmas", "closed": true, "open": null, "close": null }]

  -- Onboarding state
  onboarding_complete      BOOLEAN     NOT NULL DEFAULT false,
  onboarding_step          INTEGER     NOT NULL DEFAULT 1,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS businesses_user_id_idx ON businesses(user_id);
CREATE INDEX IF NOT EXISTS businesses_category_idx ON businesses(business_category);

-- ── elevenlabs_agents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elevenlabs_agents (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  UNIQUE (business_id),

  -- ElevenLabs identifiers
  elevenlabs_agent_id  TEXT,

  -- Agent identity
  agent_name           TEXT        NOT NULL DEFAULT 'Business Assistant',
  voice_id             TEXT,
  voice_name           TEXT,

  -- Generated system prompt (stored for reference/debugging)
  system_prompt        TEXT,

  -- Language / personality settings
  language_settings    JSONB       NOT NULL DEFAULT '{}',
  -- Format: { "primary": "el", "secondary": "en", "auto_detect": true }

  personality          TEXT        NOT NULL DEFAULT 'professional',
  -- Options: professional, friendly, formal, casual, energetic, calm

  tone                 TEXT        NOT NULL DEFAULT 'helpful',
  -- Options: helpful, assertive, empathetic, concise, detailed

  -- What the agent can/cannot do
  capabilities         JSONB       NOT NULL DEFAULT '{}',
  -- Mirrors business capabilities but with per-agent overrides

  -- Status tracking
  status               TEXT        NOT NULL DEFAULT 'pending',
  -- Values: pending | creating | active | error | disabled

  last_synced_at       TIMESTAMPTZ,
  error_message        TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS elevenlabs_agents_business_id_idx ON elevenlabs_agents(business_id);
CREATE INDEX IF NOT EXISTS elevenlabs_agents_status_idx ON elevenlabs_agents(status);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_elevenlabs_agents_updated_at ON elevenlabs_agents;
CREATE TRIGGER update_elevenlabs_agents_updated_at
  BEFORE UPDATE ON elevenlabs_agents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
