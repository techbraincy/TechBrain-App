import { getSupabaseServer } from "@/lib/db/supabase-server";
import type { Sheet, SheetWithCache } from "@/types/db";

// ─────────────────────────────────────────────
// Sheet CRUD (admin)
// ─────────────────────────────────────────────

export async function getAllSheets(): Promise<Sheet[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("sheets")
    .select("id, spreadsheet_id, display_name, range_notation, created_by, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Sheet[];
}

export async function getSheetById(id: string): Promise<SheetWithCache | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("sheets")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as SheetWithCache;
}

export async function createSheet(
  spreadsheetId: string,
  displayName: string,
  rangeNotation: string,
  createdBy: string
): Promise<Sheet> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("sheets")
    .insert({
      spreadsheet_id: spreadsheetId,
      display_name: displayName,
      range_notation: rangeNotation,
      created_by: createdBy,
    })
    .select("id, spreadsheet_id, display_name, range_notation, created_by, created_at, updated_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create sheet");
  return data as Sheet;
}

export async function deleteSheet(id: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("sheets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateSheetCache(
  id: string,
  cachedData: unknown,
  cacheTtlSeconds = 300
): Promise<void> {
  const supabase = getSupabaseServer();
  const cacheExpiresAt = new Date(Date.now() + cacheTtlSeconds * 1000).toISOString();
  await supabase
    .from("sheets")
    .update({ cached_data: cachedData, cache_expires_at: cacheExpiresAt })
    .eq("id", id);
}

// ─────────────────────────────────────────────
// User-Sheet Assignments
// ─────────────────────────────────────────────

export async function getSheetsByUserId(userId: string): Promise<Sheet[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("user_sheets")
    .select(
      `
      sheets (
        id,
        spreadsheet_id,
        display_name,
        range_notation,
        created_by,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", userId);

  if (error || !data) return [];
  return data
    .map((row) => (Array.isArray(row.sheets) ? row.sheets[0] : row.sheets))
    .filter(Boolean) as Sheet[];
}

export async function getAssignedSheetByIdForUser(
  sheetId: string,
  userId: string
): Promise<SheetWithCache | null> {
  const supabase = getSupabaseServer();
  // Verify the user_sheet assignment exists first
  const { data: assignment } = await supabase
    .from("user_sheets")
    .select("sheet_id")
    .eq("sheet_id", sheetId)
    .eq("user_id", userId)
    .single();
  if (!assignment) return null;
  return getSheetById(sheetId);
}

export async function assignSheetToUser(
  userId: string,
  sheetId: string,
  assignedBy: string
): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("user_sheets")
    .insert({ user_id: userId, sheet_id: sheetId, assigned_by: assignedBy });
  if (error) throw new Error(error.message);
}

export async function removeSheetFromUser(userId: string, sheetId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("user_sheets")
    .delete()
    .eq("user_id", userId)
    .eq("sheet_id", sheetId);
  if (error) throw new Error(error.message);
}

export async function getAssignmentsByUserId(
  userId: string
): Promise<{ sheet_id: string; sheet: Sheet }[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("user_sheets")
    .select(
      `
      sheet_id,
      sheets (
        id,
        spreadsheet_id,
        display_name,
        range_notation,
        created_by,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", userId);
  if (error || !data) return [];
  return data
    .map((row) => {
      const sheet = Array.isArray(row.sheets) ? row.sheets[0] : row.sheets;
      return sheet ? { sheet_id: row.sheet_id, sheet: sheet as Sheet } : null;
    })
    .filter(Boolean) as { sheet_id: string; sheet: Sheet }[];
}
