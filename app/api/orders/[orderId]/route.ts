import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/db/supabase-server";
import { validateCsrf } from "@/lib/auth/csrf";
import { z } from "zod";

const schema = z.object({ status: z.enum(["pending", "done"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { orderId } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("orders")
    .update({ status: body.data.status })
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await validateCsrf(req))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { orderId } = await params;
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
