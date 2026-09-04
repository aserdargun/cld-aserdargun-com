import { ChevronDown } from 'lucide-react'
import type {
  ExchangeRate,
  PriceKind,
  Provider,
  ScenarioUsageDimension,
  ServiceCategory,
  Source,
  VerificationStatus,
} from '../domain/catalog'
import type { PriceLineItemEstimate } from '../domain/pricing'
import {
  dominantCostKind,
  partitionDecisionEstimates,
  priceDeltaFromBest,
  type EligibleEstimateEvidence,
  type EstimateEvidenceIssue,
  type EstimatePriceBasisSignal,
  type EstimateRegionSignal,
  type IneligibleEstimateEvidence,
  type ProviderRegion,
} from '../domain/presentation'
import type { RankedProviderEstimate } from '../domain/ranking'
import { ProviderMark } from './ProviderMark'
import { SourceLink } from './SourceLink'
import { StatusBadge } from './StatusBadge'
import './DecisionSummary.css'

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

const decimalFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
})

const exchangeRateFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatUsd(value: number | null): string {
  return value === null ? 'Doğrulanamadı' : `${decimalFormatter.format(value)} USD/ay`
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`))
}

function formatRegion(region: ProviderRegion): string {
  return `${region.name} · ${region.scope === 'global' ? 'Global' : region.countryCode}`
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

function LineItem({ lineItem }: { lineItem: PriceLineItemEstimate }) {
  return (
    <li className="decision-summary__price-line">
      <span>{priceKindLabels[lineItem.component.kind]}</span>
      <span>{quantityFormatter.format(lineItem.quantity)} birim</span>
      <span>{formatUsd(lineItem.subtotalBeforeFreeTierUsd)}</span>
      <span>− {formatUsd(lineItem.freeTierSavingsUsd)}</span>
      <strong>{formatUsd(lineItem.totalUsd)}</strong>
    </li>
  )
}

function EstimateMetrics({ estimate }: { estimate: RankedProviderEstimate }) {
  const savings = freeTierSavings(estimate)
  const traffic = trafficShare(estimate)

  return (
    <dl className="decision-summary__metrics">
      <div>
        <dt>Ücretsiz katman öncesi</dt>{' '}
        <dd>{formatUsd(estimate.subtotalBeforeFreeTierUsd)}</dd>
      </div>
      <div>
        <dt>Uygulanan ücretsiz katman indirimi</dt>{' '}
        <dd>{formatUsd(savings)}</dd>
      </div>
      {traffic === null ? null : (
        <div>
          <dt>Trafik payı</dt>{' '}
          <dd>%{quantityFormatter.format(traffic)}</dd>
        </div>
      )}
    </dl>
  )
}

function EstimateEvidenceSignals({
  regionSignal,
  priceBasis,
}: {
  regionSignal: EstimateRegionSignal
  priceBasis: EstimatePriceBasisSignal
}) {
  const currencies = priceBasis.currencies.length > 0
    ? priceBasis.currencies.join(' + ')
    : 'Doğrulanamadı'

  return (
    <dl className="decision-summary__evidence-signals">
      <div>
        <dt>Kullanılan bölgeler</dt>
        <dd>
          {regionSignal.status === 'verified'
            ? regionSignal.regions.map(formatRegion).join(' · ')
            : 'Doğrulanamadı'}
        </dd>
      </div>
      <div>
        <dt>Fiyat tabanı</dt>
        <dd className="decision-summary__price-basis">
          <span>{`Vergiler hariç genel liste fiyatı · Özgün para birimi: ${currencies}`}</span>
          {priceBasis.status === 'invalid' && priceBasis.currencies.includes('EUR') ? (
            <strong>ECB dönüşüm kanıtı doğrulanamadı</strong>
          ) : null}
          {priceBasis.status === 'invalid' && !priceBasis.currencies.includes('EUR') ? (
            <strong>Fiyat kanıtı doğrulanamadı</strong>
          ) : null}
          {priceBasis.status === 'verified' && priceBasis.kind === 'public-list-ecb'
            ? priceBasis.ecbEvidence.map(({ exchangeRate, source }) => (
              <span className="decision-summary__conversion" key={exchangeRate.id}>
                <span>
                  ECB dönüşümü: 1 EUR = {exchangeRateFormatter.format(exchangeRate.rate)} USD ·{' '}
                  <time dateTime={exchangeRate.date}>{formatDate(exchangeRate.date)}</time>
                </span>
                <SourceLink sourceId={source.id} sources={[source]} />
              </span>
            ))
            : null}
        </dd>
      </div>
    </dl>
  )
}

function CostDetails({ estimate }: { estimate: RankedProviderEstimate }) {
  if (estimate.lineItems.length === 0) return null

  return (
    <details className="decision-summary__details">
      <summary>
        Ayrıntıları göster
        <ChevronDown aria-hidden="true" size={17} strokeWidth={2} />
      </summary>

      <div className="decision-summary__breakdown">
        {estimate.lineItems.map((offerEstimate) => (
          <section
            className="decision-summary__offer"
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

            <div className="decision-summary__line-head" aria-hidden="true">
              <span>Kalem</span>
              <span>Kullanım</span>
              <span>Ön toplam</span>
              <span>İndirim</span>
              <span>Toplam</span>
            </div>
            <ul>
              {offerEstimate.lineItems.map((lineItem, index) => (
                <LineItem key={`${lineItem.component.kind}-${index}`} lineItem={lineItem} />
              ))}
            </ul>
            {offerEstimate.offer.notes.length > 0 ? (
              <aside className="decision-summary__notes">
                <h4>Kapsam ve hariçler</h4>
                <ul>
                  {offerEstimate.offer.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </aside>
            ) : null}
          </section>
        ))}
      </div>
    </details>
  )
}

function ComparableResult({
  evidence,
  bestUsd,
  featured,
  position,
}: {
  evidence: EligibleEstimateEvidence<RankedProviderEstimate>
  bestUsd: number | null
  featured: boolean
  position: number
}) {
  const { estimate, provider, priceBasis, regionSignal } = evidence
  const verifiedTotal = estimate.totalUsd
  const delta = priceDeltaFromBest(verifiedTotal, bestUsd)
  const dominantKind = dominantCostKind(estimate)
  const deltaText = delta === null
    ? 'Doğrulanamadı'
    : delta.usd === 0
      ? 'Baz tahmin'
      : `+${decimalFormatter.format(delta.usd)} USD · %${quantityFormatter.format(delta.percent)}`

  return (
    <li
      className={`decision-summary__result${featured ? ' decision-summary__result--featured' : ''}`}
      aria-label={featured
        ? `${provider.name} doğrulanmış tahmin`
        : `${provider.name} diğer karşılaştırılabilir sonuç`}
    >
      <div className="decision-summary__result-head">
        <div className="decision-summary__identity">
          <span className="decision-summary__mark"><ProviderMark providerId={provider.id} /></span>
          <div>
            <strong>{provider.name}</strong>
            <span>{provider.shortName}</span>
          </div>
        </div>

        <div className="decision-summary__status">
          {position === 0 ? (
            <strong className="decision-summary__rank">En düşük doğrulanmış tahmin</strong>
          ) : position === 1 ? (
            <strong className="decision-summary__rank">İkinci en düşük tahmin</strong>
          ) : null}
          <StatusBadge status={estimate.status} />
        </div>

        <output className="decision-summary__total" aria-label="Modellenen aylık tutar">
          {formatUsd(verifiedTotal)}
        </output>
      </div>

      <dl className="decision-summary__signals">
        <div>
          <dt>En düşük tahmine göre</dt>{' '}
          <dd>{deltaText}</dd>
        </div>
        <div>
          <dt>En büyük maliyet kalemi</dt>{' '}
          <dd>{dominantKind === null ? 'Doğrulanamadı' : priceKindLabels[dominantKind]}</dd>
        </div>
        <div>
          <dt>Kapsam</dt>{' '}
          <dd>Eksiksiz</dd>
        </div>
      </dl>

      <EstimateEvidenceSignals regionSignal={regionSignal} priceBasis={priceBasis} />
      <EstimateMetrics estimate={estimate} />
      <CostDetails estimate={estimate} />
    </li>
  )
}

function exclusionReason(
  issue: EstimateEvidenceIssue,
  evidence: IneligibleEstimateEvidence<RankedProviderEstimate>,
): string {
  switch (issue) {
    case 'estimate':
      return 'Tahmin güncel ve eksiksiz olarak doğrulanamadı.'
    case 'provider':
      return 'Sağlayıcı kaydı doğrulanamadı.'
    case 'purchase-source':
      return 'Sağlayıcının satın alma kaynağı doğrulanamadı.'
    case 'region-source':
      return 'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.'
    case 'verification-date':
      return 'Tekliflerin doğrulama tarihi doğrulanamadı.'
    case 'price-basis':
      return evidence.priceBasis.currencies.includes('EUR')
        ? 'Fiyat tabanı için gerekli ECB dönüşüm kanıtı doğrulanamadı.'
        : 'Fiyat tabanı doğrulanamadı.'
  }
}

function MissingEvidence({ evidence }: {
  evidence: IneligibleEstimateEvidence<RankedProviderEstimate>
}) {
  const { estimate, provider } = evidence
  const providerName = provider?.name ?? estimate.providerId.toUpperCase()
  const reasons = [...new Set(evidence.issues.map((issue) => exclusionReason(issue, evidence)))]
  const evidenceStatus: VerificationStatus = estimate.status === 'stale' ? 'stale' : 'invalid'

  return (
    <li className="decision-summary__incomplete" aria-label={`${providerName} eksik sonuç`}>
      <div className="decision-summary__incomplete-head">
        <strong>{providerName}</strong>
        <StatusBadge status={evidenceStatus} />
      </div>
      {estimate.missingCategories.length > 0 ? (
        <p>
          <strong>Eksik kategoriler:</strong>{' '}
          {estimate.missingCategories.map((category) => categoryLabels[category]).join(', ')}
        </p>
      ) : null}
      {estimate.missingDimensions.length > 0 ? (
        <p>
          <strong>Eksik kullanım boyutları:</strong>{' '}
          {estimate.missingDimensions.map((dimension) => dimensionLabels[dimension]).join(', ')}
        </p>
      ) : null}
      {reasons.length > 0 ? (
        <div className="decision-summary__exclusion-reasons">
          <strong>Hariç tutulma nedenleri</strong>
          <ul>
            {reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

interface DecisionSummaryProps {
  estimates: readonly RankedProviderEstimate[]
  providers: readonly Provider[]
  exchangeRates: readonly ExchangeRate[]
  sources: readonly Source[]
  statusByExchangeRateId: Readonly<Record<string, VerificationStatus>>
}

export function DecisionSummary({
  estimates,
  providers,
  exchangeRates,
  sources,
  statusByExchangeRateId,
}: DecisionSummaryProps) {
  const groups = partitionDecisionEstimates(estimates, providers, {
    exchangeRates,
    sources,
    statusByExchangeRateId,
  })
  const bestUsd = groups.featured[0]?.estimate.totalUsd ?? null
  const otherResultCount = groups.remainingComparable.length + groups.incomplete.length

  return (
    <section className="decision-summary" id="sonuclar" aria-label="Karar özeti">
      <header className="decision-summary__heading">
        <div>
          <span>Karar desteği</span>
          <h2>Karar özeti</h2>
        </div>
        <p>Eksiksiz ve güncel tahminler fiyat sırasıyla gösterilir.</p>
      </header>

      {groups.featured.length === 0 ? (
        <p className="decision-summary__empty">Bu senaryo için eksiksiz tahmin bulunamadı</p>
      ) : (
        <ol className="decision-summary__featured">
          {groups.featured.map((evidence, index) => (
            <ComparableResult
              key={evidence.estimate.providerId}
              evidence={evidence}
              bestUsd={bestUsd}
              featured
              position={index}
            />
          ))}
        </ol>
      )}

      {otherResultCount > 0 ? (
        <details className="decision-summary__other-results">
          <summary>
            {groups.featured.length === 0
              ? `Eksik sonuçları incele · ${otherResultCount}`
              : `Diğer sonuçlar · ${otherResultCount}`}
            <ChevronDown aria-hidden="true" size={18} strokeWidth={2} />
          </summary>
          <section aria-labelledby="remaining-comparable-heading">
            <h3 id="remaining-comparable-heading">Diğer karşılaştırılabilir sonuçlar</h3>
            <ul>
              {groups.remainingComparable.map((evidence, index) => (
                <ComparableResult
                  key={evidence.estimate.providerId}
                  evidence={evidence}
                  bestUsd={bestUsd}
                  featured={false}
                  position={index + groups.featured.length}
                />
              ))}
            </ul>
          </section>
          <section aria-labelledby="incomplete-results-heading">
            <h3 id="incomplete-results-heading">Eksik kanıt veya kapsam</h3>
            <ul>
              {groups.incomplete.map((evidence) => (
                <MissingEvidence
                  key={evidence.estimate.providerId}
                  evidence={evidence}
                />
              ))}
            </ul>
          </section>
        </details>
      ) : null}
    </section>
  )
}
