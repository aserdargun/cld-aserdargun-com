import { useState } from 'react'
import type {
  CatalogHealth,
  FreeTier,
  FreeTierType,
  Provider,
  ProviderId,
  Source,
} from '../domain/catalog'
import { SourceLink } from './SourceLink'
import { statusLabels } from './statusLabels'

export interface FreeTierGuideProps {
  freeTiers: readonly FreeTier[]
  providers: readonly Provider[]
  sources: readonly Source[]
  health: CatalogHealth
}

const typeLabels: Record<FreeTierType, string> = {
  'new-account-credit': 'Yeni hesap kredisi',
  'time-limited': 'Süreli ücretsiz kullanım',
  'always-free': 'Sürekli ücretsiz kota',
  'eligibility-limited': 'Uygunlukla sınırlı kota',
}

function quotaText(freeTier: FreeTier): string {
  const period = freeTier.quota.period === 'month' ? 'aylık' : 'tek sefer'
  return `${freeTier.quota.amount.toLocaleString('en-US')} ${freeTier.quota.unit} · ${period}`
}

function durationText(durationMonths: number | null): string {
  return durationMonths === null ? 'Süre sınırı yok' : `${durationMonths} ay`
}

export function FreeTierGuide({ freeTiers, providers, sources, health }: FreeTierGuideProps) {
  const providersWithTiers = providers.filter((provider) => (
    freeTiers.some((freeTier) => freeTier.providerId === provider.id)
  ))
  const hasProviderMismatch = freeTiers.some((freeTier) => (
    !providers.some((provider) => provider.id === freeTier.providerId)
  ))
  const initialProviderId = providersWithTiers.some((provider) => provider.id === 'azure')
    ? 'azure'
    : providersWithTiers[0]?.id
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | undefined>(initialProviderId)
  const [recordsAreOpen, setRecordsAreOpen] = useState(false)

  const selectedTiers = recordsAreOpen
    ? freeTiers.filter((freeTier) => freeTier.providerId === selectedProviderId)
    : []

  const selectProvider = (providerId: ProviderId) => {
    setSelectedProviderId(providerId)
    setRecordsAreOpen(true)
  }

  const unavailableMessage = freeTiers.length === 0
    ? 'Ücretsiz kullanım kaydı bulunamadı.'
    : hasProviderMismatch
      ? 'Ücretsiz kullanım kayıtları doğrulanamadı: sağlayıcı eşleşmesi eksik.'
      : null

  return (
    <section
      className="free-tier-section page-section free-tier-guide"
      id="ucretsiz-katmanlar"
      aria-labelledby="free-tier-heading"
    >
      <header className="page-section__heading">
        <h2 id="free-tier-heading">Ücretsiz kullanım rehberi</h2>
        <p>Krediler, süreli teklifler ve sürekli kotalar birbirinden ayrı gösterilir.</p>
      </header>
      <p className="free-tier-guide__notice">Bilgi amaçlı; tahmine uygulanmadı</p>

      {unavailableMessage && (
        <p className="free-tier-guide__empty" role="status">{unavailableMessage}</p>
      )}

      {providersWithTiers.length > 0 && (
        <div className="free-tier-guide__providers">
          {providersWithTiers.map((provider) => {
            const providerTiers = freeTiers.filter((freeTier) => freeTier.providerId === provider.id)
            const summary = {
              count: providerTiers.length,
              hasCredit: providerTiers.some((tier) => tier.type === 'new-account-credit'),
              hasAlwaysFree: providerTiers.some((tier) => tier.type === 'always-free'),
              maximumDurationMonths: Math.max(0, ...providerTiers.map((tier) => tier.durationMonths ?? 0)),
              hasNonCurrent: providerTiers.some((tier) => health.statusByFreeTierId[tier.id] !== 'current'),
            }
            const lastVerifiedAt = providerTiers.reduce(
              (latest, tier) => tier.verifiedAt > latest ? tier.verifiedAt : latest,
              '',
            )
            const isSelected = selectedProviderId === provider.id

            return (
              <button
                className="free-tier-guide__provider"
                key={provider.id}
                type="button"
                aria-pressed={isSelected}
                aria-expanded={isSelected && recordsAreOpen}
                aria-controls={recordsAreOpen ? 'free-tier-records' : undefined}
                onClick={() => selectProvider(provider.id)}
              >
                <span className="free-tier-guide__provider-name">{provider.name}</span>
                <span>{summary.count} teklif</span>
                <span>{summary.hasCredit ? 'Yeni hesap kredisi var' : 'Yeni hesap kredisi yok'}</span>
                <span>{summary.hasAlwaysFree ? 'Sürekli ücretsiz kota var' : 'Sürekli ücretsiz kota yok'}</span>
                <span>
                  {summary.maximumDurationMonths > 0
                    ? `En uzun süreli teklif: ${summary.maximumDurationMonths} ay`
                    : 'Süreli teklif yok'}
                </span>
                <span>Aşım davranışı kayıt bazında değişir</span>
                <span>{summary.hasNonCurrent ? 'Yeniden doğrulama gereken kayıt var' : 'Tüm kayıtlar güncel'}</span>
                <span>Son doğrulama: <time dateTime={lastVerifiedAt}>{lastVerifiedAt}</time></span>
              </button>
            )
          })}
        </div>
      )}

      {selectedTiers.length > 0 && (
        <div className="free-tier-guide__records" id="free-tier-records">
          {selectedTiers.map((freeTier) => {
            const status = health.statusByFreeTierId[freeTier.id] ?? 'invalid'
            const headingId = `free-tier-${freeTier.id}`

            return (
              <article className="free-tier-guide__record" key={freeTier.id} aria-labelledby={headingId}>
                <h3 id={headingId}>{freeTier.serviceName}</h3>
                <dl>
                  <div><dt>Tür</dt><dd>{typeLabels[freeTier.type]}</dd></div>
                  <div><dt>Süre</dt><dd>{durationText(freeTier.durationMonths)}</dd></div>
                  <div><dt>Kota</dt><dd>{quotaText(freeTier)}</dd></div>
                  <div><dt>Aşım</dt><dd>{freeTier.overageNote}</dd></div>
                  <div><dt>Otomatik ücret</dt><dd>{freeTier.automaticChargeNote}</dd></div>
                  <div><dt>Uygunluk / kapsam</dt><dd>{freeTier.eligibilityNote}</dd></div>
                  <div>
                    <dt>Doğrulama</dt>
                    <dd>
                      <span className={`data-table__status data-table__status--${status}`} data-status={status}>
                        {statusLabels[status]}
                      </span>
                      <time className="data-table__meta" dateTime={freeTier.verifiedAt}>{freeTier.verifiedAt}</time>
                    </dd>
                  </div>
                  <div>
                    <dt>Kaynak</dt>
                    <dd className="free-tier-guide__sources">
                      {freeTier.sourceIds.map((sourceId) => (
                        <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />
                      ))}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
