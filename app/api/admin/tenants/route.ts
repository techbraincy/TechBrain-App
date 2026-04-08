import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAllTenants, createTenant } from "@/lib/db/queries/tenants";
import { validateCsrf } from "@/lib/auth/csrf";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["caffe", "restaurant"]),
});

export async function GET() {
  const h = await headers();
  if (h.get("x-user-role") !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tenants = await getAllTenants();
  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const h = await headers();
  if (h.get("x-user-role") !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await validateCsrf(req))) return NextResponse.json({ error: "Invalid request." }, { status: 403 });

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.errors[0].message }, { status: 400 });

  try {
    const tenant = await createTenant(body.data.name, body.data.type);
    return NextResponse.json({ tenant });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
