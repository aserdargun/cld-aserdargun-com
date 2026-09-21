import { t, tf } from '../i18n'
import { useMemo, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import type {
  CatalogHealth,
  ExchangeRate,
  FreeTier,
  Offer,
  Provider,
  Scenario,
  ScenarioUsageDimension,
  Source,
} from '../domain/catalog'
import type { PriceComponent, VerificationStatus } from '../domain/catalog'
import { evaluateCategoryCoverage, projectScenarioForCategory } from '../domain/coverage'
import { convertToUsd, estimateOffer } from '../domain/pricing'
import { SourceLink } from './SourceLink'
import { statusLabels } from './statusLabels'

export interface ComparisonTableProps {
  offers: readonly Offer[]
  providers: readonly Provider[]
  sources: readonly Source[]
  freeTiers: readonly FreeTier[]
  exchangeRates: readonly ExchangeRate[]
  health: CatalogHealth
  scenario: Scenario
  eligibleFreeTierIds?: readonly string[]
  monthsSinceAccountCreation?: number
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const monthlyUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const eurFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const exchangeRateFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const unitByKind: Record<PriceComponent['kind'], string> = {
  'instance-hour': t('saat'),
  'gpu-hour': t('GPU-saat'),
  'flat-month': t('ay'),
  'storage-gb-month': t('GB-ay'),
  'database-gb-month': t('GB-ay'),
  'outbound-gb': 'GB',
  'requests-million': t('milyon istek'),
}

const dimensionLabels: Record<ScenarioUsageDimension, string> = {
  hoursPerMonth: t('çalışma süresi'),
  vcpu: 'vCPU',
  ramGb: 'RAM',
  storageGb: t('depolama'),
  outboundGb: t('trafik'),
  requestsMillion: t('istek sayısı'),
  databaseGb: t('veritabanı depolaması'),
  gpuHours: t('GPU kullanım süresi'),
  gpuVramGb: 'GPU VRAM',
}

function priceText(
  component: PriceComponent,
  offer: Offer,
  exchangeRates: readonly ExchangeRate[],
  sources: readonly Source[],
): string {
  const unit = unitByKind[component.kind]
  const included =
    component.includedQuantity > 0 ? tf(' · {0} dahil', [component.includedQuantity]) : ''
  const conversion = convertToUsd(
    component.price,
    component.currency,
    exchangeRates,
    offer.verifiedAt,
  )
  const capConversion =
    component.monthlyCap === undefined
      ? null
      : convertToUsd(component.monthlyCap, component.currency, exchangeRates, offer.verifiedAt)

  if (component.currency === 'EUR') {
    const original = `${eurFormatter.format(component.price)}/${unit}`
    const usd =
      conversion.amountUsd === null
        ? t('Doğrulanamadı')
        : `${usdFormatter.format(conversion.amountUsd)}/${unit}`
    const selectedRate = exchangeRates
      .filter((exchangeRate) => exchangeRate.date <= offer.verifiedAt)
      .reduce<ExchangeRate | undefined>(
        (latest, exchangeRate) =>
          !latest || exchangeRate.date > latest.date ? exchangeRate : latest,
        undefined,
      )
    const rateSource = selectedRate
      ? sources.find((source) => source.id === selectedRate.sourceId)
      : undefined
    const rateNote = selectedRate
      ? tf(' · Kur: 1 EUR = {0} USD · {1}{2}', [
          exchangeRateFormatter.format(selectedRate.rate),
          selectedRate.date,
          rateSource ? ` · ${rateSource.title}` : '',
        ])
      : ''
    const cap =
      component.monthlyCap === undefined
        ? ''
        : capConversion?.amountUsd == null
          ? tf(' · aylık üst sınır {0}', [eurFormatter.format(component.monthlyCap)])
          : tf(' · aylık üst sınır {0} · {1}', [
              eurFormatter.format(component.monthlyCap),
              monthlyUsdFormatter.format(capConversion.amountUsd),
            ])
    return `${original} · ${usd}${included}${cap}${rateNote}`
  }

  const cap =
    component.monthlyCap === undefined
      ? ''
      : tf(' · aylık üst sınır {0}', [monthlyUsdFormatter.format(component.monthlyCap)])
  return `${usdFormatter.format(component.price)}/${unit}${included}${cap}`
}

function capacityText(offer: Offer): string {
  const parts: string[] = []
  if (offer.specs.vcpu !== undefined) parts.push(`${offer.specs.vcpu} vCPU`)
  if (offer.specs.ramGb !== undefined) parts.push(`${offer.specs.ramGb} GB RAM`)
  if (offer.specs.storageGb !== undefined)
    parts.push(tf('{0} GB depolama', [offer.specs.storageGb]))
  if (offer.specs.gpuModel !== undefined) parts.push(offer.specs.gpuModel)
  if (offer.specs.gpuVramGb !== undefined) parts.push(`${offer.specs.gpuVramGb} GB VRAM`)
  return parts.length > 0 ? parts.join(' · ') : t('Esnek / kullanıma göre')
}

function trafficText(
  offer: Offer,
  offerEvidenceStatus: VerificationStatus,
  exchangeRates: readonly ExchangeRate[],
  sources: readonly Source[],
): string {
  if (offerEvidenceStatus === 'invalid') return t('Doğrulanamadı')
  if (offer.specs.outboundGb !== undefined)
    return tf('{0} GB dahil', [offer.specs.outboundGb.toLocaleString('en-US')])
  const outbound = offer.prices.find((component) => component.kind === 'outbound-gb')
  return outbound
    ? priceText(outbound, offer, exchangeRates, sources)
    : t('Kaynaklı trafik bileşeni yok')
}

function regionText(offer: Offer, providers: readonly Provider[]): string {
  const provider = providers.find((candidate) => candidate.id === offer.providerId)
  const region = provider?.regions.find((candidate) => candidate.id === offer.region)
  if (!region) return t('Doğrulanamadı')
  const scope = region.scope === 'global' ? 'Global' : t('Bölgesel')
  return [region.name, scope, region.countryCode].filter(Boolean).join(' · ')
}

function quotaText(offer: Offer, freeTiers: readonly FreeTier[]): string[] {
  const compatible = freeTiers.filter((freeTier) => freeTier.compatibleOfferIds.includes(offer.id))
  return compatible.length === 0
    ? [t('Yok')]
    : compatible.map((freeTier) => {
        const period = freeTier.quota.period === 'month' ? t('ay') : t('tek sefer')
        return `${freeTier.quota.amount.toLocaleString('en-US')} ${freeTier.quota.unit}/${period}`
      })
}

type SortKey = 'provider' | 'service' | 'monthly'
type SortDirection = 'ascending' | 'descending'

interface SortState {
  key: SortKey
  direction: SortDirection
}

function SortHeader({
  label,
  buttonLabel,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  buttonLabel: string
  sortKey: SortKey
  sort: SortState | null
  onSort: (key: SortKey) => void
}) {
  const direction = sort?.key === sortKey ? sort.direction : 'none'
  return (
    <th scope="col" aria-label={label} aria-sort={direction}>
      <button
        className="data-table__sort"
        type="button"
        aria-label={buttonLabel}
        onClick={() => onSort(sortKey)}
      >
        <span aria-hidden="true">{label}</span>
        <ChevronsUpDown aria-hidden="true" size={16} strokeWidth={1.9} />
      </button>
    </th>
  )
}

export function ComparisonTable({
  offers,
  providers,
  sources,
  freeTiers,
  exchangeRates,
  health,
  scenario,
  eligibleFreeTierIds,
  monthsSinceAccountCreation,
}: ComparisonTableProps) {
  const [sort, setSort] = useState<SortState | null>(null)
  const usableExchangeRates = useMemo(
    () =>
      exchangeRates.filter(
        (exchangeRate) => health.statusByExchangeRateId[exchangeRate.id] === 'current',
      ),
    [exchangeRates, health.statusByExchangeRateId],
  )
  const rows = useMemo(
    () =>
      offers.map((offer, index) => {
        const provider = providers.find((candidate) => candidate.id === offer.providerId)
        const inScope = scenario.requiredCategories.includes(offer.category)
        const offerEvidenceStatus = health.statusByOfferId[offer.id] ?? 'invalid'
        const hasInvalidCurrencyEvidence = offer.prices.some(
          (component) =>
            component.currency === 'EUR' &&
            convertToUsd(component.price, component.currency, usableExchangeRates, offer.verifiedAt)
              .amountUsd === null,
        )
        const effectiveEvidenceStatus: VerificationStatus =
          offerEvidenceStatus === 'invalid' || hasInvalidCurrencyEvidence
            ? 'invalid'
            : offerEvidenceStatus
        const coverage = inScope ? evaluateCategoryCoverage(offer, scenario, offer.category) : null
        const estimate =
          inScope && coverage?.complete
            ? estimateOffer(offer, projectScenarioForCategory(scenario, offer.category), {
                exchangeRates: usableExchangeRates,
                freeTiers,
                eligibleFreeTierIds,
                monthsSinceAccountCreation,
                statusByOfferId: health.statusByOfferId,
                statusByFreeTierId: health.statusByFreeTierId,
                statusByExchangeRateId: health.statusByExchangeRateId,
              })
            : null
        return { offer, provider, estimate, coverage, effectiveEvidenceStatus, inScope, index }
      }),
    [
      offers,
      providers,
      health,
      scenario,
      usableExchangeRates,
      freeTiers,
      eligibleFreeTierIds,
      monthsSinceAccountCreation,
    ],
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const direction = sort.direction === 'ascending' ? 1 : -1
    return [...rows].sort((left, right) => {
      if (sort.key === 'monthly') {
        const monthlyGroup = (row: (typeof rows)[number]) => {
          if (!row.inScope) return 2
          return !row.coverage?.complete ||
            row.estimate?.status === 'invalid' ||
            row.estimate?.totalUsd === null
            ? 1
            : 0
        }
        const leftGroup = monthlyGroup(left)
        const rightGroup = monthlyGroup(right)
        const groupDifference = leftGroup - rightGroup
        if (groupDifference !== 0) return groupDifference
        if (leftGroup !== 0) return left.index - right.index
        const leftValue = left.estimate?.totalUsd
        const rightValue = right.estimate?.totalUsd
        if (leftValue == null || rightValue == null) return left.index - right.index
        return (leftValue - rightValue) * direction || left.index - right.index
      }

      const leftValue =
        sort.key === 'provider'
          ? (left.provider?.name ?? t('Doğrulanamadı'))
          : left.offer.serviceName
      const rightValue =
        sort.key === 'provider'
          ? (right.provider?.name ?? t('Doğrulanamadı'))
          : right.offer.serviceName
      return leftValue.localeCompare(rightValue, 'tr') * direction || left.index - right.index
    })
  }, [rows, sort])

  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }))
  }

  return (
    <>
      <p className="data-table-scroll__hint" id="offer-table-scroll-hint">
        {t('Tabloyu yatay kaydırın; sağlayıcı sütunu sabit kalır.')}
      </p>
      <div
        className="data-table-scroll data-table-scroll--offers"
        role="region"
        aria-label={t('Servis karşılaştırma tablosu')}
        aria-describedby="offer-table-scroll-hint"
        tabIndex={0}
      >
        <table className="data-table comparison-table">
          <caption>{t('Servis karşılaştırması')}</caption>
          <thead>
            <tr>
              <SortHeader
                label={t('Sağlayıcı')}
                buttonLabel={t('Sağlayıcıya göre sırala')}
                sortKey="provider"
                sort={sort}
                onSort={handleSort}
              />
              <SortHeader
                label={t('Servis')}
                buttonLabel={t('Servise göre sırala')}
                sortKey="service"
                sort={sort}
                onSort={handleSort}
              />
              <th scope="col">{t('Bölge')}</th>
              <th scope="col">{t('Kapasite')}</th>
              <SortHeader
                label={t('Modellenen tutar')}
                buttonLabel={t('Modellenen kategori tutarına göre sırala')}
                sortKey="monthly"
                sort={sort}
                onSort={handleSort}
              />
              <th scope="col">{t('Durum ve ayrıntı')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(
              ({ offer, provider, estimate, coverage, effectiveEvidenceStatus, inScope }) => {
                const offerEvidenceStatus = health.statusByOfferId[offer.id] ?? 'invalid'
                const status =
                  inScope && coverage?.complete
                    ? (estimate?.status ?? effectiveEvidenceStatus)
                    : effectiveEvidenceStatus
                return (
                  <tr key={offer.id}>
                    <th className="data-table__sticky" scope="row">
                      {provider?.name ?? t('Doğrulanamadı')}
                    </th>
                    <td>
                      <strong>{offer.serviceName}</strong>
                      <span className="data-table__meta">
                        {offer.rankable ? t('Sıralanabilir') : t('Yalnızca bileşen')}
                      </span>
                    </td>
                    <td>{regionText(offer, providers)}</td>
                    <td>{capacityText(offer)}</td>
                    <td className="data-table__numeric">
                      {!inScope ? (
                        t('Senaryo kapsamı dışında')
                      ) : !coverage?.complete ? (
                        <>
                          <span className="data-table__line">{t('Kapasite yetersiz')}</span>
                          <span className="data-table__meta">
                            {t('Eksik: ')}
                            {coverage?.missingDimensions
                              .map((dimension) => dimensionLabels[dimension])
                              .join(', ')}
                          </span>
                        </>
                      ) : estimate?.status === 'invalid' || estimate?.totalUsd == null ? (
                        t('Doğrulanamadı')
                      ) : (
                        tf('{0}/ay', [monthlyUsdFormatter.format(estimate.totalUsd)])
                      )}
                    </td>
                    <td>
                      <span
                        className={`data-table__status data-table__status--${status}`}
                        data-status={status}
                      >
                        {statusLabels[status]}
                      </span>
                      <details className="comparison-table__evidence">
                        <summary aria-label={t('Teklif kanıtını göster')}>
                          {t('Ayrıntıları göster')}
                        </summary>
                        <dl className="comparison-table__evidence-list">
                          <div>
                            <dt>{t('Birim fiyat')}</dt>
                            <dd>
                              {offerEvidenceStatus === 'invalid' || offer.prices.length === 0
                                ? t('Doğrulanamadı')
                                : offer.prices.map((component, index) => (
                                    <span
                                      className="data-table__line"
                                      key={`${component.kind}-${index}`}
                                    >
                                      {priceText(component, offer, usableExchangeRates, sources)}
                                    </span>
                                  ))}
                            </dd>
                          </div>
                          <div>
                            <dt>{t('Ücretsiz kota')}</dt>
                            <dd>{quotaText(offer, freeTiers).join(' · ')}</dd>
                          </div>
                          <div>
                            <dt>{t('Trafik')}</dt>
                            <dd>
                              {trafficText(
                                offer,
                                offerEvidenceStatus,
                                usableExchangeRates,
                                sources,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{t('Doğrulama')}</dt>
                            <dd>
                              <time dateTime={offer.verifiedAt}>{offer.verifiedAt}</time>
                            </dd>
                          </div>
                        </dl>
                        <section aria-label={t('Kapsam ve kaynak kanıtı')}>
                          {offer.notes.length === 0 ? (
                            <p>{t('Ek kapsam notu yok.')}</p>
                          ) : (
                            offer.notes.map((note) => <p key={note}>{note}</p>)
                          )}
                          {offer.sourceIds.map((sourceId) => (
                            <SourceLink key={sourceId} sourceId={sourceId} sources={sources} />
                          ))}
                        </section>
                      </details>
                    </td>
                  </tr>
                )
              },
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
