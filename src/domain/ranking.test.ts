import { describe, expect, it } from 'vitest'
import type { FreeTier, Offer, Scenario } from './catalog'
import type { PricingContext } from './pricing'
import { estimateProvider, rankProviderEstimates, type ProviderEstimate } from './ranking'

const scenario = (requiredCategories: Scenario['requiredCategories']): Scenario => ({
  id: 'small-web-app',
  name: 'Small web app',
  description: 'Test scenario',
  requiredCategories,
  hoursPerMonth: 730,
  vcpu: 2,
  ramGb: 4,
  storageGb: 100,
  outboundGb: 80,
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
    const estimate = estimateProvider(
      'azure',
      [
        offer({
          prices: [{ kind: 'outbound-gb', price: 0.1, currency: 'USD', includedQuantity: 50 }],
        }),
      ],
      scenario(['compute']),
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
      ['azure', null],
      ['gcp', 'best-price'],
      ['aws', 'second-price'],
    ])
  })
})
