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

  if (business.reservation_enabled) {
    const ws = business.workflow_settings;
    lines.push(
      "RESERVATIONS / ΚΡΑΤΗΣΕΙΣ:\n" +
      "- You CAN accept table reservations / bookings.\n" +
      `- Minimum ${ws?.booking_lead_time_hours ?? 1} hour(s) advance notice required.\n` +
      `- Maximum party size: ${ws?.max_party_size ?? 10} people.\n` +
      `- Cancellations allowed up to ${ws?.cancellation_window_hours ?? 2} hours before.\n` +
      "- Always collect ALL of the following: full name, phone number, desired date, time, number of guests, any special requests.\n" +
      "- Read the reservation details back and ask for confirmation before finalising.\n" +
      "- After confirming, tell the customer their reservation is PENDING — staff will confirm it.\n" +
      "- Do NOT tell the customer the reservation is confirmed — it is pending review."
    );
  } else {
    lines.push("RESERVATIONS: We do NOT take reservations. Inform customers politely.");
  }

  if (business.meetings_enabled) {
    lines.push(
      "APPOINTMENTS / ΡΑΝΤΕΒΟΥ:\n" +
      "- You CAN schedule appointments for customers.\n" +
      "- Always collect ALL of the following: full name, phone number, preferred date, time, service requested.\n" +
      "- Read back the details and confirm before finalising.\n" +
      "- After confirming, tell the customer their appointment is PENDING — staff will confirm it."
    );
  }

  if (business.delivery_enabled) {
    const ws = business.workflow_settings;
    lines.push(
      "DELIVERY / ΠΑΡΑΔΟΣΗ:\n" +
      "- You CAN accept delivery orders.\n" +
      (business.service_area
        ? `- Delivery area: ${business.service_area}\n`
        : "") +
      (ws?.delivery_radius_km ? `- Delivery radius: ${ws.delivery_radius_km} km.\n` : "") +
      (ws?.delivery_fee ? `- Delivery fee: €${ws.delivery_fee}.\n` : "") +
      (ws?.min_order_value ? `- Minimum order: €${ws.min_order_value}.\n` : "") +
      "- Always collect ALL of the following before finalising the order: customer full name, phone number, delivery address, complete list of items with quantities.\n" +
      "- Read the order back to the customer and ask them to confirm before submitting.\n" +
      "- After confirming, tell the customer their order has been placed and is PENDING approval from staff.\n" +
      "- Do NOT tell the customer the order is confirmed or accepted — it is pending until a staff member reviews it.\n" +
      (ws?.avg_prep_time_minutes
        ? `- Estimated preparation time: ${ws.avg_prep_time_minutes} minutes.\n`
        : "") +
      (ws?.avg_delivery_time_minutes
        ? `- Estimated delivery time after preparation: ${ws.avg_delivery_time_minutes} minutes.\n`
        : "")
    );
  }

  if (business.takeaway_enabled) {
    const ws = business.workflow_settings;
    lines.push(
      "TAKEAWAY / ΠΑΡΑΛΑΒΗ:\n" +
      "- You CAN accept takeaway orders.\n" +
      "- Always collect ALL of the following: customer full name, phone number, complete list of items with quantities, preferred pickup time.\n" +
      "- Read the order back to the customer and ask them to confirm before submitting.\n" +
      "- After confirming, tell the customer their order is PENDING and staff will prepare it soon.\n" +
      "- Do NOT tell the customer the order is confirmed — it is pending until a staff member reviews it.\n" +
      (ws?.avg_prep_time_minutes
        ? `- Estimated pickup wait: ${ws.avg_prep_time_minutes} minutes.\n`
        : "")
    );
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

IMPORTANT RESTRICTIONS:
- Never provide medical, legal, or financial advice.
- Never share personal customer data with third parties.
- Never accept payment information over the phone.
- Always stay within your role as the ${business.business_name} assistant.
`.trim();

  return prompt;
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

  const greetingEl = business.greeting_settings?.greeting_el ??
    `Γεια σας! Είμαι ο βοηθός του ${business.business_name}. Πώς μπορώ να σας εξυπηρετήσω;`;

  return {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm:    "gpt-4o-mini",
          tools:  [],
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
