// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from "@supabase/supabase-js";

// Use an untyped client for audit_log to avoid Database generic constraints
// on this fire-and-forget table. The service-role key is still used.
function getAuditClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export type AuditAction =
  | "create_user"
  | "delete_user"
  | "reset_password"
  | "create_sheet"
  | "delete_sheet"
  | "assign_sheet"
  | "remove_sheet_assignment";

export async function writeAuditLog(
  actorId: string,
  action: AuditAction,
  targetType?: "user" | "sheet" | "assignment",
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getAuditClient();
  // Fire-and-forget — do not let audit failures block the primary operation
  supabase
    .from("audit_log")
    .insert({
      actor_id: actorId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("[audit_log] write failed:", error.message);
      }
    });
}
