import type { VerificationStatus } from '../domain/catalog'

const statusLabels: Record<VerificationStatus, string> = {
  current: 'Güncel',
  stale: 'Yeniden doğrulanmalı',
  invalid: 'Eksik veri',
}

interface StatusBadgeProps {
  status: VerificationStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`} data-status={status}>
      {statusLabels[status]}
    </span>
  )
}
