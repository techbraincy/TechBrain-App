---
description: Product and workflow guidance for reservations, takeaway, delivery, staff approval, and live order tracking. Use when designing business-selectable service flows, statuses, notifications, or customer and staff handoffs.
---

# Order Flow Designer

Use this skill to define the operational flows that the business can enable and manage.

## Priorities

- Model reservations, takeaway, and delivery as configurable capabilities per business.
- Keep customer, AI agent, and staff responsibilities clear at every step.
- Make approvals, ETA changes, and live tracking trustworthy and easy to understand.
- Design for operational exceptions, not only the happy path.

## Workflow

1. Identify which features are optional and how the business enables them.
2. Define statuses, transitions, and who is allowed to trigger each change.
3. Map notifications, confirmations, approvals, and customer-visible tracking events.
4. Decide how reservations, orders, and delivery updates intersect with the phone agent.
5. Validate edge cases such as closures, delays, out-of-range delivery, and manual overrides.

## Guardrails

- Do not collapse distinct workflows into one vague status model.
- Preserve an audit trail for approvals, rejections, edits, cancellations, and refunds.
- Keep staff actions fast on mobile.
- Make customer-facing timing and fulfillment promises conservative and explicit.

## Deliverables

- Flow diagram or narrative for each enabled capability.
- Status model with actor permissions and trigger points.
- Tracking and notification plan.
- Edge cases, fallback behavior, and unresolved operational questions.
