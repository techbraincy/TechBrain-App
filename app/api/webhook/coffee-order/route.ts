import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { z } from "zod";

const schema = z.object({
  customer_name:    z.string().min(1),
  customer_phone:   z.string().min(1),
  caller_id:        z.string().optional().default(""),
  delivery_address: z.string().min(1),
  coffee_type:      z.string().min(1),
});

// Sugar keyword detection — default to sketo
function normaliseSugar(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("glyko") || t.includes("sweet") || t.includes("very sweet")) return "glyko";
  if (t.includes("metrio") || t.includes("medium")) return "metrio";
  if (t.includes("oligh") || t.includes("little")) return "oligh";
  return "sketo"; // default: no sugar
}

function buildItemsSummary(coffee_type: string): string {
  // Split on comma
  const parts = coffee_type.split(/,/).map((s) => s.trim()).filter(Boolean);
  return parts
    .map((part) => {
      const sugar = normaliseSugar(part);
      // Strip parenthesised sugar notes and sugar keywords for clean name
      const name = part
        .replace(/\(.*?\)/g, "")
        .replace(/\b(sketo|oligh|metrio|glyko|medium|sweet|very sweet|no sugar|little sugar)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return `${name} (${sugar})`;
    })
    .join(", ");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    return NextResponse.json({
      success: false,
      message: `I still need: ${missing}. Could you please provide that?`,
    });
  }

  const { customer_name, customer_phone, caller_id, delivery_address, coffee_type } = parsed.data;

  const items_summary = buildItemsSummary(coffee_type);

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("orders").insert({
    customer_name,
    customer_phone,
    caller_id,
    delivery_address,
    coffee_type:   coffee_type,   // NOT NULL column — raw value from agent
    items_summary,
    status: "pending",
    tenant_id: "59f70cfe-4731-4626-af6f-8667bcb62a45", // Demo Caffe tenant
  });

  if (error) {
    console.error("[webhook/coffee-order] DB error:", error.message, error.details, error.hint);
    return NextResponse.json({ success: false, message: "Sorry, there was a problem saving your order. Please try again." });
  }

  return NextResponse.json({
    success: true,
    message: `Perfect! Your order of ${items_summary} is confirmed, ${customer_name}. We'll deliver it to ${delivery_address}. Thank you!`,
  });
}
