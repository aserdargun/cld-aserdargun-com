import { describe, expect, it } from 'vitest'
import { getCatalogHealth, getUsableExchangeRates, loadCatalog } from '../data/catalog'
import type {
  Currency,
  Offer,
  PriceComponent,
  Provider,
  VerificationStatus,
} from './catalog'
import type { OfferEstimate, PriceLineItemEstimate } from './pricing'
import { estimateProvider, type RankedProviderEstimate } from './ranking'
import {
  assessEstimateEvidence,
  dominantCostKind,
  getCatalogStats,
  partitionDecisionEstimates,
  priceDeltaFromBest,
  rankEvidenceEligibleEstimates,
} from './presentation'

const catalog = loadCatalog()
const currentExchangeRateStatuses = Object.fromEntries(
  catalog.exchangeRates.map((exchangeRate) => [exchangeRate.id, 'current' as const]),
)
const evidenceContext = {
  exchangeRates: catalog.exchangeRates,
  sources: catalog.sources,
  statusByExchangeRateId: currentExchangeRateStatuses,
}
const seededHealth = getCatalogHealth(catalog, new Date('2026-08-29T00:00:00.000Z'))
const seededPricingContext = {
  exchangeRates: getUsableExchangeRates(catalog, seededHealth),
  freeTiers: catalog.freeTiers,
  statusByOfferId: seededHealth.statusByOfferId,
  statusByFreeTierId: seededHealth.statusByFreeTierId,
  statusByExchangeRateId: seededHealth.statusByExchangeRateId,
}
const seededEvidenceContext = {
  exchangeRates: catalog.exchangeRates,
  sources: catalog.sources,
  statusByExchangeRateId: seededHealth.statusByExchangeRateId,
}

const defaultRegionByProvider: Record<Offer['providerId'], string> = {
  azure: 'westeurope',
  gcp: 'europe-west1',
  aws: 'eu-central-1',
  hetzner: 'nbg1',
  oracle: 'eu-frankfurt-1',
  cloudflare: 'global',
  digitalocean: 'fra1',
  vultr: 'fra',
}

interface AwsProvenanceMutation {
  label: string
  issue: 'purchase-source' | 'region-source'
  mutate: (provider: Provider) => void
}

const awsProvenanceMutations: AwsProvenanceMutation[] = [
  {
    label: 'used-region source has the wrong owner',
    issue: 'region-source',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'azure-regions'
    },
  },
  {
    label: 'used-region source has the wrong kind',
    issue: 'region-source',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'aws-turkey-purchase'
    },
  },
  {
    label: 'used-region source is missing',
    issue: 'region-source',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'missing-region-source'
    },
  },
  {
    label: 'purchase source has the wrong owner',
    issue: 'purchase-source',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['gcp-purchase-currency']
    },
  },
  {
    label: 'purchase source has the wrong kind',
    issue: 'purchase-source',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['aws-regions']
    },
  },
  {
    label: 'purchase source is missing',
    issue: 'purchase-source',
    mutate: (provider) => {
      provider.purchaseSourceIds = ['missing-purchase-source']
    },
  },
  {
    label: 'purchase evidence is empty',
    issue: 'purchase-source',
    mutate: (provider) => {
      provider.purchaseSourceIds = []
    },
  },
]

function providersWithAwsMutation(mutate: (provider: Provider) => void): Provider[] {
  const mutatedProviders = structuredClone(catalog.providers)
  const aws = mutatedProviders.find((provider) => provider.id === 'aws')
  if (!aws) throw new Error('Seeded AWS provider is required for provenance tests')
  mutate(aws)
  return mutatedProviders
}

function providerProvenanceSources(providerId: Provider['id']) {
  const provider = catalog.providers.find((candidate) => candidate.id === providerId)
  if (!provider) throw new Error(`Seeded ${providerId} provider is required for provenance tests`)
  const sourceIds = new Set([
    ...provider.purchaseSourceIds,
    ...provider.regions.map((region) => region.sourceId),
  ])
  return catalog.sources.filter((source) => sourceIds.has(source.id))
}

function offerEstimate(
  providerId: Offer['providerId'],
  totalUsd: number,
  {
    currency = 'USD',
    region = defaultRegionByProvider[providerId],
    verifiedAt = '2026-08-13',
    status = 'current',
    offerProviderId = providerId,
  }: {
    currency?: Currency
    region?: string
    verifiedAt?: string
    status?: VerificationStatus
    offerProviderId?: Offer['providerId']
  } = {},
): OfferEstimate {
  const component: PriceComponent = {
    kind: 'instance-hour',
    price: 0.02,
    currency,
    includedQuantity: 0,
  }
  const priceLine: PriceLineItemEstimate = {
    component,
    quantity: 730,
    includedQuantity: 0,
    freeTierQuantity: 0,
    subtotalBeforeFreeTierUsd: totalUsd,
    freeTierSavingsUsd: 0,
    totalUsd,
  }

  return {
    offer: {
      id: `${providerId}-${region}-${verifiedAt}`,
      providerId: offerProviderId,
      serviceName: `${providerId} test compute`,
      category: 'compute',
      rankable: true,
      region,
      specs: { vcpu: 2, ramGb: 4 },
      prices: [component],
      sourceIds: [`${providerId}-pricing-source`],
      verifiedAt,
      notes: [],
    },
    status,
    lineItems: [priceLine],
    subtotalBeforeFreeTierUsd: totalUsd,
    freeTierSavingsUsd: 0,
    totalUsd,
  }
}

function estimate(
  providerId: RankedProviderEstimate['providerId'],
  totalUsd: number | null,
  status: RankedProviderEstimate['status'] = 'current',
  options: {
    currency?: Currency
    region?: string
    verifiedAt?: string
    offerProviderId?: Offer['providerId']
    lineItems?: OfferEstimate[]
  } = {},
): RankedProviderEstimate {
  const lineItems = options.lineItems ?? (totalUsd === null ? [] : [
    offerEstimate(providerId, totalUsd, {
      currency: options.currency,
      region: options.region,
      verifiedAt: options.verifiedAt,
      status,
      offerProviderId: options.offerProviderId,
    }),
  ])

  return {
    providerId,
    totalUsd,
    subtotalBeforeFreeTierUsd: totalUsd,
    lineItems,
    missingCategories: totalUsd === null ? ['compute'] : [],
    missingDimensions: totalUsd === null ? ['hoursPerMonth'] : [],
    status,
    rank: null,
  }
}

describe('presentation models', () => {
  it('derives trust-band counts and the latest verification date', () => {
    expect(getCatalogStats(catalog)).toEqual({
      providerCount: 8,
      offerCount: 41,
      sourceCount: 66,
      latestVerificationDate: '2026-09-04',
    })
  })

  it('keeps only evidence-eligible estimates in the top three', () => {
    const groups = partitionDecisionEstimates([
      estimate('azure', 40),
      estimate('gcp', 50),
      estimate('aws', 60),
      estimate('hetzner', 70, 'current', { currency: 'EUR' }),
      estimate('oracle', null, 'invalid'),
    ], catalog.providers, evidenceContext)
    expect(groups.featured.map(({ estimate: item }) => item.providerId)).toEqual([
      'azure',
      'gcp',
      'aws',
    ])
    expect(groups.remainingComparable.map(({ estimate: item }) => item.providerId)).toEqual([
      'hetzner',
    ])
    expect(groups.incomplete.map(({ estimate: item }) => item.providerId)).toEqual(['oracle'])
  })

  it('gates invalid cheaper EUR evidence before ranking a valid USD estimate', () => {
    const ranked = rankEvidenceEligibleEstimates([
      estimate('hetzner', 10, 'current', { currency: 'EUR' }),
      estimate('azure', 20),
    ], catalog.providers, {
      exchangeRates: [],
      sources: [
        ...providerProvenanceSources('hetzner'),
        ...providerProvenanceSources('azure'),
      ],
      statusByExchangeRateId: {},
    })

    expect(ranked.map((item) => ({ providerId: item.providerId, rank: item.rank }))).toEqual([
      { providerId: 'azure', rank: 'best-price' },
      { providerId: 'hetzner', rank: null },
    ])
  })

  it('keeps valid EUR evidence eligible and selects only a rate on or before the offer date', () => {
    const ecbSource = catalog.sources.find((source) => source.id === 'ecb-daily-exr')!
    const assessment = assessEstimateEvidence(
      estimate('hetzner', 10, 'current', { currency: 'EUR', verifiedAt: '2026-08-13' }),
      catalog.providers,
      {
        exchangeRates: [
          {
            id: 'ecb-before-offer',
            base: 'EUR',
            quote: 'USD',
            rate: 1.1,
            date: '2026-08-12',
            sourceId: ecbSource.id,
          },
          {
            id: 'ecb-after-offer',
            base: 'EUR',
            quote: 'USD',
            rate: 1.2,
            date: '2026-08-14',
            sourceId: ecbSource.id,
          },
        ],
        sources: [ecbSource, ...providerProvenanceSources('hetzner')],
        statusByExchangeRateId: {
          'ecb-before-offer': 'current',
          'ecb-after-offer': 'current',
        },
      },
    )

    expect(assessment.eligibility).toBe('eligible')
    if (assessment.eligibility !== 'eligible') throw new Error('expected eligible evidence')
    expect(assessment.priceBasis.kind).toBe('public-list-ecb')
    expect(assessment.priceBasis.ecbEvidence.map(({ exchangeRate }) => exchangeRate.id)).toEqual([
      'ecb-before-offer',
    ])
  })

  it('keeps valid AWS purchase and used-region provenance eligible for ranking', () => {
    const aws = estimate('aws', 18)
    const assessment = assessEstimateEvidence(aws, catalog.providers, evidenceContext)
    const ranked = rankEvidenceEligibleEstimates(
      [aws, estimate('azure', 20)],
      catalog.providers,
      evidenceContext,
    )

    expect(assessment).toMatchObject({ eligibility: 'eligible', issues: [] })
    expect(ranked.map(({ providerId, rank }) => ({ providerId, rank }))).toEqual([
      { providerId: 'aws', rank: 'best-price' },
      { providerId: 'azure', rank: 'second-price' },
    ])
  })

  it('attributes all 12 seeded partial estimates only to the aggregate estimate root cause', () => {
    const partialAssessments = catalog.scenarios.flatMap((scenario) => (
      catalog.providers.map((provider) => {
        const providerEstimate = estimateProvider(
          provider.id,
          catalog.offers,
          scenario,
          seededPricingContext,
        )
        return {
          key: `${scenario.id}:${provider.id}`,
          assessment: assessEstimateEvidence(
            providerEstimate,
            catalog.providers,
            seededEvidenceContext,
          ),
        }
      })
    )).filter(({ assessment }) => (
      assessment.estimate.totalUsd === null && assessment.estimate.lineItems.length > 0
    ))

    expect(partialAssessments.map(({ key }) => key)).toEqual([
      'small-web-app:hetzner',
      'small-web-app:oracle',
      'small-web-app:cloudflare',
      'small-web-app:digitalocean',
      'small-web-app:vultr',
      'database-saas:digitalocean',
      'database-saas:vultr',
      'static-site:oracle',
      'static-site:cloudflare',
      'static-site:digitalocean',
      'static-site:vultr',
      'high-traffic:digitalocean',
    ])
    partialAssessments.forEach(({ assessment }) => {
      expect(assessment).toMatchObject({
        eligibility: 'ineligible',
        issues: ['estimate'],
      })
    })
  })

  it('attributes a stale numeric estimate only to the aggregate estimate root cause', () => {
    const assessment = assessEstimateEvidence(
      estimate('gcp', 12.5, 'stale'),
      catalog.providers,
      evidenceContext,
    )

    expect(assessment).toMatchObject({
      eligibility: 'ineligible',
      issues: ['estimate'],
    })
  })

  it.each(awsProvenanceMutations)(
    'gates AWS before ranking when $label',
    ({ mutate, issue }) => {
      const mutatedProviders = providersWithAwsMutation(mutate)
      const aws = estimate('aws', 18)
      const azure = estimate('azure', 20)
      const assessment = assessEstimateEvidence(aws, mutatedProviders, evidenceContext)
      const ranked = rankEvidenceEligibleEstimates(
        [aws, azure],
        mutatedProviders,
        evidenceContext,
      )
      const groups = partitionDecisionEstimates(ranked, mutatedProviders, evidenceContext)

      expect(assessment).toMatchObject({ eligibility: 'ineligible' })
      expect(assessment.issues).toContain(issue)
      expect(ranked.find((item) => item.providerId === 'aws')).toMatchObject({ rank: null })
      expect(ranked.find((item) => item.providerId === 'azure')).toMatchObject({
        rank: 'best-price',
      })
      expect(groups.featured.map(({ estimate: item }) => item.providerId)).toEqual(['azure'])
      expect(groups.incomplete.map(({ estimate: item }) => item.providerId)).toContain('aws')
    },
  )

  it('marks unknown regions, invalid dates, provider mismatch, and stale ECB evidence ineligible', () => {
    const unknownRegion = assessEstimateEvidence(
      estimate('aws', 18, 'current', { region: 'unknown-region' }),
      catalog.providers,
      evidenceContext,
    )
    const invalidDate = assessEstimateEvidence(
      estimate('aws', 18, 'current', { verifiedAt: 'not-a-date' }),
      catalog.providers,
      evidenceContext,
    )
    const providerMismatch = assessEstimateEvidence(
      estimate('azure', 18, 'current', { offerProviderId: 'gcp' }),
      catalog.providers,
      evidenceContext,
    )
    const staleEcb = assessEstimateEvidence(
      estimate('hetzner', 10, 'current', { currency: 'EUR' }),
      catalog.providers,
      {
        ...evidenceContext,
        statusByExchangeRateId: Object.fromEntries(
          catalog.exchangeRates.map((exchangeRate) => [exchangeRate.id, 'stale' as const]),
        ),
      },
    )

    expect(unknownRegion).toMatchObject({ eligibility: 'ineligible', issues: ['region-source'] })
    expect(invalidDate).toMatchObject({
      eligibility: 'ineligible',
      issues: ['verification-date'],
    })
    expect(providerMismatch).toMatchObject({ eligibility: 'ineligible', issues: ['estimate'] })
    expect(staleEcb).toMatchObject({ eligibility: 'ineligible', issues: ['price-basis'] })
  })

  it('calculates a transparent delta and never divides by zero', () => {
    const rawPercentage = (11 / 42) * 100
    const historicallyRoundedPercentage = 26.19047619047619

    expect(priceDeltaFromBest(53, 42)).toEqual({
      usd: 11,
      percent: rawPercentage,
    })
    expect(priceDeltaFromBest(53, 42)?.percent).not.toBe(historicallyRoundedPercentage)
    expect(priceDeltaFromBest(10, 0)).toBeNull()
    expect(priceDeltaFromBest(null, 42)).toBeNull()
  })

  it('returns no dominant kind when an estimate has no valid line total', () => {
    expect(dominantCostKind(estimate('azure', 10, 'current', { lineItems: [] }))).toBeNull()
  })
})
