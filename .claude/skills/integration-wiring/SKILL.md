---
description: Integration setup guidance for Supabase, Vercel, GitHub, ElevenLabs, and Twilio. Use when defining environment variables, deployment wiring, webhook setup, secret handling, callback URLs, or service-to-service responsibilities.
---

# Integration Wiring

Use this skill to connect the product's services cleanly and safely.

## Priorities

- Keep every integration environment-driven and easy to rotate.
- Separate local, preview, and production configuration clearly.
- Define which system owns each secret, webhook, and callback.
- Make deployment and debugging straightforward across GitHub, Vercel, Supabase, Twilio, and ElevenLabs.

## Workflow

1. List every external integration and the exact data exchanged.
2. Define required environment variables, secret scope, and where each value is configured.
3. Map inbound and outbound webhooks, callback URLs, and signature validation.
4. Document deployment prerequisites, preview-environment behavior, and rollback needs.
5. Verify naming, consistency, and least-privilege access before implementation.

## Guardrails

- Never hardcode secrets, phone numbers, tokens, or project identifiers.
- Prefer explicit setup checklists over tribal knowledge.
- Keep server-only credentials out of client bundles.
- Plan for secret rotation, rate limits, and provider outages.

## Deliverables

- Environment variable matrix by service and environment.
- Integration checklist with setup order and ownership.
- Webhook and callback map.
- Failure modes, recovery notes, and deployment caveats.
