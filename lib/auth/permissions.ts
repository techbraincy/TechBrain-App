import type { FeatureKey, Permissions } from "@/types/db";

export interface FeatureAccess {
  orders: boolean;
  reservations: boolean;
  analytics: boolean;
  calendar: boolean;
  history: boolean;
  sheets: boolean;
}

/**
 * Resolves which features a user can access.
 * Priority: superadmin → custom permissions → account_type defaults.
 */
export function resolveAccess(
  role: string,
  accountType: string | null,
  permissions: Permissions | null
): FeatureAccess {
  if (role === "superadmin") {
    return { orders: true, reservations: true, analytics: true, calendar: true, history: true, sheets: true };
  }
  if (permissions !== null) {
    return {
      orders:       permissions.orders       ?? false,
      reservations: permissions.reservations ?? false,
      analytics:    permissions.analytics    ?? false,
      calendar:     permissions.calendar     ?? false,
      history:      permissions.history      ?? false,
      sheets:       permissions.sheets       ?? false,
    };
  }
  // Fall back to account_type defaults
  return {
    orders:       !accountType || accountType === "caffe",
    reservations: !accountType || accountType === "restaurant",
    analytics:    accountType === "caffe",
    calendar:     accountType === "restaurant",
    history:      !accountType || accountType === "caffe" || accountType === "restaurant",
    sheets:       false,
  };
}

/** Parse the x-permissions header value into a Permissions object or null. */
export function parsePermissionsHeader(raw: string | null): Permissions | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Permissions; }
  catch { return null; }
}

/** Returns tenantId string or null. Superadmins have no tenant → null → see all data. */
export function parseTenantId(raw: string | null): string | null {
  return raw && raw.length > 0 ? raw : null;
}
