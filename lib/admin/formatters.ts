import type { ReservationStatus, OrderStatus, OrderType, OrderSource, ReservationSource } from './types'

const EUR = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' })

export function eur(n: number): string {
  return EUR.format(n)
}

export function formatTimeShort(iso: string): string {
  return new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

export function formatDateTimeFull(iso: string): string {
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// + 30 69 1234 5678 — best-effort cosmetic grouping; never silently drops digits
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.replace(/\s+/g, '')
  if (trimmed.startsWith('+30') && trimmed.length === 13) {
    return `+30 ${trimmed.slice(3, 5)} ${trimmed.slice(5, 9)} ${trimmed.slice(9)}`
  }
  if (trimmed.startsWith('+') && trimmed.length > 8) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`
  }
  return trimmed
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  awaiting_approval: 'Awaiting approval',
  accepted: 'Accepted',
  rejected: 'Rejected',
  preparing: 'Preparing',
  ready: 'Ready',
  dispatched: 'Dispatched',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  dine_in: 'Dine-in',
}

export const SOURCE_LABEL: Record<OrderSource | ReservationSource, string> = {
  phone: 'Voice',
  portal: 'Portal',
  staff: 'Staff',
  webhook: 'Webhook',
}

export type StatusTone = 'pending' | 'success' | 'danger' | 'neutral' | 'info'

export function reservationStatusTone(s: ReservationStatus): StatusTone {
  if (s === 'pending') return 'pending'
  if (s === 'confirmed') return 'success'
  if (s === 'completed') return 'neutral'
  if (s === 'cancelled' || s === 'rejected' || s === 'no_show') return 'danger'
  return 'neutral'
}

export function orderStatusTone(s: OrderStatus): StatusTone {
  if (s === 'pending' || s === 'awaiting_approval') return 'pending'
  if (s === 'accepted' || s === 'preparing' || s === 'ready' || s === 'dispatched') return 'info'
  if (s === 'completed') return 'success'
  if (s === 'rejected' || s === 'cancelled') return 'danger'
  return 'neutral'
}
