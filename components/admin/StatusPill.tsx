import type { StatusTone } from '@/lib/admin/formatters'

interface Props {
  label: string
  tone: StatusTone
}

export function StatusPill({ label, tone }: Props) {
  return (
    <span className="pill" data-tone={tone}>
      <span className="sr-only">Status: </span>
      {label}
    </span>
  )
}
