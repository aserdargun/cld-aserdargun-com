import { ChevronDown } from 'lucide-react'
import { loadCatalog } from '../data/catalog'
import type {
  PriceKind,
  Provider,
  ScenarioUsageDimension,
  ServiceCategory,
} from '../domain/catalog'
import type { PriceLineItemEstimate } from '../domain/pricing'
import type { RankedProviderEstimate } from '../domain/ranking'
import { StatusBadge } from './StatusBadge'
import './ScenarioSummary.css'

const categoryLabels: Record<ServiceCategory, string> = {
  compute: 'Hesaplama',
  'gpu-ai': 'AI / GPU',
  'object-storage': 'Nesne depolama',
  'managed-database': 'Yönetilen veritabanı',
  serverless: 'Sunucusuz',
  'cdn-network': 'CDN / ağ',
  kubernetes: 'Kubernetes',
}

const priceKindLabels: Record<PriceKind, string> = {
  'instance-hour': 'Çalışma süresi',
  'flat-month': 'Sabit aylık ücret',
  'storage-gb-month': 'Depolama',
  'outbound-gb': 'Dış trafik',
  'requests-million': 'İstekler',
  'database-gb-month': 'Veritabanı',
  'gpu-hour': 'GPU kullanımı',
}

const dimensionLabels: Record<ScenarioUsageDimension, string> = {
  hoursPerMonth: 'Çalışma süresi',
  vcpu: 'vCPU',
  ramGb: 'RAM',
  storageGb: 'Depolama',
  outboundGb: 'Dış trafik',
  requestsMillion: 'İstek sayısı',
  databaseGb: 'Veritabanı depolaması',
  gpuHours: 'GPU kullanımı',
  gpuVramGb: 'GPU VRAM',
}

const rankLabels: Record<Exclude<RankedProviderEstimate['rank'], null>, string> = {
  'best-price': 'En düşük tahmin',
  'second-price': 'İkinci en düşük',
}

const decimalFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
})

function formatUsd(value: number | null): string {
  return value === null ? 'Doğrulanamadı' : `${decimalFormatter.format(value)} USD/ay`
}

function freeTierSavings(estimate: RankedProviderEstimate): number | null {
  const savings = estimate.lineItems.flatMap((offerEstimate) =>
    offerEstimate.lineItems.map((lineItem) => lineItem.freeTierSavingsUsd),
  )

  if (savings.length === 0) {
    return estimate.subtotalBeforeFreeTierUsd === null || estimate.totalUsd === null
      ? null
      : Math.max(0, estimate.subtotalBeforeFreeTierUsd - estimate.totalUsd)
  }

  return savings.some((saving) => saving === null)
    ? null
    : savings.reduce<number>((total, saving) => total + (saving ?? 0), 0)
}

function trafficShare(estimate: RankedProviderEstimate): number | null {
  if (estimate.totalUsd === null || estimate.totalUsd <= 0) return null

  const trafficLines = estimate.lineItems.flatMap((offerEstimate) =>
    offerEstimate.lineItems.filter((lineItem) => lineItem.component.kind === 'outbound-gb'),
  )
  if (trafficLines.length === 0 || trafficLines.some((lineItem) => lineItem.totalUsd === null)) {
    return null
  }

  const trafficTotal = trafficLines.reduce<number>(
    (total, lineItem) => total + (lineItem.totalUsd ?? 0),
    0,
  )
  return (trafficTotal / estimate.totalUsd) * 100
}

function regionsFor(estimate: RankedProviderEstimate): string | null {
  const regions = [...new Set(estimate.lineItems.map((lineItem) => lineItem.offer.region))]
  return regions.length > 0 ? regions.join(', ') : null
}

function EstimateMetrics({
  estimate,
  savings,
  traffic,
  regions,
  variant,
}: {
  estimate: RankedProviderEstimate
  savings: number | null
  traffic: number | null
  regions: string | null
  variant: 'summary' | 'disclosure'
}) {
  return (
    <dl className={`scenario-summary__metrics scenario-summary__metrics--${variant}`}>
      <div>
        <dt>Ücretsiz katman öncesi</dt>{' '}
        <dd>{formatUsd(estimate.subtotalBeforeFreeTierUsd)}</dd>
      </div>
      <div>
        <dt>Ücretsiz katman indirimi</dt>{' '}
        <dd>{formatUsd(savings)}</dd>
      </div>
      {traffic === null ? null : (
        <div>
          <dt>Trafik maliyetinin payı</dt>{' '}
          <dd>%{quantityFormatter.format(traffic)}</dd>
        </div>
      )}
      {regions ? (
        <div>
          <dt>Bölge</dt>{' '}
          <dd>{regions}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function LineItem({ lineItem }: { lineItem: PriceLineItemEstimate }) {
  return (
    <li className="scenario-summary__price-line">
      <span>{priceKindLabels[lineItem.component.kind]}</span>
      <span>{quantityFormatter.format(lineItem.quantity)} birim</span>
      <span>{formatUsd(lineItem.subtotalBeforeFreeTierUsd)}</span>
      <span>− {formatUsd(lineItem.freeTierSavingsUsd)}</span>
      <strong>{formatUsd(lineItem.totalUsd)}</strong>
    </li>
  )
}

interface ScenarioSummaryProps {
  estimates: readonly RankedProviderEstimate[]
  providers?: readonly Provider[]
}

export function ScenarioSummary({ estimates, providers: providedProviders }: ScenarioSummaryProps) {
  const providers = providedProviders ?? loadCatalog().providers
  const providersById = new Map(providers.map((provider) => [provider.id, provider]))
  return (
    <section className="scenario-summary" aria-label="Sağlayıcı sıralaması">
      <h2>Sağlayıcı sıralaması</h2>

      <ol className="scenario-summary__list">
        {estimates.map((estimate) => {
          const provider = providersById.get(estimate.providerId)
          const providerName = provider?.name ?? estimate.providerId
          const rankLabel = estimate.rank ? rankLabels[estimate.rank] : null
          const savings = freeTierSavings(estimate)
          const traffic = trafficShare(estimate)
          const regions = regionsFor(estimate)

          return (
            <li
              className={`scenario-summary__provider${estimate.lineItems.length > 0 ? ' scenario-summary__provider--has-details' : ''}`}
              key={estimate.providerId}
              aria-label={providerName}
            >
              <div className="scenario-summary__row">
                <div className="scenario-summary__identity">
                  <strong>{providerName}</strong>
                  <span>{provider?.shortName ?? estimate.providerId.toUpperCase()}</span>
                </div>

                <div className="scenario-summary__status">
                  {rankLabel ? <strong className="scenario-summary__rank">{rankLabel}</strong> : null}
                  <StatusBadge status={estimate.status} />
                </div>

                <output className="scenario-summary__total" aria-label="Aylık tahmini tutar">
                  {formatUsd(estimate.totalUsd)}
                </output>
              </div>

              {estimate.totalUsd === null ? null : (
                <EstimateMetrics
                  estimate={estimate}
                  savings={savings}
                  traffic={traffic}
                  regions={regions}
                  variant="summary"
                />
              )}

              {estimate.missingCategories.length > 0 ? (
                <p className="scenario-summary__missing">
                  <strong>Senaryoya eksik:</strong>{' '}
                  {estimate.missingCategories.map((category) => categoryLabels[category]).join(', ')}
                </p>
              ) : null}

              {estimate.missingDimensions.length > 0 ? (
                <p className="scenario-summary__missing">
                  <strong>Karşılanamayan gereksinimler:</strong>{' '}
                  {estimate.missingDimensions.map((dimension) => dimensionLabels[dimension]).join(', ')}
                </p>
              ) : null}

              {estimate.lineItems.length > 0 ? (
                <details className="scenario-summary__details">
                  <summary>
                    Maliyet ayrıntılarını göster
                    <ChevronDown aria-hidden="true" size={17} strokeWidth={2} />
                  </summary>

                  {estimate.totalUsd === null ? null : (
                    <EstimateMetrics
                      estimate={estimate}
                      savings={savings}
                      traffic={traffic}
                      regions={regions}
                      variant="disclosure"
                    />
                  )}

                  <div className="scenario-summary__breakdown">
                    {estimate.lineItems.map((offerEstimate) => (
                      <section
                        className="scenario-summary__offer"
                        key={offerEstimate.offer.id}
                        aria-label={offerEstimate.offer.serviceName}
                      >
                        <header>
                          <div>
                            <strong>{offerEstimate.offer.serviceName}</strong>
                            <span>{categoryLabels[offerEstimate.offer.category]}</span>
                          </div>
                          <span>{offerEstimate.offer.region}</span>
                        </header>

                        <div className="scenario-summary__line-head" aria-hidden="true">
                          <span>Kalem</span>
                          <span>Kullanım</span>
                          <span>Ön toplam</span>
                          <span>İndirim</span>
                          <span>Toplam</span>
                        </div>
                        <ul>
                          {offerEstimate.lineItems.map((lineItem, index) => (
                            <LineItem
                              key={`${lineItem.component.kind}-${index}`}
                              lineItem={lineItem}
                            />
                          ))}
                        </ul>
                        {offerEstimate.offer.notes.length > 0 ? (
                          <aside className="scenario-summary__notes">
                            <h4>Kapsam ve hariçler</h4>
                            <ul>
                              {offerEstimate.offer.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </aside>
                        ) : null}
                      </section>
                    ))}
                  </div>
                </details>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
