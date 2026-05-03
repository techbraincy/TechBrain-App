-- ============================================================
-- 012 Idempotency: request_idempotency table
-- Stores per-business idempotency keys to deduplicate retried
-- order submissions from ElevenLabs agents and portal clients.
-- ============================================================

create table if not exists public.request_idempotency (
  idempotency_key  text        not null,
  business_id      uuid        not null references public.businesses(id) on delete cascade,
  endpoint         text        not null,
  response         jsonb       not null,
  created_at       timestamptz not null default now(),
  primary key (business_id, idempotency_key)
);

-- Index for TTL cleanup queries (delete rows older than 24 h)
create index if not exists request_idempotency_created
  on public.request_idempotency (created_at);
