---
description: Supabase architecture guidance for this multi-tenant business platform. Use when designing schema, auth, RLS, roles, realtime behavior, storage, or migration strategy for businesses, staff, orders, reservations, and AI agent configuration.
---

# Supabase Architect

Use this skill to shape a safe, auditable, multi-tenant Supabase foundation for the product.

## Priorities

- Model businesses as isolated tenants with clear ownership boundaries.
- Support owner, manager, staff, and system roles with least-privilege access.
- Keep reservations, orders, deliveries, agent settings, and audit data consistent.
- Design realtime behavior for status updates and live tracking without leaking cross-tenant data.

## Workflow

1. Define the business entities, relationships, and lifecycle states.
2. Choose where feature flags and business-specific capabilities live.
3. Design auth and RLS together so permissions match the product workflow.
4. Plan migrations, seed data, generated types, and operational observability.
5. Document which updates are realtime, webhook-driven, or back-office only.

## Guardrails

- Default to tenant-safe tables, policies, and indexes.
- Keep sensitive credentials and telephony settings out of client-readable paths.
- Prefer auditable state transitions over hidden side effects.
- Make approval, reassignment, and manual override paths explicit.

## Deliverables

- Entity list with relationships and ownership rules.
- Role and RLS summary for every sensitive table or view.
- Realtime and webhook boundary notes.
- Assumptions, migration plan, and open risks before implementation.
