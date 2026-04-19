---
description: Release-readiness and bug-fixing guidance for this product. Use when reproducing issues, tracing failures, validating critical flows, hardening integrations, or preparing the business onboarding, voice-agent, ordering, and tracking experience for deployment.
---

# Debug and Ship

Use this skill when the product is close to release and needs disciplined debugging plus deployment readiness checks.

## Priorities

- Reproduce problems reliably before changing code.
- Protect the core business flows: onboarding, configuration, phone handling, reservations, orders, delivery, and tracking.
- Prefer minimal, well-understood fixes over risky rewrites.
- Leave a clear record of what was validated and what still needs attention.

## Workflow

1. Reproduce the issue and capture the exact failing path.
2. Isolate root cause across UI, backend, database, and integrations.
3. Apply the smallest safe fix that addresses the verified cause.
4. Re-test the direct issue and the adjacent critical flows.
5. Prepare deployment notes, rollback considerations, and post-release watchpoints.

## Guardrails

- Do not guess at root cause when logs, traces, or repro steps are missing.
- Check bilingual and feature-flagged paths, not only the default flow.
- Validate integration behavior after fixes that touch webhooks, auth, or state transitions.
- Call out residual risk explicitly if time or tooling prevents full validation.

## Deliverables

- Reproduction summary and root-cause statement.
- Fix summary with affected flows.
- Validation results and remaining risks.
- Deployment readiness notes and follow-up monitoring checks.
