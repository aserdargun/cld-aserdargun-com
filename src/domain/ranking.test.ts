import { describe, expect, it } from 'vitest'
import type { FreeTier, Offer, Scenario } from './catalog'
import type { PricingContext } from './pricing'
import { estimateProvider, rankProviderEstimates, type ProviderEstimate } from './ranking'

const scenario = (requiredCategories: Scenario['requiredCategories']): Scenario => ({
  id: 'small-web-app',
  name: 'Small web app',
  description: 'Test scenario',
  scopeNote: 'Test scope.',
  requiredCategories,
  coverageByCategory: Object.fromEntries(requiredCategories.map((category) => [category, category === 'compute'
    ? ['hoursPerMonth', 'vcpu', 'ramGb']
    : category === 'object-storage'
      ? ['storageGb']
      : category === 'cdn-network'
        ? ['outboundGb']
        : []])),
  hoursPerMonth: requiredCategories.includes('compute') ? 730 : 0,
  vcpu: requiredCategories.includes('compute') ? 2 : 0,
  ramGb: requiredCategories.includes('compute') ? 4 : 0,
  storageGb: requiredCategories.includes('object-storage') ? 100 : 0,
  outboundGb: requiredCategories.includes('cdn-network') ? 80 : 0,
  requestsMillion: 0,
  databaseGb: 0,
  gpuHours: 0,
  gpuVramGb: 0,
})

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'azure-compute',
  providerId: 'azure',
  serviceName: 'Test compute',
  category: 'compute',
  rankable: true,
  region: 'westeurope',
  specs: { vcpu: 2, ramGb: 4 },
  prices: [{ kind: 'flat-month', price: 10, currency: 'USD', includedQuantity: 0 }],
  sourceIds: ['test-source'],
  verifiedAt: '2026-08-10',
  notes: [],
  ...overrides,
})

const freeTier = (): FreeTier => ({
  id: 'outbound-quota',
  providerId: 'azure',
  serviceName: 'Traffic quota',
  category: 'compute',
  compatibleOfferIds: ['azure-compute'],
  compatiblePriceKinds: ['outbound-gb'],
  type: 'always-free',
  quota: { amount: 20, unit: 'outbound-gb', period: 'month' },
  durationMonths: null,
  eligibilityNote: 'Eligible test account',
  overageNote: 'Charged after quota',
  automaticChargeNote: 'No automatic charge',
  sourceIds: ['test-source'],
  verifiedAt: '2026-08-10',
})

const context = (): PricingContext => ({
  exchangeRates: [],
  freeTiers: [],
  statusByOfferId: {
    'azure-compute': 'current',
    undersized: 'current',
    suitable: 'current',
    'more-expensive': 'current',
    'storage-offer': 'current',
    'small-storage-bundle': 'current',
    'elastic-storage': 'current',
    'small-cdn-bundle': 'current',
    'uncorroborated-unlimited-cdn-plan': 'current',
    'component-only': 'current',
  },
})

const providerEstimate = (
  providerId: ProviderEstimate['providerId'],
  totalUsd: number | null,
  status: ProviderEstimate['status'] = 'current',
): ProviderEstimate => ({
  providerId,
  totalUsd,
  subtotalBeforeFreeTierUsd: totalUsd,
  lineItems: [],
  missingCategories: totalUsd === null ? ['compute'] : [],
  missingDimensions: [],
  status,
})

describe('estimateProvider', () => {
  it('selects the lowest eligible offer that meets the requested compute capacity', () => {
    const estimate = estimateProvider(
      'azure',
      [
        offer({ id: 'undersized', specs: { vcpu: 1, ramGb: 4 }, prices: [{ kind: 'flat-month', price: 1, currency: 'USD', includedQuantity: 0 }] }),
        offer({ id: 'suitable', prices: [{ kind: 'flat-month', price: 10, currency: 'USD', includedQuantity: 0 }] }),
        offer({ id: 'more-expensive', prices: [{ kind: 'flat-month', price: 12, currency: 'USD', includedQuantity: 0 }] }),
      ],
      scenario(['compute']),
      context(),
    )

    expect(estimate.lineItems.map((lineItem) => lineItem.offer.id)).toEqual(['suitable'])
    expect(estimate.totalUsd).toBe(10)
  })

  it('marks a provider bundle incomplete when a required category has no valid offer', () => {
    const estimate = estimateProvider('azure', [offer()], scenario(['compute', 'object-storage']), context())

    expect(estimate.missingCategories).toEqual(['object-storage'])
    expect(estimate.totalUsd).toBeNull()
    expect(estimate.subtotalBeforeFreeTierUsd).toBeNull()
  })

  it('keeps traffic-included and free-adjusted totals separate in a provider bundle', () => {
    const trafficScenario = scenario(['compute'])
    trafficScenario.hoursPerMonth = 0
    trafficScenario.vcpu = 0
    trafficScenario.ramGb = 0
    trafficScenario.outboundGb = 80
    trafficScenario.coverageByCategory.compute = ['outboundGb']
    const estimate = estimateProvider(
      'azure',
      [
        offer({
          prices: [{ kind: 'outbound-gb', price: 0.1, currency: 'USD', includedQuantity: 50 }],
        }),
      ],
      trafficScenario,
      {
        ...context(),
        freeTiers: [freeTier()],
        eligibleFreeTierIds: ['outbound-quota'],
        statusByFreeTierId: { 'outbound-quota': 'current' },
      },
    )

    expect(estimate.subtotalBeforeFreeTierUsd).toBe(3)
    expect(estimate.totalUsd).toBe(1)
  })

  it('leaves a price-less required category incomplete instead of selecting it at zero cost', () => {
    const estimate = estimateProvider('azure', [offer({ prices: [] })], scenario(['compute']), context())

    expect(estimate.missingCategories).toEqual(['compute'])
    expect(estimate.totalUsd).toBeNull()
  })

  it('does not require compute specs from an object-storage offer', () => {
    const estimate = estimateProvider(
      'azure',
      [
        offer({
          id: 'storage-offer',
          category: 'object-storage',
          specs: {},
          prices: [{ kind: 'storage-gb-month', price: 0.05, currency: 'USD', includedQuantity: 0 }],
        }),
      ],
      scenario(['object-storage']),
      context(),
    )

    expect(estimate.lineItems.map((lineItem) => lineItem.offer.id)).toEqual(['storage-offer'])
    expect(estimate.totalUsd).toBe(5)
  })

  it('rejects a flat object-storage bundle below the scenario storage requirement', () => {
    const estimate = estimateProvider(
      'azure',
      [offer({
        id: 'small-storage-bundle',
        category: 'object-storage',
        specs: { storageGb: 5 },
        prices: [{ kind: 'flat-month', price: 1, currency: 'USD', includedQuantity: 0 }],
      })],
      scenario(['object-storage']),
      context(),
    )

    expect(estimate.missingCategories).toEqual(['object-storage'])
    expect(estimate.totalUsd).toBeNull()
  })

  it('lets usage-priced object storage scale beyond a finite bundled capacity', () => {
    const estimate = estimateProvider(
      'azure',
      [offer({
        id: 'elastic-storage',
        category: 'object-storage',
        specs: {},
        prices: [{ kind: 'storage-gb-month', price: 0.05, currency: 'USD', includedQuantity: 0 }],
      })],
      scenario(['object-storage']),
      context(),
    )

    expect(estimate.lineItems.map((lineItem) => lineItem.offer.id)).toEqual(['elastic-storage'])
    expect(estimate.totalUsd).toBe(5)
  })

  it('rejects a flat CDN bundle below the scenario outbound requirement', () => {
    const estimate = estimateProvider(
      'azure',
      [offer({
        id: 'small-cdn-bundle',
        category: 'cdn-network',
        specs: { outboundGb: 50 },
        prices: [{ kind: 'flat-month', price: 2.5, currency: 'USD', includedQuantity: 0 }],
      })],
      scenario(['cdn-network']),
      context(),
    )

    expect(estimate.missingCategories).toEqual(['cdn-network'])
    expect(estimate.totalUsd).toBeNull()
  })

  it('rejects a flat CDN plan whose unbounded boolean lacks finite capacity', () => {
    const estimate = estimateProvider(
      'azure',
      [offer({
        id: 'uncorroborated-unlimited-cdn-plan',
        category: 'cdn-network',
        specs: { outboundGbUnlimited: true } as Offer['specs'],
        prices: [{ kind: 'flat-month', price: 25, currency: 'USD', includedQuantity: 0 }],
      })],
      scenario(['cdn-network']),
      context(),
    )

    expect(estimate.missingCategories).toEqual(['cdn-network'])
    expect(estimate.totalUsd).toBeNull()
  })

  it('never lets a component-only offer complete a scenario', () => {
    const estimate = estimateProvider(
      'azure',
      [offer({ id: 'component-only', rankable: false, prices: [{ kind: 'flat-month', price: 1, currency: 'USD', includedQuantity: 0 }] })],
      scenario(['compute']),
      context(),
    )

    expect(estimate.missingCategories).toEqual(['compute'])
    expect(estimate.totalUsd).toBeNull()
  })

  it('prefers a qualifying current offer over a cheaper stale offer', () => {
    const estimate = estimateProvider(
      'azure',
      [
        offer({ id: 'stale-cheap', prices: [{ kind: 'flat-month', price: 1, currency: 'USD', includedQuantity: 0 }] }),
        offer({ id: 'current-cost', prices: [{ kind: 'flat-month', price: 10, currency: 'USD', includedQuantity: 0 }] }),
      ],
      scenario(['compute']),
      {
        ...context(),
        statusByOfferId: { 'stale-cheap': 'stale', 'current-cost': 'current' },
      },
    )

    expect(estimate.lineItems.map((item) => item.offer.id)).toEqual(['current-cost'])
    expect(estimate.status).toBe('current')
  })

  it('fails closed with explicit dimensions when edited usage lacks coverage', () => {
    const edited = scenario(['compute'])
    edited.storageGb = 100
    const estimate = estimateProvider('azure', [offer()], edited, context())

    expect(estimate.totalUsd).toBeNull()
    expect(estimate.missingDimensions).toContain('storageGb')
  })
})

describe('rankProviderEstimates', () => {
  it('places complete current estimates ahead of incomplete estimates and sorts them by total', () => {
    const ranked = rankProviderEstimates([
      providerEstimate('azure', 5),
      providerEstimate('gcp', 3),
      providerEstimate('aws', null),
    ])

    expect(ranked.map((estimate) => estimate.providerId)).toEqual(['gcp', 'azure', 'aws'])
    expect(ranked.map((estimate) => estimate.rank)).toEqual(['best-price', 'second-price', null])
  })

  it('does not award a cheapest badge to a stale estimate', () => {
    const ranked = rankProviderEstimates([
      providerEstimate('azure', 1, 'stale'),
      providerEstimate('gcp', 2),
      providerEstimate('aws', 3),
    ])

    expect(ranked.map((estimate) => [estimate.providerId, estimate.rank])).toEqual([
      ['gcp', 'best-price'],
      ['aws', 'second-price'],
      ['azure', null],
    ])
  })
})
