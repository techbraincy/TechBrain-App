import { Phone, Monitor, User, Webhook } from 'lucide-react'
import { SOURCE_LABEL } from '@/lib/admin/formatters'
import type { OrderSource, ReservationSource } from '@/lib/admin/types'

interface Props {
  source: OrderSource | ReservationSource
}

export function SourceIcon({ source }: Props) {
  const label = SOURCE_LABEL[source]
  const Icon =
    source === 'phone' ? Phone : source === 'portal' ? Monitor : source === 'staff' ? User : Webhook

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        color: 'var(--charcoal)',
      }}
      title={label}
      aria-label={`Source: ${label}`}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
