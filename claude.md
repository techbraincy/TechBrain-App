# Project Context

This project uses project-level Claude Code skills for a bilingual Greek and English business onboarding and management app.

The product should help business owners:

- enter the required business information
- choose which operational features apply
- configure what the AI phone agent should handle
- generate a production-ready ElevenLabs plus Twilio phone agent
- manage reservations, takeaway, delivery, and live order tracking

# Working Rules

- Use the relevant project skill in `.claude/skills/` before planning or implementing domain-specific work.
- Treat bilingual Greek and English support as a core requirement in UX, data, and voice flows.
- Keep all integrations explicit, environment-driven, and production-safe.
- Prefer multi-tenant, role-aware, auditable patterns for business data and workflows.
- Do not default to generic SaaS UI patterns when better product-specific solutions are possible.
