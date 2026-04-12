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
  const agentName = agent.agent_name ?? `${business.business_name} Assistant`;
  const personality = agent.personality ?? "professional";
  const tone = agent.tone ?? "helpful";
  const customInstructions = business.custom_agent_instructions ?? "";

  const categoryDescriptions: Record<string, string> = {
    restaurant: "a restaurant that serves food and beverages",
    cafe:       "a café/coffee shop serving coffee, beverages, and light food",
    clinic:     "a medical clinic / healthcare provider",
    salon:      "a beauty salon / hair & beauty services",
    hotel:      "a hotel / hospitality establishment",
    retail:     "a retail store",
    service:    "a service business",
    other:      "a business",
  };

  const businessDesc = categoryDescriptions[business.business_category] ?? "a business";

  const greetingEl = business.greeting_settings?.greeting_el ??
    `Γεια σας! Είμαι ο βοηθός του ${business.business_name}. Πώς μπορώ να σας εξυπηρετήσω;`;
  const greetingEn = business.greeting_settings?.greeting_en ??
    `Hello! I'm the assistant for ${business.business_name}. How can I help you today?`;
  const farewellEl = business.greeting_settings?.farewell_el ?? "Ευχαριστούμε! Καλή συνέχεια!";
  const farewellEn = business.greeting_settings?.farewell_en ?? "Thank you for calling! Have a great day!";

  const hoursBlock    = formatHoursBlock(business);
  const servicesBlock = formatServicesBlock(business);
  const faqBlock      = formatFAQBlock(business);
  const capBlock      = buildCapabilitiesSection(business);
  const escalBlock    = buildEscalationSection(business);
  const permBlock     = buildPermissionsSection(business);

  const prompt = `
You are ${agentName}, the AI voice assistant for ${business.business_name} — ${businessDesc}.

PERSONALITY & TONE:
- Personality: ${personality}
- Tone: ${tone}
- You are professional, warm, and efficient.
- Keep responses concise and clear — this is a voice call.
- Never use bullet points or markdown in speech — speak in natural sentences.
- Ask ONE question at a time. Never ask for multiple pieces of information in a single sentence.
- Wait for the customer to answer before moving to the next question.

BUSINESS INFORMATION:
- Name: ${business.business_name}
- Category: ${business.business_category}
${business.phone_number ? `- Phone: ${business.phone_number}` : ""}
${business.address ? `- Address: ${business.address}` : ""}
${business.google_maps_link ? `- Location/Maps: ${business.google_maps_link}` : ""}
${business.service_area ? `- Service area: ${business.service_area}` : ""}

OPENING HOURS:
${hoursBlock || "Contact the business for current hours."}

${servicesBlock ? `SERVICES / MENU:\n${servicesBlock}` : ""}

${capBlock}

${faqBlock ? `FREQUENTLY ASKED QUESTIONS:\n${faqBlock}` : ""}

${escalBlock}

${permBlock}

${customInstructions ? `ADDITIONAL BUSINESS INSTRUCTIONS:\n${customInstructions}` : ""}

LANGUAGE RULES — CRITICAL:
- You speak BOTH Greek (Ελληνικά) and English fluently.
- ALWAYS detect and match the language the customer is using.
- If the customer speaks Greek, respond entirely in Greek.
- If the customer speaks English, respond entirely in English.
- If unclear, default to Greek first.
- Do not mix languages in the same response unless quoting something (e.g., a product name).
- Greek greeting: "${greetingEl}"
- English greeting: "${greetingEn}"
- Greek farewell: "${farewellEl}"
- English farewell: "${farewellEn}"

CALL HANDLING:
- Start by greeting the customer in Greek (since most callers are Greek speakers).
- Listen carefully and identify what the customer needs before responding.
- If you cannot help with something, say so clearly and offer alternatives.
- Never make up information — if unsure, say you don't know and suggest they contact the business.
- Keep the conversation focused and efficient — respect the caller's time.
- Always confirm important information (names, times, orders) back to the customer.
- End calls politely with the appropriate farewell in the customer's language.

CURRENT DATE RULE (CRITICAL):
- Call get_current_datetime ONLY when the customer uses a relative date expression: today, tonight, tomorrow, this Saturday, next Friday, this weekend, next week.
- Do NOT call get_current_datetime when the customer states an exact date (e.g. "April 20", "the 25th", "2026-04-20").
- Never use your own memory or assumptions to determine the current date.
- If get_current_datetime fails, ask: "Just to confirm, what date did you have in mind?"

SILENT TOOL RULE (STRICT):
- Never narrate tool calls. Do NOT say "Let me check", "One moment", "Let me look that up", or any similar phrase before or during tool execution.
- Call all tools silently and immediately. Speak only after you have a result.

TOOL USAGE:
- "get_current_datetime": Resolve relative dates only. Never mention this tool to the customer.
- "check_hours": Call when asked about opening hours or whether the business is open.
- "get_menu": Call when asked about the menu, prices, or available items. Read relevant items naturally.
- "check_availability": Call before booking to verify the slot is free. If unavailable, offer alternatives.
- "book_reservation": Call ONLY after check_availability confirms available=true AND customer explicitly confirms all details.
- "create_order": Call ONLY after all order details are collected and customer explicitly confirms.
- "cancel_reservation": Call to cancel a booking by phone number and date.
- "reschedule_reservation": Call to move an existing booking to a new date/time.
- "end_call": Call immediately after delivering the final farewell following a completed action (booking/order/cancellation/reschedule).
- After any successful action: read the confirmation message aloud in the customer's language including the reference number, deliver the farewell, then call end_call.
- If a tool fails: apologize and offer to try again or suggest the customer call directly.

IMPORTANT RESTRICTIONS:
- Never provide medical, legal, or financial advice.
- Never share personal customer data with third parties.
- Never accept payment information over the phone.
- Always stay within your role as the ${business.business_name} assistant.
`.trim();

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
              description: "Customer's full name",
            },
            customer_phone: {
              type:        "string",
              description: "Customer's phone number with country code (e.g. +30 6901234567)",
            },
            order_type: {
              type:        "string",
              description: `Order type: ${orderTypes.join(" or ")}`,
            },
            items_text: {
              type:        "string",
              description: "Plain text summary of all ordered items and quantities, e.g. '2x Espresso, 1x Croissant'",
            },
            delivery_address: {
              type:        "string",
              description: "Full delivery address — required only for delivery orders",
            },
            special_instructions: {
              type:        "string",
              description: "Any special requests or dietary requirements from the customer",
            },
            preferred_language: {
              type:        "string",
              description: "Language of the conversation: el or en",
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
 */
export function buildAgentConfig(
  business: Business,
  agent: Partial<ElevenLabsAgent> = {}
): ELAgentConfig {
  const agentName    = agent.agent_name ?? `${business.business_name} Assistant`;
  const voiceId      = business.agent_voice_settings?.voice_id || DEFAULT_VOICE_ID;
  const stability    = business.agent_voice_settings?.stability    ?? 0.5;
  const simBoost     = business.agent_voice_settings?.similarity_boost ?? 0.75;
  const style        = business.agent_voice_settings?.style        ?? 0.0;
  const speed        = business.agent_voice_settings?.speed        ?? 1.0;

  const systemPrompt = buildSystemPrompt(business, agent);
  const tools        = buildTools(business);

  const greetingEl = business.greeting_settings?.greeting_el ??
    `Γεια σας! Είμαι ο βοηθός του ${business.business_name}. Πώς μπορώ να σας εξυπηρετήσω;`;

  return {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm:    "gpt-4o-mini",
          tools,
        },
        first_message: greetingEl,
        language:      "el",   // Primary language; agent handles both via prompt
      },
      tts: {
        voice_id:                    voiceId,
        model_id:                    "eleven_turbo_v2_5",
        optimize_streaming_latency:  3,
        stability,
        similarity_boost:            simBoost,
        style,
        speed,
      },
      stt: {
        user_input_audio_format: "pcm_16000",
      },
      turn: {
        turn_timeout: 7,
      },
    },
  };
}
