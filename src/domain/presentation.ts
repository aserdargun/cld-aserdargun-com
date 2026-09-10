import type {
  Catalog,
  Currency,
  ExchangeRate,
  PriceKind,
  Provider,
  Source,
  VerificationStatus,
} from './catalog'
import { selectEurUsdExchangeRate } from './pricing'
import {
  rankProviderEstimates,
  type ProviderEstimate,
  type RankedProviderEstimate,
} from './ranking'
import { hasExactSourceEvidence, sourceEvidenceIssue } from './sourceEvidence'

export interface CatalogStats {
  providerCount: number
  offerCount: number
  sourceCount: number
  latestVerificationDate: string
}

export interface PriceDelta {
  usd: number
  percent: number
}

export type ProviderRegion = Provider['regions'][number]

export type EstimateRegionSignal =
  | { status: 'verified'; regions: ProviderRegion[] }
  | { status: 'invalid'; regions: [] }

export interface EcbConversionEvidence {
  exchangeRate: ExchangeRate
  source: Source
}

export type EstimatePriceBasisSignal =
  | {
    status: 'verified'
    kind: 'public-list-usd' | 'public-list-ecb'
    currencies: Currency[]
    ecbEvidence: EcbConversionEvidence[]
  }
  | {
    status: 'invalid'
    kind: 'unverified'
    currencies: Currency[]
    ecbEvidence: []
  }

export interface EstimateEvidenceContext {
  exchangeRates: readonly ExchangeRate[]
  sources: readonly Source[]
  statusByExchangeRateId: Readonly<Record<string, VerificationStatus>>
}

export type EstimateEvidenceIssue =
  | 'estimate'
  | 'provider'
  | 'purchase-source'
  | 'region-source'
  | 'verification-date'
  | 'price-basis'

type VerifiedRegionSignal = Extract<EstimateRegionSignal, { status: 'verified' }>
type VerifiedPriceBasisSignal = Extract<EstimatePriceBasisSignal, { status: 'verified' }>

export type EligibleEstimateEvidence<T extends ProviderEstimate = ProviderEstimate> = {
  eligibility: 'eligible'
  estimate: T
  provider: Provider
  regionSignal: VerifiedRegionSignal
  latestVerificationDate: string
  priceBasis: VerifiedPriceBasisSignal
  issues: []
}

export type IneligibleEstimateEvidence<T extends ProviderEstimate = ProviderEstimate> = {
  eligibility: 'ineligible'
  estimate: T
  provider: Provider | null
  regionSignal: EstimateRegionSignal
  latestVerificationDate: string | null
  priceBasis: EstimatePriceBasisSignal
  issues: EstimateEvidenceIssue[]
}

export type EstimateEvidenceAssessment<T extends ProviderEstimate = ProviderEstimate> =
  | EligibleEstimateEvidence<T>
  | IneligibleEstimateEvidence<T>

export interface DecisionGroups {
  featured: EligibleEstimateEvidence<RankedProviderEstimate>[]
  remainingComparable: EligibleEstimateEvidence<RankedProviderEstimate>[]
  incomplete: IneligibleEstimateEvidence<RankedProviderEstimate>[]
}

export function getCatalogStats(catalog: Catalog): CatalogStats {
  const dates = [
    ...catalog.providers.map((item) => item.verifiedAt),
    ...catalog.offers.map((item) => item.verifiedAt),
    ...catalog.freeTiers.map((item) => item.verifiedAt),
  ]
  return {
    providerCount: catalog.providers.length,
    offerCount: catalog.offers.length,
    sourceCount: catalog.sources.length,
    latestVerificationDate: dates.reduce(
      (latest, date) => date > latest ? date : latest,
      dates[0] ?? '',
    ),
  }
}

export function priceDeltaFromBest(
  totalUsd: number | null,
  bestUsd: number | null,
): PriceDelta | null {
  if (totalUsd === null || bestUsd === null || bestUsd <= 0) return null
  const usd = totalUsd - bestUsd
  return { usd, percent: (usd / bestUsd) * 100 }
}

export function dominantCostKind(estimate: ProviderEstimate): PriceKind | null {
  const totals = new Map<PriceKind, number>()
  estimate.lineItems.forEach((offerEstimate) => {
    offerEstimate.lineItems.forEach((lineItem) => {
      if (lineItem.totalUsd === null) return
      totals.set(
        lineItem.component.kind,
        (totals.get(lineItem.component.kind) ?? 0) + lineItem.totalUsd,
      )
    })
  })
  return [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function hasCurrentEstimateEvidence(estimate: ProviderEstimate): boolean {
  return estimate.status === 'current' &&
    estimate.totalUsd !== null && Number.isFinite(estimate.totalUsd) &&
    estimate.missingCategories.length === 0 &&
    estimate.missingDimensions.length === 0 &&
    estimate.lineItems.length > 0 &&
    estimate.lineItems.every((offerEstimate) =>
      offerEstimate.status === 'current' &&
      offerEstimate.totalUsd !== null && Number.isFinite(offerEstimate.totalUsd) &&
      offerEstimate.offer.providerId === estimate.providerId)
}

export function regionsUsedByEstimate(
  estimate: ProviderEstimate,
  provider: Provider,
  sources: readonly Source[],
): EstimateRegionSignal {
  return regionsUsedByEstimateFromSources(
    estimate,
    provider,
    new Map(sources.map((source) => [source.id, source])),
  )
}

function regionsUsedByEstimateFromSources(
  estimate: ProviderEstimate,
  provider: Provider,
  sourcesById: ReadonlyMap<string, Source>,
): EstimateRegionSignal {
  if (provider.id !== estimate.providerId || !hasCurrentEstimateEvidence(estimate)) {
    return { status: 'invalid', regions: [] }
  }

  const regionIds = [...new Set(estimate.lineItems.map(({ offer }) => offer.region))]
  const regions = regionIds.map((regionId) => (
    provider.regions.find((region) => region.id === regionId)
  ))

  return regions.length > 0 &&
    regions.every((region): region is ProviderRegion => region !== undefined) &&
    hasExactSourceEvidence(
      regions.map((region) => region.sourceId),
      sourcesById,
      provider.id,
      'regions',
      true,
    )
    ? { status: 'verified', regions }
    : { status: 'invalid', regions: [] }
}

export function latestEstimateVerificationDate(
  estimate: ProviderEstimate,
): string | null {
  if (!hasCurrentEstimateEvidence(estimate)) return null

  const dates = estimate.lineItems.map(({ offer }) => offer.verifiedAt)
  if (dates.length === 0 || dates.some((date) => !isIsoDate(date))) return null
  return dates.reduce((latest, date) => date > latest ? date : latest, dates[0]!)
}

export function priceBasisForEstimate(
  estimate: ProviderEstimate,
  exchangeRates: readonly ExchangeRate[],
  sources: readonly Source[],
  statusByExchangeRateId: Readonly<Record<string, VerificationStatus>>,
): EstimatePriceBasisSignal {
  const currencies = [...new Set(estimate.lineItems.flatMap((offerEstimate) =>
    offerEstimate.lineItems.map((lineItem) => lineItem.component.currency),
  ))]
  const invalid = (): EstimatePriceBasisSignal => ({
    status: 'invalid',
    kind: 'unverified',
    currencies,
    ecbEvidence: [],
  })

  if (!hasCurrentEstimateEvidence(estimate) || currencies.length === 0) return invalid()
  if (estimate.lineItems.some((offerEstimate) =>
    !isIsoDate(offerEstimate.offer.verifiedAt) ||
    offerEstimate.lineItems.length === 0 ||
    offerEstimate.lineItems.some((lineItem) => lineItem.totalUsd === null))) {
    return invalid()
  }

  if (!currencies.includes('EUR')) {
    return {
      status: 'verified',
      kind: 'public-list-usd',
      currencies,
      ecbEvidence: [],
    }
  }

  const currentRates = exchangeRates.filter(
    (exchangeRate) => statusByExchangeRateId[exchangeRate.id] === 'current',
  )
  const evidenceByRateId = new Map<string, EcbConversionEvidence>()

  for (const offerEstimate of estimate.lineItems) {
    if (!offerEstimate.lineItems.some((lineItem) => lineItem.component.currency === 'EUR')) continue
    const exchangeRate = selectEurUsdExchangeRate(currentRates, offerEstimate.offer.verifiedAt)
    if (!exchangeRate || !isIsoDate(exchangeRate.date)) return invalid()
    const source = sources.find((candidate) => candidate.id === exchangeRate.sourceId)
    if (sourceEvidenceIssue(source, 'ecb', 'exchange-rate') !== null ||
      !source || !isIsoDate(source.accessedAt)) {
      return invalid()
    }
    evidenceByRateId.set(exchangeRate.id, { exchangeRate, source })
  }

  const ecbEvidence = [...evidenceByRateId.values()]
  return ecbEvidence.length > 0
    ? {
      status: 'verified',
      kind: 'public-list-ecb',
      currencies,
      ecbEvidence,
    }
    : invalid()
}

export function assessEstimateEvidence<T extends ProviderEstimate>(
  estimate: T,
  providers: readonly Provider[],
  context: EstimateEvidenceContext,
): EstimateEvidenceAssessment<T> {
  const aggregateEvidenceValid = hasCurrentEstimateEvidence(estimate)
  const provider = providers.find((candidate) => candidate.id === estimate.providerId) ?? null
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]))
  const purchaseEvidenceValid = provider !== null && hasExactSourceEvidence(
    provider.purchaseSourceIds,
    sourcesById,
    provider.id,
    'purchase',
    true,
  )
  const regionSignal = provider === null
    ? { status: 'invalid' as const, regions: [] as [] }
    : regionsUsedByEstimateFromSources(estimate, provider, sourcesById)
  const latestVerificationDate = latestEstimateVerificationDate(estimate)
  const priceBasis = priceBasisForEstimate(
    estimate,
    context.exchangeRates,
    context.sources,
    context.statusByExchangeRateId,
  )

  if (
    aggregateEvidenceValid &&
    provider !== null &&
    purchaseEvidenceValid &&
    regionSignal.status === 'verified' &&
    latestVerificationDate !== null &&
    priceBasis.status === 'verified'
  ) {
    return {
      eligibility: 'eligible',
      estimate,
      provider,
      regionSignal,
      latestVerificationDate,
      priceBasis,
      issues: [],
    }
  }

  const issues: EstimateEvidenceIssue[] = []
  if (!aggregateEvidenceValid) issues.push('estimate')
  if (provider === null) issues.push('provider')
  if (provider !== null && !purchaseEvidenceValid) issues.push('purchase-source')
  if (aggregateEvidenceValid && provider !== null && regionSignal.status === 'invalid') {
    issues.push('region-source')
  }
  if (aggregateEvidenceValid && latestVerificationDate === null) {
    issues.push('verification-date')
  }
  if (
    aggregateEvidenceValid &&
    latestVerificationDate !== null &&
    priceBasis.status === 'invalid'
  ) {
    issues.push('price-basis')
  }

  return {
    eligibility: 'ineligible',
    estimate,
    provider,
    regionSignal,
    latestVerificationDate,
    priceBasis,
    issues,
  }
}

export function isEstimateEvidenceEligible<T extends ProviderEstimate>(
  assessment: EstimateEvidenceAssessment<T>,
): assessment is EligibleEstimateEvidence<T> {
  return assessment.eligibility === 'eligible'
}

export function rankEvidenceEligibleEstimates(
  estimates: readonly ProviderEstimate[],
  providers: readonly Provider[],
  context: EstimateEvidenceContext,
): RankedProviderEstimate[] {
  const assessments = estimates.map((estimate) => (
    assessEstimateEvidence(estimate, providers, context)
  ))
  const rankedEligible = rankProviderEstimates(
    assessments
      .filter(isEstimateEvidenceEligible)
      .map((assessment) => assessment.estimate),
  )
  const ineligible: RankedProviderEstimate[] = assessments
    .filter((assessment) => !isEstimateEvidenceEligible(assessment))
    .map(({ estimate }) => ({ ...estimate, rank: null }))

  return [...rankedEligible, ...ineligible]
}

export function partitionDecisionEstimates(
  estimates: readonly RankedProviderEstimate[],
  providers: readonly Provider[],
  context: EstimateEvidenceContext,
): DecisionGroups {
  const assessments = estimates.map((estimate) => (
    assessEstimateEvidence(estimate, providers, context)
  ))
  const comparable = assessments.filter(isEstimateEvidenceEligible)
  const incomplete = assessments.filter(
    (assessment): assessment is IneligibleEstimateEvidence<RankedProviderEstimate> => (
      assessment.eligibility === 'ineligible'
    ),
  )

  return {
    featured: comparable.slice(0, 3),
    remainingComparable: comparable.slice(3),
    incomplete,
  }
}
