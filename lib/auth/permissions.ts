import type { BusinessRole, BusinessFeatures, SystemRole } from '@/types/db'

const ROLE_WEIGHT: Record<BusinessRole, number> = {
  owner: 3,
  manager: 2,
  staff: 1,
}

export function hasRole(userRole: BusinessRole, requiredRole: BusinessRole): boolean {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[requiredRole]
}

export function isOwner(role: BusinessRole)   { return role === 'owner' }
export function isManager(role: BusinessRole)  { return hasRole(role, 'manager') }
export function isStaff(role: BusinessRole)    { return hasRole(role, 'staff') }

export function canManageBusiness(role: BusinessRole)    { return isManager(role) }
export function canManageMembers(role: BusinessRole)     { return isOwner(role) }
export function canUpdateAgentConfig(role: BusinessRole) { return isManager(role) }
export function canApproveOrders(role: BusinessRole)     { return isManager(role) }
export function canViewAnalytics(role: BusinessRole)     { return isManager(role) }

// System-level helpers (platform admin, not per-business)
export function isSuperAdmin(systemRole: SystemRole): boolean {
  return systemRole === 'super_admin'
}

export function canAccessPlatformAdmin(systemRole: SystemRole): boolean {
  return isSuperAdmin(systemRole)
}

// Feature flag helpers
export function featureEnabled(
  features: BusinessFeatures | null | undefined,
  flag: keyof Pick<
    BusinessFeatures,
    | 'orders_enabled'
    | 'reservations_enabled'
    | 'takeaway_enabled'
    | 'delivery_enabled'
    | 'staff_approval_enabled'
    | 'faqs_enabled'
    | 'customer_portal_enabled'
    | 'live_tracking_enabled'
  >
): boolean {
  return features?.[flag] === true
}

export function getEnabledModules(features: BusinessFeatures | null | undefined): string[] {
  if (!features) return []
  const modules: string[] = []
  if (features.reservations_enabled) modules.push('reservations')
  if (features.orders_enabled || features.takeaway_enabled || features.delivery_enabled)
    modules.push('orders')
  if (features.delivery_enabled)      modules.push('delivery')
  if (features.staff_approval_enabled) modules.push('approvals')
  if (features.faqs_enabled)          modules.push('faqs')
  if (features.live_tracking_enabled)  modules.push('tracking')
  return modules
}
