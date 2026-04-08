// ─────────────────────────────────────────────
// TypeScript types matching the database schema
// ─────────────────────────────────────────────

export type FeatureKey = "orders" | "reservations" | "analytics" | "calendar" | "history" | "sheets";
export type Permissions = Partial<Record<FeatureKey, boolean>>;

export interface Tenant {
  id: string;
  name: string;
  type: "caffe" | "restaurant";
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  role: "user" | "superadmin";
  /** Kept for legacy/fallback when no tenant assigned */
  account_type: "caffe" | "restaurant" | null;
  /** When set, user belongs to this tenant and only sees that tenant's data */
  tenant_id: string | null;
  /** When set, overrides account_type-based defaults for each feature */
  permissions: Permissions | null;
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
    account_type: "caffe" | "restaurant" | null;
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

export interface Reservation {
  reservation_id: string;
  customer_name: string;
  phone_number: string;
  reservation_date: string; // YYYY-MM-DD
  reservation_time: string; // HH:MM or HH:MM:SS
  party_size: number;
  table_id: string;
  status: "confirmed" | "cancelled";
  notes: string;
  previous_reservation_id: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// Supabase generic database types
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
