import { describe, expect, it } from 'vitest'
import { getCatalogHealth, loadCatalog } from './catalog'
import { catalogSchema, priceComponentSchema } from './schemas'

const sourceBackedOffer = {
  id: 'source-backed-offer',
  providerId: 'azure' as const,
  serviceName: 'Example compute',
  category: 'compute' as const,
  region: 'example-region',
  specs: {},
  prices: [],
  sourceIds: ['azure-pricing-overview'],
  verifiedAt: '2026-08-13',
  notes: [],
}

describe('catalog schemas', () => {
  it('rejects an offer without an official source', () => {
    const result = catalogSchema.safeParse({
      providers: [],
      sources: [],
      exchangeRates: [],
      scenarios: [],
      freeTiers: [],
      offers: [{ id: 'bad-offer', sourceIds: [] }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects negative prices', () => {
    const result = priceComponentSchema.safeParse({
      kind: 'instance-hour',
      price: -1,
      currency: 'USD',
      includedQuantity: 0,
    })

    expect(result.success).toBe(false)
  })

  it('rejects a catalog missing a required provider', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      providers: catalog.providers.filter((provider) => provider.id !== 'azure'),
    })

    expect(result.success).toBe(false)
  })

  it('rejects a catalog with a duplicate controller-resolved scenario', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      scenarios: [
        ...catalog.scenarios.slice(0, -1),
        { ...catalog.scenarios[0]!, id: 'small-web-app' },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('rejects a catalog with a scenario outside the controller-resolved set', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      scenarios: [
        ...catalog.scenarios.slice(0, -1),
        { ...catalog.scenarios.at(-1)!, id: 'unapproved-scenario' },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('counts invalid provider-region and exchange-rate source references', () => {
    const catalog = loadCatalog()
    const azure = catalog.providers.find((provider) => provider.id === 'azure')
    if (!azure) throw new Error('Seeded Azure provider is required for this test')

    const health = getCatalogHealth(
      {
        ...catalog,
        providers: [
          { ...azure, regions: [{ id: 'test-region', name: 'Test region', countryCode: 'TR', sourceId: 'missing-region-source' }] },
          ...catalog.providers.filter((provider) => provider.id !== 'azure'),
        ],
        exchangeRates: [
          { id: 'test-rate', base: 'EUR', quote: 'USD', rate: 1.1, date: '2026-08-13', sourceId: 'missing-rate-source' },
        ],
      },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.invalidReferences).toEqual(
      expect.arrayContaining([
        'provider:azure:region:test-region:missing-region-source',
        'exchange-rate:test-rate:missing-rate-source',
      ]),
    )
    expect(health.invalidCount).toBe(2)
  })

  it('accepts a nonempty offer with a known official source', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      offers: [sourceBackedOffer],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a nonempty offer with an unknown source', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      offers: [{ ...sourceBackedOffer, sourceIds: ['unknown-source'] }],
    })

    expect(result.success).toBe(false)
  })

  it('marks a record verified exactly 30 days ago as current', () => {
    const catalog = loadCatalog()
    const offer = { ...sourceBackedOffer, id: 'offer-at-thirty-days', verifiedAt: '2026-07-14' }

    const health = getCatalogHealth(
      { ...catalog, offers: [offer] },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.statusByOfferId[offer.id]).toBe('current')
  })

  it('marks a record verified 31 days ago as stale', () => {
    const catalog = loadCatalog()
    const offer = { ...sourceBackedOffer, id: 'offer-at-thirty-one-days', verifiedAt: '2026-07-13' }

    const health = getCatalogHealth(
      { ...catalog, offers: [offer] },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.statusByOfferId[offer.id]).toBe('stale')
  })
})
