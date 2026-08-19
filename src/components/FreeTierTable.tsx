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

export interface FreeTierTableProps {
  freeTiers: readonly FreeTier[]
  providers: readonly Provider[]
  sources: readonly Source[]
  health: CatalogHealth
}

const filterProviderIds = ['azure', 'gcp', 'aws', 'oracle'] as const satisfies readonly ProviderId[]

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

export function FreeTierTable({ freeTiers, providers, sources, health }: FreeTierTableProps) {
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<ProviderId>>(
    () => new Set<ProviderId>(['azure', 'gcp']),
  )

  const toggleProvider = (providerId: ProviderId) => {
    setSelectedProviderIds((current) => {
      const next = new Set(current)
      if (next.has(providerId)) next.delete(providerId)
      else next.add(providerId)
      return next
    })
  }

  const visibleTiers = freeTiers.filter((freeTier) => selectedProviderIds.has(freeTier.providerId))

  return (
    <section className="free-tier-table">
      <fieldset className="free-tier-table__filters">
        <legend>Ücretsiz katman sağlayıcıları</legend>
        <div className="free-tier-table__filter-list">
          {filterProviderIds.map((providerId) => {
            const provider = providers.find((candidate) => candidate.id === providerId)
            if (!provider) return null
            return (
              <button
                key={provider.id}
                type="button"
                aria-pressed={selectedProviderIds.has(provider.id)}
                onClick={() => toggleProvider(provider.id)}
              >
                {provider.shortName}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="data-table-scroll" role="region" aria-label="Ücretsiz katmanlar tablosu" tabIndex={0}>
        <table className="data-table free-tier-table__table">
          <caption>Ücretsiz katmanlar</caption>
          <thead>
            <tr>
              <th scope="col">Sağlayıcı</th>
              <th scope="col">Servis</th>
              <th scope="col">Tür</th>
              <th scope="col">Kota</th>
              <th scope="col">Süre</th>
              <th scope="col">Uygunluk / kapsam</th>
              <th scope="col">Aşım</th>
              <th scope="col">Otomatik ücret</th>
              <th scope="col">Doğrulama</th>
              <th scope="col">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {visibleTiers.map((freeTier) => {
              const provider = providers.find((candidate) => candidate.id === freeTier.providerId)
              const status = health.statusByFreeTierId[freeTier.id] ?? 'invalid'
              return (
                <tr key={freeTier.id}>
                  <th className="data-table__sticky" scope="row">{provider?.name ?? 'Doğrulanamadı'}</th>
                  <td>{freeTier.serviceName}</td>
                  <td>{typeLabels[freeTier.type]}</td>
                  <td>{quotaText(freeTier)}</td>
                  <td>{durationText(freeTier.durationMonths)}</td>
                  <td>{freeTier.eligibilityNote}</td>
                  <td>{freeTier.overageNote}</td>
                  <td>{freeTier.automaticChargeNote}</td>
                  <td>
                    <span className={`data-table__status data-table__status--${status}`} data-status={status}>
                      {statusLabels[status]}
                    </span>
                    <time className="data-table__meta" dateTime={freeTier.verifiedAt}>{freeTier.verifiedAt}</time>
                  </td>
                  <td>
                    {freeTier.sourceIds.map((sourceId) => (
                      <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
