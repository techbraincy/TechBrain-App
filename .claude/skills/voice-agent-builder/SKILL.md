---
description: ElevenLabs and Twilio voice-agent guidance for the bilingual Greek/English phone experience. Use when defining call flows, language behavior, prompts, webhooks, escalation logic, or business-configurable AI phone responsibilities.
---

# Voice Agent Builder

Use this skill to design a reliable bilingual phone agent that represents each business well.

## Priorities

- Support Greek and English naturally, with safe switching and confirmation behavior.
- Let each business decide what the AI can handle versus what requires staff approval.
- Cover reservations, takeaway, delivery, FAQs, hours, and handoff paths.
- Favor dependable call outcomes over clever but fragile behavior.

## Workflow

1. Define the agent's supported intents, feature flags, and hard limits.
2. Map the call flow from greeting to completion, escalation, or fallback.
3. Specify language detection, user preference capture, and bilingual confirmations.
4. Design webhook events, state storage, and Twilio plus ElevenLabs responsibilities.
5. Include failure handling for low confidence, missing data, after-hours, and human handoff.

## Guardrails

- Never assume English-only callers, names, addresses, or business rules.
- Confirm critical details such as reservation time, party size, phone number, address, and order contents.
- Separate informational answers from actions that create or modify business records.
- Provide deterministic fallback behavior whenever the AI is unsure.

## Deliverables

- Intent map and call-state flow.
- Prompt and policy notes for Greek and English behavior.
- Escalation rules, webhook boundaries, and failure cases.
- Test scenarios for bilingual edge cases and partial-call recovery.
