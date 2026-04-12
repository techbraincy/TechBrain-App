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
    const maxParty  = ws?.max_party_size ?? 10;
    const leadHours = ws?.booking_lead_time_hours ?? 1;
    const cancelWin = ws?.cancellation_window_hours ?? 2;

    lines.push([
      "TABLE RESERVATIONS — STEP-BY-STEP CONVERSATION FLOW:",
      "Step 1 — Ask for the customer's preferred date.",
      "Step 2 — Ask for the preferred time.",
      `Step 3 — Ask how many people will be joining (maximum ${maxParty}).`,
      "Step 4 — Ask for their full name.",
      "Step 5 — Ask for their phone number.",
      "Step 6 — Ask if they have any special requests (birthday, allergies, high chair, etc.).",
      "Step 7 — Read all details back: date, time, number of people, name, phone, and any notes. Ask: 'Shall I confirm this reservation?'",
      "Step 8 — Only after they confirm: call the create_reservation tool.",
      "Step 9 — Read out the confirmation message from the tool, including the reference number.",
      "IMPORTANT: Do NOT submit until the customer explicitly confirms all details.",
      "IMPORTANT: The reservation is PENDING — staff will call to confirm it. Do not say it is confirmed.",
      `Note: Reservations require at least ${leadHours} hour(s) advance notice. Cancellations must be made at least ${cancelWin} hours before.`,
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
      "Step 2 — Ask for their preferred date.",
      "Step 3 — Ask for their preferred time.",
      "Step 4 — Ask for their full name.",
      "Step 5 — Ask for their phone number.",
      "Step 6 — Ask if they have any notes or special requests.",
      "Step 7 — Read back all details: service, date, time, name, phone. Ask: 'Shall I book this appointment?'",
      "Step 8 — Only after they confirm: call the create_reservation tool.",
      "Step 9 — Read out the confirmation message from the tool.",
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

TOOL USAGE — CRITICAL:
You have tools that take real actions. Use them correctly:
- "check_hours": Call when asked if the business is open or what the hours are.
- "get_menu": Call when asked about the menu, what is available, or prices. Read out the relevant items naturally.
- "create_order": Call ONLY after completing ALL steps in the ordering flow AND getting explicit customer confirmation. Pass customer_name, customer_phone, order_type, items_text (e.g. "2x Espresso, 1x Croissant"), delivery_address if delivery, and special_instructions if any.
- "create_reservation": Call ONLY after completing ALL steps in the reservation/appointment flow AND getting explicit customer confirmation. Pass customer_name, customer_phone, reservation_date (YYYY-MM-DD), reservation_time (HH:MM), party_size, and notes if any.
- After a successful tool call: read the confirmation message aloud to the customer in their language, including the reference number.
- If a tool call fails: apologize sincerely and offer to try again, or suggest the customer call the business directly.

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
 *  - GET tools use query_params_schema (no request_body_schema)
 *  - POST tools use request_body_schema with required[] and content_type
 *  - NO top-level "parameters" field — only api_schema
 */
export function buildTools(business: Business): unknown[] {
  const base = `${getAppUrl()}/api/agent/${business.id}`;
  const tools: unknown[] = [];

  const hasOrdering     = business.delivery_enabled || business.takeaway_enabled;
  const hasReservations = business.reservation_enabled || business.meetings_enabled;
  const hasMenu         = (business.menu_catalog?.length ?? 0) > 0 || (business.services?.length ?? 0) > 0;

  // ── check_hours ────────────────────────────────────────────────────────────
  tools.push({
    type:        "webhook",
    name:        "check_hours",
    description: "Check if the business is currently open and get today's opening hours. Call this when a customer asks about hours, whether the business is open, or what time it closes.",
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
      type:        "webhook",
      name:        "create_order",
      description: `Submit a confirmed order. Call this ONLY after the customer has confirmed ALL of: their name, phone number, items with quantities, order type (${orderTypes.join(" or ")}), and delivery address if delivery. Read back the complete order and get explicit yes/confirmation before calling.`,
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
              enum:        orderTypes,
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
              enum:        ["el", "en"],
              description: "Language of the conversation",
            },
          },
          required: ["customer_name", "order_type", "items_text"],
        },
      },
    });
  }

  // ── create_reservation ─────────────────────────────────────────────────────
  if (hasReservations) {
    const ws       = business.workflow_settings;
    const maxParty = ws?.max_party_size ?? 10;
    const label    = business.meetings_enabled ? "appointment" : "table reservation";

    tools.push({
      type:        "webhook",
      name:        "create_reservation",
      description: `Book a ${label}. Call this ONLY after the customer has confirmed ALL of: their name, phone number, date (YYYY-MM-DD), time (HH:MM), and number of people (max ${maxParty}). Read back the details and get explicit confirmation before calling.`,
      api_schema: {
        url:          `${base}/reservation`,
        method:       "POST",
        content_type: "application/json",
        request_body_schema: {
          type:        "object",
          description: "Reservation details collected from the customer",
          properties: {
            customer_name: {
              type:        "string",
              description: "Customer's full name",
            },
            customer_phone: {
              type:        "string",
              description: "Customer's phone number with country code (e.g. +30 6901234567)",
            },
            reservation_date: {
              type:        "string",
              description: "Date in YYYY-MM-DD format, e.g. 2025-06-20",
            },
            reservation_time: {
              type:        "string",
              description: "Time in HH:MM format, e.g. 19:30",
            },
            party_size: {
              type:        "integer",
              description: `Number of people, between 1 and ${maxParty}`,
            },
            notes: {
              type:        "string",
              description: "Special requests, allergies, or occasion notes",
            },
            preferred_language: {
              type:        "string",
              enum:        ["el", "en"],
              description: "Language of the conversation",
            },
          },
          required: ["customer_name", "reservation_date", "reservation_time", "party_size"],
        },
      },
    });
  }

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
