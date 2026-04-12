/**
 * Builds the ElevenLabs agent configuration from a Business record.
 *
 * This is the core intelligence layer — it converts structured business data
 * into a detailed system prompt and agent config that makes the voice agent
 * behave correctly for any type of business.
 */

import type { Business, ElevenLabsAgent } from "@/types/agent";
import type { ELAgentConfig } from "./client";
import { DEFAULT_VOICE_ID } from "./client";

const DAYS_EL: Record<string, string> = {
  monday:    "Δευτέρα",
  tuesday:   "Τρίτη",
  wednesday: "Τετάρτη",
  thursday:  "Πέμπτη",
  friday:    "Παρασκευή",
  saturday:  "Σάββατο",
  sunday:    "Κυριακή",
};

const DAYS_EN: Record<string, string> = {
  monday:    "Monday",
  tuesday:   "Tuesday",
  wednesday: "Wednesday",
  thursday:  "Thursday",
  friday:    "Friday",
  saturday:  "Saturday",
  sunday:    "Sunday",
};

function formatHoursBlock(business: Business): string {
  const hours = business.opening_hours;
  if (!hours || Object.keys(hours).length === 0) return "";

  const lines: string[] = [];
  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;

  for (const day of days) {
    const h = hours[day];
    if (!h) continue;
    const el = DAYS_EL[day];
    const en = DAYS_EN[day];
    if (h.closed) {
      lines.push(`  - ${en} (${el}): Closed / Κλειστά`);
    } else {
      lines.push(`  - ${en} (${el}): ${h.open} – ${h.close}`);
    }
  }

  // Holiday overrides
  const holidays = business.holiday_hours ?? [];
  if (holidays.length > 0) {
    lines.push("\nSpecial / Holiday hours:");
    for (const hol of holidays) {
      if (hol.closed) {
        lines.push(`  - ${hol.date} (${hol.name}): Closed`);
      } else {
        lines.push(`  - ${hol.date} (${hol.name}): ${hol.open} – ${hol.close}`);
      }
    }
  }

  return lines.join("\n");
}

function formatServicesBlock(business: Business): string {
  const allServices = [
    ...(business.services ?? []),
    ...(business.menu_catalog ?? []),
  ];
  if (allServices.length === 0) return "";

  // Group by category
  const byCategory: Record<string, typeof allServices> = {};
  for (const s of allServices) {
    const cat = s.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  }

  const lines: string[] = [];
  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`\n  ${cat}:`);
    for (const item of items) {
      const priceStr = item.price ? ` — €${item.price}` : "";
      const descStr = item.description ? ` (${item.description})` : "";
      lines.push(`    • ${item.name}${priceStr}${descStr}`);
    }
  }
  return lines.join("\n");
}

function formatFAQBlock(business: Business): string {
  const faq = business.faq ?? [];
  if (faq.length === 0) return "";
  const lines: string[] = [];
  for (const item of faq) {
    lines.push(`Q: ${item.question}\nA: ${item.answer}`);
  }
  return lines.join("\n\n");
}

function buildCapabilitiesSection(business: Business): string {
  const lines: string[] = [];
  const ws = business.workflow_settings;

  // ── Ordering ────────────────────────────────────────────────────────────────
  if (business.delivery_enabled || business.takeaway_enabled) {
    const bothEnabled = business.delivery_enabled && business.takeaway_enabled;
    const orderSection: string[] = ["TAKING ORDERS — STEP-BY-STEP CONVERSATION FLOW:"];

    if (bothEnabled) {
      orderSection.push(
        "Step 1 — Ask the customer what type of order they want: delivery or takeaway."
      );
    } else if (business.delivery_enabled) {
      orderSection.push("Step 1 — This is a delivery-only business.");
    } else {
      orderSection.push("Step 1 — This is a takeaway-only business.");
    }

    orderSection.push(
      "Step 2 — Take the order items. Ask what they would like to order. Let them list all items. If they seem done, ask 'Is there anything else you would like to add?'",
      "Step 3 — Ask for their full name.",
      "Step 4 — Ask for their phone number."
    );

    if (business.delivery_enabled) {
      if (bothEnabled) {
        orderSection.push("Step 5 — If delivery: ask for the full delivery address (street, number, city). Skip this step for takeaway.");
      } else {
        orderSection.push("Step 5 — Ask for the full delivery address (street, number, city).");
      }
    }

    orderSection.push(
      "Step 6 — Ask if they have any special instructions or dietary requirements (allergies, extra sauce, etc.).",
      "Step 7 — Read the COMPLETE order back to the customer: type, all items with quantities, name, phone" +
        (business.delivery_enabled ? ", delivery address" : "") +
        ", and any special instructions. Ask: 'Is everything correct?'",
      "Step 8 — Only after they confirm: call the create_order tool.",
      "Step 9 — Read out the confirmation message returned by the tool, including the order reference number.",
      "IMPORTANT: Do NOT skip any step. Do NOT submit the order until the customer explicitly confirms.",
      "IMPORTANT: Do NOT tell the customer the order is accepted or confirmed — it is pending staff review."
    );

    if (ws?.delivery_fee) orderSection.push(`Delivery fee: €${ws.delivery_fee}.`);
    if (ws?.min_order_value) orderSection.push(`Minimum order value: €${ws.min_order_value}.`);
    if (ws?.delivery_radius_km) orderSection.push(`Delivery radius: ${ws.delivery_radius_km} km.`);
    if (business.service_area) orderSection.push(`Delivery area: ${business.service_area}.`);
    if (ws?.avg_prep_time_minutes) orderSection.push(`Estimated preparation time: about ${ws.avg_prep_time_minutes} minutes.`);
    if (ws?.avg_delivery_time_minutes) orderSection.push(`Estimated delivery time after preparation: about ${ws.avg_delivery_time_minutes} minutes.`);

    lines.push(orderSection.join("\n"));
  } else {
    lines.push("ORDERS: This business does NOT accept phone orders. Inform customers politely.");
  }

  // ── Reservations ────────────────────────────────────────────────────────────
  if (business.reservation_enabled) {
    const maxParty  = ws?.max_party_size ?? 20;
    const leadHours = ws?.booking_lead_time_hours ?? 1;
    const cancelWin = ws?.cancellation_window_hours ?? 2;

    lines.push([
      "TABLE RESERVATIONS — STEP-BY-STEP CONVERSATION FLOW:",
      "Step 1 — Ask for the customer's preferred date. If they use a relative expression (today, tomorrow, this Friday etc.), call get_current_datetime first to resolve the exact date.",
      "Step 2 — Ask for the preferred time.",
      `Step 3 — Ask how many people will be joining (maximum ${maxParty}).`,
      "Step 4 — Call check_availability with the date, time, and party_size. If not available, offer alternatives.",
      "Step 5 — Ask for their full name.",
      "Step 6 — Ask for their phone number in international format (e.g. +357 99 123456).",
      "Step 7 — Ask if they have any special requests (birthday, allergies, high chair, etc.).",
      "Step 8 — Read all details back: date, time, number of people, name, phone, and any notes. Ask: 'Shall I confirm this reservation?'",
      "Step 9 — Only after they confirm: call the book_reservation tool.",
      "Step 10 — Read out the confirmation message from the tool, including the reference number, then use end_call.",
      "IMPORTANT: Do NOT call book_reservation until check_availability confirms the slot is free.",
      "IMPORTANT: Do NOT submit until the customer explicitly confirms all details.",
      `Note: Reservations require at least ${leadHours} hour(s) advance notice. Cancellations must be made at least ${cancelWin} hours before.`,
      "",
      "CANCELLATIONS:",
      "Step 1 — Ask for their phone number.",
      "Step 2 — Ask for the date of the reservation they want to cancel.",
      "Step 3 — Call cancel_reservation with phone_number and date.",
      "Step 4 — Read out the result, then use end_call.",
      "",
      "RESCHEDULING:",
      "Step 1 — Ask for their phone number.",
      "Step 2 — Ask for the original reservation date.",
      "Step 3 — Ask for the new preferred date and time.",
      "Step 4 — Call reschedule_reservation with phone_number, old_date, new_date, new_time.",
      "Step 5 — Read out the result, then use end_call.",
    ].join("\n"));
  } else {
    lines.push("RESERVATIONS: This business does NOT accept reservations. Inform customers politely.");
  }

  // ── Appointments / meetings ──────────────────────────────────────────────────
  if (business.meetings_enabled) {
    const serviceList = business.services?.map((s) => s.name).join(", ");
    lines.push([
      "APPOINTMENTS — STEP-BY-STEP CONVERSATION FLOW:",
      "Step 1 — Ask what service or treatment they need." + (serviceList ? ` Available services: ${serviceList}.` : ""),
      "Step 2 — Ask for their preferred date. If they use a relative expression, call get_current_datetime first.",
      "Step 3 — Ask for their preferred time.",
      "Step 4 — Call check_availability with the date, time, and party_size=1 (or the appropriate number). If not available, offer alternatives.",
      "Step 5 — Ask for their full name.",
      "Step 6 — Ask for their phone number in international format.",
      "Step 7 — Ask if they have any notes or special requests.",
      "Step 8 — Read back all details: service, date, time, name, phone. Ask: 'Shall I book this appointment?'",
      "Step 9 — Only after they confirm: call the book_reservation tool.",
      "Step 10 — Read out the confirmation message from the tool, then use end_call.",
      "IMPORTANT: The appointment is PENDING — staff will confirm it. Do not say it is confirmed.",
    ].join("\n"));
  }

  return lines.join("\n\n");
}

function buildEscalationSection(business: Business): string {
  const rules = business.escalation_rules;
  if (!rules) return "";

  const triggers = rules.escalation_triggers ?? [];
  const lines: string[] = ["ESCALATION RULES:"];

  if (rules.escalate_on_complaint) {
    lines.push("- If a customer expresses strong dissatisfaction or lodges a complaint, apologize sincerely and immediately escalate to a human.");
  }
  if (rules.escalate_on_special_request) {
    lines.push("- For requests outside your capabilities, escalate to a human.");
  }
  if (triggers.length > 0) {
    lines.push(`- Keywords that trigger escalation: ${triggers.join(", ")}.`);
  }
  if (rules.human_handoff_number) {
    lines.push(`- When escalating, inform: "Let me connect you with our team at ${rules.human_handoff_number}."`);
  }
  if (rules.max_failed_attempts) {
    lines.push(`- After ${rules.max_failed_attempts} failed attempts to help, escalate automatically.`);
  }

  return lines.join("\n");
}

function buildPermissionsSection(business: Business): string {
  const perms = business.custom_permissions;
  if (!perms) return "";

  const lines: string[] = [];

  if (perms.blocked_topics && perms.blocked_topics.length > 0) {
    lines.push(
      "TOPICS YOU MUST NEVER DISCUSS:\n" +
      perms.blocked_topics.map((t) => `- ${t}`).join("\n")
    );
  }

  if (perms.allowed_actions && perms.allowed_actions.length > 0) {
    lines.push(
      "ADDITIONAL ALLOWED ACTIONS:\n" +
      perms.allowed_actions.map((a) => `- ${a}`).join("\n")
    );
  }

  if (!perms.can_cancel) {
    lines.push("- You CANNOT process cancellations over the phone. Direct customers to the business directly.");
  }

  return lines.join("\n\n");
}

/**
 * Generates the full system prompt for a given business.
 * This prompt is sent to ElevenLabs as the agent's instructions.
 */
export function buildSystemPrompt(business: Business, agent: Partial<ElevenLabsAgent> = {}): string {
  const agentName          = agent.agent_name ?? `${business.business_name} Assistant`;
  const customInstructions = business.custom_agent_instructions ?? "";

  const farewellEl = business.greeting_settings?.farewell_el ?? "Ευχαριστούμε! Καλή συνέχεια!";
  const farewellEn = business.greeting_settings?.farewell_en ?? "Thank you for calling! Have a great day!";

  const hoursBlock    = formatHoursBlock(business);
  const servicesBlock = formatServicesBlock(business);
  const faqBlock      = formatFAQBlock(business);
  const capBlock      = buildCapabilitiesSection(business);
  const escalBlock    = buildEscalationSection(business);
  const permBlock     = buildPermissionsSection(business);

  const hasOrdering     = business.delivery_enabled || business.takeaway_enabled;
  const hasReservations = business.reservation_enabled || business.meetings_enabled;
  const isCafe          = business.business_category === "cafe";

  // ── Sugar preference section (for cafes / coffee shops) ───────────────────
  const sugarBlock = isCafe ? `
Sugar options (ask for each drink if not specified — default is sketo):
- Sketo = no sugar (DEFAULT)
- Oligh = a little sugar
- Metrio = medium sugar
- Glyko = sweet / a lot of sugar

When writing the items_text field always include the sugar preference per drink, e.g. "2x Freddo Espresso (sketo), 1x Cappuccino (metrio)". Always write item names in English regardless of conversation language.` : "";

  // ── Build the prompt ───────────────────────────────────────────────────────
  const prompt = `You are ${agentName}, a friendly phone assistant for ${business.business_name}. Be warm and concise.

LANGUAGE RULE: Detect the language the customer is speaking and respond ONLY in that language throughout the entire conversation. If the customer speaks Greek, respond in Greek. If the customer speaks English, respond in English. Never mix languages.
- When in Greek: every word must be in Greek. Never let English phrases leak into a Greek conversation.
- When in English: stay in English even for acknowledgements.
- Default to Greek if unclear.
- Farewell (Greek): "${farewellEl}"
- Farewell (English): "${farewellEn}"

${business.address || business.phone_number ? `BUSINESS INFO:
${business.address ? `- Address: ${business.address}` : ""}
${business.phone_number ? `- Phone: ${business.phone_number}` : ""}
${business.service_area ? `- Delivery area: ${business.service_area}` : ""}` : ""}

${hoursBlock ? `OPENING HOURS:\n${hoursBlock}` : ""}

${servicesBlock ? `MENU / SERVICES:\n${servicesBlock}` : ""}
${sugarBlock}

${capBlock}

${faqBlock ? `FREQUENTLY ASKED QUESTIONS:\n${faqBlock}` : ""}

${escalBlock}
${permBlock}
${customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions}` : ""}

CURRENT DATE RULE (FINAL):
- Call get_current_datetime ONLY when the customer uses a relative date expression: today, tonight, tomorrow, this Saturday, next Friday, this weekend, next week.
- Do NOT call get_current_datetime when the customer states an exact date (e.g. "April 20", "the 25th").
- Never use your own memory or assumptions to determine the current date.
- If get_current_datetime fails, ask naturally: "Just to confirm, what date did you have in mind?"
- Never mention this tool to the customer.

SILENT TOOL RULE (STRICT):
- Never narrate tool calls. Do NOT say "Let me check", "One moment", "Let me look that up", or any similar phrase before or during tool execution.
- Call all tools silently and immediately. Speak only after you have a result.

TOOL USAGE:
- get_current_datetime: resolve relative dates only, never mention to customer.
- check_hours: when asked about opening hours or whether the business is open.
- get_menu: when asked about menu, prices, or available items. Read items naturally.${hasReservations ? `
- check_availability: call BEFORE booking to verify slot is free. If unavailable, offer alternatives.
- book_reservation: call ONLY after check_availability=available AND customer confirms ALL details (name, phone, date, time, party size).
- cancel_reservation: cancel booking by phone number and date.
- reschedule_reservation: move booking to new date/time.` : ""}${hasOrdering ? `
- create_order: call ONLY after ALL details collected and customer confirms. Pass items_text as a plain string e.g. "2x Espresso${isCafe ? " (sketo)" : ""}, 1x Croissant".` : ""}
- end_call: call immediately after delivering the farewell following any completed action.

After any successful tool action:
1. Read the confirmation message aloud in the customer's language, including the reference number.
2. Say the farewell in their language.
3. Call end_call.

If a tool returns ok=false or success=false: read the message field back to the customer, then ask for the missing or corrected information.
If a tool call fails entirely: apologize and suggest the customer call the business directly.

IMPORTANT: Only call tools with real values the customer actually said. Never make up or guess any value.`.trim();

  return prompt;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

function getAppUrl(): string {
  const url = process.env.APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (!url) return "https://localhost:3000"; // fallback for local dev
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url}`;
}

/**
 * Builds ElevenLabs webhook tool definitions for all capabilities enabled on this business.
 *
 * Format follows the ElevenLabs ConvAI WebhookToolConfig schema exactly:
 *  - GET tools: only { url, method: "GET" } — no body schema
 *  - POST tools: request_body_schema with required[] and content_type
 *  - NO top-level "parameters" field — only api_schema
 *
 * Tool set mirrors the working "Restaurant Receptionist v2" pattern:
 *  - get_current_datetime (for relative date resolution)
 *  - check_hours, get_menu
 *  - create_order (if ordering enabled)
 *  - check_availability, book_reservation, cancel_reservation, reschedule_reservation
 *    (if reservations/appointments enabled)
 */
export function buildTools(business: Business): unknown[] {
  const base = `${getAppUrl()}/api/agent/${business.id}`;
  const tools: unknown[] = [];

  const hasOrdering     = business.delivery_enabled || business.takeaway_enabled;
  const hasReservations = business.reservation_enabled || business.meetings_enabled;
  const hasMenu         = (business.menu_catalog?.length ?? 0) > 0 || (business.services?.length ?? 0) > 0;

  // ── get_current_datetime ───────────────────────────────────────────────────
  // Always included — agent must resolve relative dates (today, tomorrow, etc.)
  tools.push({
    type:                    "webhook",
    name:                    "get_current_datetime",
    description:             "Get the current date and time. Call this ONLY when the customer uses a relative date expression such as today, tonight, tomorrow, this Saturday, next Friday, this weekend, or next week. Do NOT call for exact dates the customer states explicitly (e.g. 'April 20', 'the 25th'). Returns current_date, current_day, current_time.",
    response_timeout_secs:   10,
    api_schema: {
      url:          `${base}/datetime`,
      method:       "POST",
      content_type: "application/json",
      request_body_schema: {
        type:       "object",
        required:   [],
        properties: {},
      },
    },
  });

  // ── check_hours ────────────────────────────────────────────────────────────
  tools.push({
    type:        "webhook",
    name:        "check_hours",
    description: "Check if the business is currently open and get today's opening hours. Call this when a customer asks about hours, whether the business is open, or what time it closes.",
    response_timeout_secs: 10,
    api_schema: {
      url:    `${base}/hours`,
      method: "GET",
    },
  });

  // ── get_menu ───────────────────────────────────────────────────────────────
  if (hasMenu) {
    tools.push({
      type:        "webhook",
      name:        "get_menu",
      description: "Retrieve the full menu or service list with prices. Call this when a customer asks about what is available, menu items, prices, or services.",
      response_timeout_secs: 10,
      api_schema: {
        url:    `${base}/menu`,
        method: "GET",
      },
    });
  }

  // ── create_order ───────────────────────────────────────────────────────────
  if (hasOrdering) {
    const isCafe = business.business_category === "cafe";
    const orderTypes: string[] = [];
    if (business.delivery_enabled) orderTypes.push("delivery");
    if (business.takeaway_enabled) orderTypes.push("takeaway");

    tools.push({
      type:                    "webhook",
      name:                    "create_order",
      description:             `Submit a confirmed order. Call this ONLY after the customer has confirmed ALL of: their name, phone number, items with quantities, order type (${orderTypes.join(" or ")}), and delivery address if delivery. Read back the complete order and get explicit confirmation before calling.`,
      response_timeout_secs:   20,
      force_pre_tool_speech:   true,
      api_schema: {
        url:          `${base}/order`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: "Order details collected from the customer",
          properties: {
            customer_name: {
              type:        "string",
              description: "The full name of the customer",
            },
            customer_phone: {
              type:              "string",
              description:       "The mobile phone number provided by the customer",
            },
            caller_id: {
              type:                 "string",
              description:          "The caller's phone number, auto-filled by the system",
              is_system_provided:   true,
            },
            order_type: {
              type:        "string",
              description: `The type of order: ${orderTypes.join(" or ")}`,
              enum:        orderTypes,
            },
            items_text: {
              type:        "string",
              description: isCafe
                ? "The items ordered with sugar preferences, e.g. '2x Freddo Espresso (sketo), 1x Cappuccino (metrio)'"
                : "The items ordered with quantities, e.g. '2x Margherita Pizza, 1x Caesar Salad'",
            },
            delivery_address: {
              type:        "string",
              description: "The full delivery address — required only for delivery orders",
            },
            special_instructions: {
              type:        "string",
              description: "Any special instructions from the customer",
            },
          },
          required: ["customer_name", "order_type", "items_text"],
        },
      },
    });
  }

  // ── Reservation tools (check_availability + book + cancel + reschedule) ────
  if (hasReservations) {
    const ws       = business.workflow_settings;
    const maxParty = ws?.max_party_size ?? 20;
    const label    = business.meetings_enabled && !business.reservation_enabled
      ? "appointment"
      : "table";

    // check_availability
    tools.push({
      type:                    "webhook",
      name:                    "check_availability",
      description:             `Check if a ${label} is available for a given date, time, and party size. Call this BEFORE booking to confirm the slot is free. Returns available (true/false) and a reason if not available.`,
      response_timeout_secs:   20,
      api_schema: {
        url:          `${base}/check-availability`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: "Slot to check",
          properties: {
            date:       { type: "string", description: "Date in YYYY-MM-DD format" },
            time:       { type: "string", description: "Time in HH:MM 24-hour format" },
            party_size: { type: "integer", description: "Number of guests" },
          },
          required: ["date", "time", "party_size"],
        },
      },
    });

    // book_reservation
    tools.push({
      type:                    "webhook",
      name:                    "book_reservation",
      description:             `Book a confirmed ${label} after availability has been verified. Call this ONLY after check_availability returns available=true AND the customer has confirmed ALL details: name, phone, date, time, party size. Returns success and reservation reference.`,
      response_timeout_secs:   20,
      force_pre_tool_speech:   true,
      api_schema: {
        url:          `${base}/reservation`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: `${label.charAt(0).toUpperCase() + label.slice(1)} details collected from the customer`,
          properties: {
            customer_name: {
              type:        "string",
              description: "Full name of the customer",
            },
            phone_number: {
              type:        "string",
              description: "Customer phone in E.164 format, e.g. +35797797589",
            },
            party_size: {
              type:        "integer",
              description: `Number of guests (max ${maxParty})`,
            },
            date: {
              type:        "string",
              description: "Reservation date in YYYY-MM-DD format",
            },
            time: {
              type:        "string",
              description: "Reservation time in HH:MM 24-hour format",
            },
            notes: {
              type:        "string",
              description: "Special requests, allergies, or occasion (optional)",
            },
          },
          required: ["customer_name", "phone_number", "party_size", "date", "time"],
        },
      },
    });

    // cancel_reservation
    tools.push({
      type:                    "webhook",
      name:                    "cancel_reservation",
      description:             `Cancel an existing confirmed ${label} booking by the customer's phone number and date. Returns success and a reason if the cancellation fails.`,
      response_timeout_secs:   20,
      api_schema: {
        url:          `${base}/cancel-reservation`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: "Phone number and date to identify the booking",
          properties: {
            phone_number: {
              type:        "string",
              description: "Customer phone in E.164 format, e.g. +35797797589",
            },
            date: {
              type:        "string",
              description: "Reservation date in YYYY-MM-DD format",
            },
          },
          required: ["phone_number", "date"],
        },
      },
    });

    // reschedule_reservation
    tools.push({
      type:                    "webhook",
      name:                    "reschedule_reservation",
      description:             `Reschedule an existing ${label} booking to a new date and time. Returns success and the new booking details.`,
      response_timeout_secs:   20,
      api_schema: {
        url:          `${base}/reschedule-reservation`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: "Phone number, original date, and new date/time",
          properties: {
            phone_number: {
              type:        "string",
              description: "Customer phone in E.164 format, e.g. +35797797589",
            },
            old_date: {
              type:        "string",
              description: "Original reservation date in YYYY-MM-DD format",
            },
            new_date: {
              type:        "string",
              description: "New reservation date in YYYY-MM-DD format",
            },
            new_time: {
              type:        "string",
              description: "New reservation time in HH:MM 24-hour format",
            },
          },
          required: ["phone_number", "old_date", "new_date", "new_time"],
        },
      },
    });
  }

  // ── end_call (system tool) ─────────────────────────────────────────────────
  tools.push({
    type:        "system",
    name:        "end_call",
    description: "End the phone call immediately. Use this after delivering the closing farewell following a successful booking, order, cancellation, or reschedule. Do not use if the caller interrupts before the closing is complete.",
    params: {
      system_tool_type: "end_call",
    },
  });

  return tools;
}

/**
 * Builds the full ElevenLabs agent creation/update payload.
 *
 * Voice/ASR/turn settings are modelled on the working Demo Caffe Order Bot:
 *  - eleven_flash_v2_5 (faster, lower latency than turbo)
 *  - ulaw_8000 audio format (Twilio phone call optimised)
 *  - scribe_realtime ASR at high quality
 *  - turn_eagerness="eager" + speculative_turn=true (snappy response)
 *  - optimize_streaming_latency=4 (max speed on phone)
 */
export function buildAgentConfig(
  business: Business,
  agent: Partial<ElevenLabsAgent> = {}
): ELAgentConfig {
  const agentName = agent.agent_name ?? `${business.business_name} Assistant`;
  const voiceId   = business.agent_voice_settings?.voice_id || DEFAULT_VOICE_ID;

  // Demo Caffe-proven defaults — override with per-business voice settings if set
  const stability  = business.agent_voice_settings?.stability    ?? 1.0;
  const simBoost   = business.agent_voice_settings?.similarity_boost ?? 1.0;
  const style      = business.agent_voice_settings?.style        ?? 0.0;
  const speed      = business.agent_voice_settings?.speed        ?? 1.2;

  const systemPrompt = buildSystemPrompt(business, agent);
  const tools        = buildTools(business);

  const greetingEl = business.greeting_settings?.greeting_el ??
    `Ναι παρακαλώ;`;

  return {
    name: agentName,
    conversation_config: {
      asr: {
        quality:  "high",
        provider: "scribe_realtime",
        user_input_audio_format: "ulaw_8000",
      },
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm:    "gpt-4o-mini",
          tools,
        },
        first_message: greetingEl,
        language:      "el",
      },
      tts: {
        voice_id:                   voiceId,
        model_id:                   "eleven_flash_v2_5",
        agent_output_audio_format:  "ulaw_8000",
        optimize_streaming_latency: 4,
        stability,
        similarity_boost:           simBoost,
        style,
        speed,
      },
      turn: {
        turn_timeout:    2.0,
        turn_eagerness:  "eager",
        speculative_turn: true,
        turn_model:      "turn_v2",
      },
    },
  };
}
