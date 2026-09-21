import { t } from '../i18n'
import type { VerificationStatus } from '../domain/catalog'

export const statusLabels: Record<VerificationStatus, string> = {
  current: t('Güncel'),
  stale: t('30 günden eski'),
  invalid: t('Doğrulanamadı'),
}
