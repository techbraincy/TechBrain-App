import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getAllUsers, createUser } from "@/lib/db/queries/users";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { validateCsrf } from "@/lib/auth/csrf";
import { writeAuditLog } from "@/lib/db/queries/audit";

const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, _, . and -"),
  password: z.string().min(12).max(200),
  role: z.enum(["user", "superadmin"]),
});

/**
 * GET /api/admin/users
 * Returns all users (no password hashes).
 */
export async function GET() {
  const headersList = await headers();
  if (headersList.get("x-user-role") !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}

/**
 * POST /api/admin/users
 * Creates a new user.
 */
export async function POST(req: NextRequest) {
  const headersList = await headers();
  const actorId = headersList.get("x-user-id");
  if (headersList.get("x-user-role") !== "superadmin" || !actorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  let body: z.infer<typeof CreateUserSchema>;
  try {
    body = CreateUserSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pwError = validatePasswordStrength(body.password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const hash = await hashPassword(body.password);

  let user;
  try {
    user = await createUser(body.username, hash, body.role);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }

  writeAuditLog(actorId, "create_user", "user", user.id, { username: user.username, role: user.role });

  return NextResponse.json({ user }, { status: 201 });
}
