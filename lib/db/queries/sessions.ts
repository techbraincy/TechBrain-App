import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { SessionWithUser } from "@/types/db";

export async function createSession(
  userId: string,
  token: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function getSessionByToken(token: string): Promise<SessionWithUser | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      token,
      expires_at,
      user_id,
      users (
        id,
        username,
        role,
        account_type
      )
    `
    )
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Flatten the joined user row
  const user = Array.isArray(data.users) ? data.users[0] : data.users;
  if (!user) return null;

  return {
    id: data.id,
    token: data.token,
    expires_at: data.expires_at,
    user_id: data.user_id,
    user: {
      id: user.id,
      username: user.username,
      role: user.role as "user" | "superadmin",
      account_type: (user as any).account_type as "caffe" | "restaurant" | null ?? null,
    },
  };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("sessions").delete().eq("token", token);
}

export async function deleteSessionsByUserId(
  userId: string,
  exceptToken?: string
): Promise<void> {
  const supabase = getSupabaseServer();
  let query = supabase.from("sessions").delete().eq("user_id", userId);
  if (exceptToken) {
    query = query.neq("token", exceptToken);
  }
  await query;
}

export async function deleteExpiredSessions(): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("sessions").delete().lt("expires_at", new Date().toISOString());
}
