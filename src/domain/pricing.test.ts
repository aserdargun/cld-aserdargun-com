import { describe, expect, it } from 'vitest'
import type { FreeTier, Offer, Scenario } from './catalog'
import { convertToUsd, estimateOffer, type PricingContext } from './pricing'

const webScenario = (): Scenario => ({
  id: 'small-web-app',
  name: 'Small web app',
  description: 'Test scenario',
  requiredCategories: ['compute'],
  hoursPerMonth: 730,
  vcpu: 1,
  ramGb: 1,
  storageGb: 100,
  outboundGb: 80,
  requestsMillion: 2,
  databaseGb: 20,
  gpuHours: 0,
  gpuVramGb: 0,
})

const offer = (prices: Offer['prices'], verifiedAt = '2026-08-10'): Offer => ({
  id: 'test-offer',
  providerId: 'azure',
  serviceName: 'Test service',
  category: 'compute',
  rankable: true,
  region: 'westeurope',
  specs: { vcpu: 2, ramGb: 4 },
  prices,
  sourceIds: ['test-source'],
  verifiedAt,
  notes: [],
})

const freeTier = (overrides: Partial<FreeTier> = {}): FreeTier => ({
  id: 'test-free-tier',
  providerId: 'azure',
  serviceName: 'Test free tier',
  category: 'compute',
  compatibleOfferIds: ['test-offer'],
  compatiblePriceKinds: ['requests-million'],
  type: 'always-free',
  quota: { amount: 1, unit: 'million requests', period: 'month' },
  durationMonths: null,
  eligibilityNote: 'Eligible test account',
  overageNote: 'Charged after quota',
  automaticChargeNote: 'No automatic charge',
  sourceIds: ['test-source'],
  verifiedAt: '2026-08-10',
  ...overrides,
})

const emptyContext = (): PricingContext => ({
  exchangeRates: [],
  freeTiers: [],
  statusByOfferId: { 'test-offer': 'current' },
})

describe('convertToUsd', () => {
  it('converts EUR with the dated ECB rate', () => {
    expect(convertToUsd(10, 'EUR', [{ base: 'EUR', quote: 'USD', rate: 1.1 }])).toEqual({
      amountUsd: 11,
      converted: true,
    })
  })

  it('uses the latest rate available on the offer verification date', () => {
    expect(
      convertToUsd(
        10,
        'EUR',
        [
          { base: 'EUR', quote: 'USD', rate: 1.05, date: '2026-08-08' },
          { base: 'EUR', quote: 'USD', rate: 1.2, date: '2026-08-12' },
          { base: 'EUR', quote: 'USD', rate: 1.1, date: '2026-08-10' },
        ],
        '2026-08-10',
      ),
    ).toEqual({ amountUsd: 11, converted: true })
  })

  it('does not invent USD when the rate is missing', () => {
    expect(convertToUsd(10, 'EUR', [])).toEqual({ amountUsd: null, converted: false })
  })

  it('rejects an undated EUR rate when estimating a dated offer', () => {
    expect(convertToUsd(10, 'EUR', [{ base: 'EUR', quote: 'USD', rate: 1.1 }], '2026-08-10')).toEqual({
      amountUsd: null,
      converted: false,
    })
  })
})

describe('estimateOffer', () => {
  it('uses 730 hours for an always-on instance', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'instance-hour', price: 0.01, currency: 'USD', includedQuantity: 0 }]),
        webScenario(),
        emptyContext(),
      ).totalUsd,
    ).toBe(7.3)
  })

  it('does not charge storage included by an offer', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'storage-gb-month', price: 0.08, currency: 'USD', includedQuantity: 100 }]),
        webScenario(),
        emptyContext(),
      ).totalUsd,
    ).toBe(0)
  })

  it('does not charge outbound traffic included by an offer', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'outbound-gb', price: 0.09, currency: 'USD', includedQuantity: 80 }]),
        webScenario(),
        emptyContext(),
      ).totalUsd,
    ).toBe(0)
  })

  it('applies an eligible monthly free request quota to the matching category', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier()],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'current' },
      },
    )

    expect(estimate.subtotalBeforeFreeTierUsd).toBe(4)
    expect(estimate.freeTierSavingsUsd).toBe(2)
    expect(estimate.totalUsd).toBe(2)
  })

  it('does not apply a free quota without confirmed eligibility', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
        webScenario(),
        { ...emptyContext(), freeTiers: [freeTier()] },
      ).totalUsd,
    ).toBe(4)
  })

  it('does not apply a same-category free tier to an offer that is not explicitly compatible', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier({ compatibleOfferIds: ['different-offer'] })],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'current' },
      },
    )

    expect(estimate.freeTierSavingsUsd).toBe(0)
    expect(estimate.totalUsd).toBe(4)
  })

  it('keeps display-only credits and quotas from reducing engine estimates', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier({ compatibleOfferIds: [], compatiblePriceKinds: [] })],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'current' },
      },
    )

    expect(estimate.freeTierSavingsUsd).toBe(0)
    expect(estimate.totalUsd).toBe(4)
  })

  it('does not apply a compatible offer quota to an unlisted price component', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier({ compatiblePriceKinds: ['outbound-gb'] })],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'current' },
      },
    )

    expect(estimate.freeTierSavingsUsd).toBe(0)
    expect(estimate.totalUsd).toBe(4)
  })

  it('does not apply a time-limited quota after its duration', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
        webScenario(),
        {
          ...emptyContext(),
          freeTiers: [freeTier({ type: 'time-limited', durationMonths: 3 })],
          eligibleFreeTierIds: ['test-free-tier'],
          monthsSinceAccountCreation: 4,
        },
      ).totalUsd,
    ).toBe(4)
  })

  it('leaves a quota with an ambiguous unit unchanged', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'storage-gb-month', price: 0.08, currency: 'USD', includedQuantity: 0 }]),
        webScenario(),
        {
          ...emptyContext(),
          freeTiers: [freeTier({ quota: { amount: 100, unit: 'GB-month', period: 'month' } })],
          eligibleFreeTierIds: ['test-free-tier'],
        },
      ).totalUsd,
    ).toBe(8)
  })

  it('caps a component after calculating its monthly usage', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'outbound-gb', price: 0.1, currency: 'USD', includedQuantity: 0, monthlyCap: 5 }]),
        webScenario(),
        emptyContext(),
      ).totalUsd,
    ).toBe(5)
  })

  it('preserves engine precision instead of rounding line items', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'storage-gb-month', price: 0.333333, currency: 'USD', includedQuantity: 99 }]),
      webScenario(),
      emptyContext(),
    )

    expect(estimate.lineItems[0]?.totalUsd).toBe(0.333333)
    expect(estimate.totalUsd).toBe(0.333333)
  })

  it('marks an estimate incomplete when a required EUR conversion is unavailable', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'flat-month', price: 10, currency: 'EUR', includedQuantity: 0 }]),
      webScenario(),
      emptyContext(),
    )

    expect(estimate.totalUsd).toBeNull()
    expect(estimate.subtotalBeforeFreeTierUsd).toBeNull()
  })

  it('marks an offer without price components incomplete instead of free', () => {
    const estimate = estimateOffer(offer([]), webScenario(), emptyContext())

    expect(estimate.totalUsd).toBeNull()
    expect(estimate.subtotalBeforeFreeTierUsd).toBeNull()
  })

  it('allocates a matching free quota only once across repeated component kinds', () => {
    const estimate = estimateOffer(
      offer([
        { kind: 'requests-million', price: 1, currency: 'USD', includedQuantity: 0 },
        { kind: 'requests-million', price: 1, currency: 'USD', includedQuantity: 0 },
      ]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier()],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'current' },
      },
    )

    expect(estimate.freeTierSavingsUsd).toBe(1)
    expect(estimate.totalUsd).toBe(3)
  })

  it('does not apply an invalid free-tier record', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier()],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'invalid' },
      },
    )

    expect(estimate.freeTierSavingsUsd).toBe(0)
    expect(estimate.totalUsd).toBe(4)
  })

  it('marks an estimate stale when it uses a stale free-tier record', () => {
    const estimate = estimateOffer(
      offer([{ kind: 'requests-million', price: 2, currency: 'USD', includedQuantity: 0 }]),
      webScenario(),
      {
        ...emptyContext(),
        freeTiers: [freeTier()],
        eligibleFreeTierIds: ['test-free-tier'],
        statusByFreeTierId: { 'test-free-tier': 'stale' },
      },
    )

    expect(estimate.status).toBe('stale')
  })

  it('treats an offer without an explicit status as invalid', () => {
    expect(
      estimateOffer(
        offer([{ kind: 'flat-month', price: 10, currency: 'USD', includedQuantity: 0 }]),
        webScenario(),
        { exchangeRates: [], freeTiers: [] },
      ).status,
    ).toBe('invalid')
  })
})
