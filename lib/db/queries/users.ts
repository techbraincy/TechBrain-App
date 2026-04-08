import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { User, UserRow, Permissions } from "@/types/db";

const USER_FIELDS = "id, username, role, account_type, tenant_id, permissions, created_at, updated_at";
const USER_FIELDS_NO_PERMS = "id, username, role, account_type, tenant_id, created_at, updated_at";

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select(`${USER_FIELDS}, password_hash`)
    .eq("username", username)
    .single();
  if (error || !data) return null;
  return data as UserRow;
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .eq("id", id)
    .single();

  // If permissions column doesn't exist yet, fall back
  if (error?.code === "42703") {
    const fallback = await supabase
      .from("users")
      .select(USER_FIELDS_NO_PERMS)
      .eq("id", id)
      .single();
    if (fallback.error || !fallback.data) return null;
    return { ...(fallback.data as User), permissions: null };
  }

  if (error || !data) return null;
  return data as User;
}

export async function getUserPermissions(id: string): Promise<Permissions | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("permissions")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return (data as any).permissions ?? null;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .order("created_at", { ascending: false });

  if (error?.code === "42703") {
    // permissions column doesn't exist — fall back
    const fallback = await supabase
      .from("users")
      .select(USER_FIELDS_NO_PERMS)
      .order("created_at", { ascending: false });
    if (fallback.error || !fallback.data) return [];
    return (fallback.data as User[]).map((u) => ({ ...u, permissions: null }));
  }

  if (error || !data) return [];
  return data as User[];
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: "user" | "superadmin",
  accountType?: "caffe" | "restaurant" | null,
  permissions?: Permissions | null
): Promise<User> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash, role, account_type: accountType ?? null, permissions: permissions ?? null })
    .select(USER_FIELDS)
    .single();

  if (error?.code === "42703") {
    // permissions column doesn't exist yet — insert without it
    const fallback = await supabase
      .from("users")
      .insert({ username, password_hash: passwordHash, role, account_type: accountType ?? null })
      .select(USER_FIELDS_NO_PERMS)
      .single();
    if (fallback.error || !fallback.data) throw new Error(fallback.error?.message ?? "Failed to create user");
    return { ...(fallback.data as User), permissions: permissions ?? null };
  }

  if (error || !data) throw new Error(error?.message ?? "Failed to create user");
  return data as User;
}

export async function deleteUser(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updatePasswordHash(userId: string, hash: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("users")
    .update({ password_hash: hash })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
