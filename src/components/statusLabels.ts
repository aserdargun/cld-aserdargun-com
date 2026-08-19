import type { VerificationStatus } from '../domain/catalog'

export const statusLabels: Record<VerificationStatus, string> = {
  current: 'Güncel',
  stale: '30 günden eski',
  invalid: 'Doğrulanamadı',
}
