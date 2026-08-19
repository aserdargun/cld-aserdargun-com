import type { VerificationStatus } from '../domain/catalog'
import { statusLabels } from './statusLabels'

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
