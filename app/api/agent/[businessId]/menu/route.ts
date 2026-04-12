/**
 * GET /api/agent/[businessId]/menu
 *
 * Called by the ElevenLabs voice agent as a tool to retrieve the current menu
 * or service list so it can answer questions about pricing and availability.
 * Returns a compact text representation the LLM can use in responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db/supabase-server";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { businessId } = await params;
  const supabase = getSupabaseServer();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("business_name, menu_catalog, services, delivery_enabled, takeaway_enabled, workflow_settings")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    return NextResponse.json({ success: false, message: "Business not found" }, { status: 404 });
  }

  const ws = (business.workflow_settings ?? {}) as Record<string, unknown>;
  const allItems = [
    ...(business.menu_catalog ?? []),
    ...(business.services ?? []),
  ] as { name: string; description?: string; price?: string; category?: string }[];

  if (allItems.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No menu items available. Please ask the customer to visit in person or check the website.",
      items:   [],
    });
  }

  // Group by category for readability
  const byCategory: Record<string, typeof allItems> = {};
  for (const item of allItems) {
    const cat = item.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  const lines: string[] = [`Menu for ${business.business_name}:`];
  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`\n${cat}:`);
    for (const item of items) {
      const price = item.price && parseFloat(item.price) > 0 ? ` — €${item.price}` : "";
      const desc  = item.description ? ` (${item.description})` : "";
      lines.push(`  • ${item.name}${price}${desc}`);
    }
  }

  if (business.delivery_enabled && ws.delivery_fee) {
    lines.push(`\nDelivery fee: €${ws.delivery_fee}`);
  }
  if (ws.min_order_value) {
    lines.push(`Minimum order: €${ws.min_order_value}`);
  }

  return NextResponse.json({
    success:    true,
    menu_text:  lines.join("\n"),
    message:    lines.join("\n"),
    item_count: allItems.length,
    items:      allItems.map((i) => ({ name: i.name, price: i.price ?? "", category: i.category ?? "" })),
  });
}
