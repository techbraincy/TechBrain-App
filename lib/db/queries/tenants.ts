import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { Tenant } from "@/types/db";

export async function getAllTenants(): Promise<Tenant[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, type, created_at")
    .order("name", { ascending: true });
  if (error) return [];
  return data as Tenant[];
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, type, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Tenant;
}

export async function createTenant(name: string, type: "caffe" | "restaurant"): Promise<Tenant> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("tenants")
    .insert({ name, type })
    .select("id, name, type, created_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create tenant");
  return data as Tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
