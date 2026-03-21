// ─────────────────────────────────────────────
// TypeScript types matching the database schema
// ─────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  role: "user" | "superadmin";
  created_at: string;
  updated_at: string;
}

/** Like User but includes the password hash — only used in auth flows */
export interface UserRow extends User {
  password_hash: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SessionWithUser {
  id: string;
  token: string;
  expires_at: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    role: "user" | "superadmin";
  };
}

export interface Sheet {
  id: string;
  spreadsheet_id: string;
  display_name: string;
  range_notation: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Sheet row including cache columns — used in data-fetching routes */
export interface SheetWithCache extends Sheet {
  cached_data: string[][] | null;
  cache_expires_at: string | null;
}

export interface UserSheet {
  id: string;
  user_id: string;
  sheet_id: string;
  assigned_at: string;
  assigned_by: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Supabase generic database types
// Used to type the createClient call in supabase-server.ts
// For full type safety, replace this with the auto-generated
// types from `npx supabase gen types typescript --project-id YOUR_ID`
// ─────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserRow, "id">>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, "id" | "created_at">;
        Update: Partial<Omit<Session, "id">>;
      };
      sheets: {
        Row: SheetWithCache;
        Insert: Omit<SheetWithCache, "id" | "created_at" | "updated_at" | "cached_data" | "cache_expires_at">;
        Update: Partial<Omit<SheetWithCache, "id">>;
      };
      user_sheets: {
        Row: UserSheet;
        Insert: Omit<UserSheet, "id" | "assigned_at">;
        Update: Partial<Omit<UserSheet, "id">>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
