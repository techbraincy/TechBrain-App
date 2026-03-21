import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByUsername } from "@/lib/db/queries/users";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { validateCsrf } from "@/lib/auth/csrf";
import { checkLoginRateLimit } from "@/lib/middleware/rate-limit";

const LoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkLoginRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  // 2. CSRF validation
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  // 3. Parse + validate body
  let body: { username: string; password: string };
  try {
    body = LoginSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // 4. Look up user (timing-safe: always wait even if user not found)
  const user = await getUserByUsername(body.username);

  // 5. Verify password. Use a dummy compare if user not found to prevent
  //    timing-based username enumeration.
  const DUMMY_HASH = "$2b$12$invalid.hash.used.for.timing.safety.only.xxxxxx";
  const passwordValid = await verifyPassword(
    body.password,
    user?.password_hash ?? DUMMY_HASH
  );

  if (!user || !passwordValid) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  // 6. Create session and set cookie
  await createSession(user.id, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ role: user.role });
}
