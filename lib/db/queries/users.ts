import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { User, UserRow } from "@/types/db";

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, password_hash, role, created_at, updated_at")
    .eq("username", username)
    .single();
  if (error || !data) return null;
  return data as UserRow;
}

export async function getUserById(id: string): Promise<User | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as User;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as User[];
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: "user" | "superadmin"
): Promise<User> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash, role })
    .select("id, username, role, created_at, updated_at")
    .single();
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
