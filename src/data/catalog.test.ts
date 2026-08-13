import { describe, expect, it } from 'vitest'
import { getCatalogHealth, loadCatalog } from './catalog'
import { catalogSchema, priceComponentSchema } from './schemas'

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

  it('loads the seeded catalog with every source foreign key resolved', () => {
    const catalog = loadCatalog()
    const sourceIds = new Set(catalog.sources.map((source) => source.id))
    const references = [
      ...catalog.providers.flatMap((provider) => provider.regions.map((region) => region.sourceId)),
      ...catalog.offers.flatMap((offer) => offer.sourceIds),
      ...catalog.freeTiers.flatMap((freeTier) => freeTier.sourceIds),
      ...catalog.exchangeRates.map((exchangeRate) => exchangeRate.sourceId),
    ]

    expect(references.every((sourceId) => sourceIds.has(sourceId))).toBe(true)
  })

  it('marks a record verified exactly 30 days ago as current', () => {
    const catalog = loadCatalog()
    const offer = {
      id: 'offer-at-thirty-days',
      providerId: 'azure' as const,
      serviceName: 'Example compute',
      category: 'compute' as const,
      region: 'example-region',
      specs: {},
      prices: [],
      sourceIds: ['azure-pricing-overview'],
      verifiedAt: '2026-07-14',
      notes: [],
    }

    const health = getCatalogHealth(
      { ...catalog, offers: [offer] },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.statusByOfferId[offer.id]).toBe('current')
  })

  it('marks a record verified 31 days ago as stale', () => {
    const catalog = loadCatalog()
    const offer = {
      id: 'offer-at-thirty-one-days',
      providerId: 'azure' as const,
      serviceName: 'Example compute',
      category: 'compute' as const,
      region: 'example-region',
      specs: {},
      prices: [],
      sourceIds: ['azure-pricing-overview'],
      verifiedAt: '2026-07-13',
      notes: [],
    }

    const health = getCatalogHealth(
      { ...catalog, offers: [offer] },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.statusByOfferId[offer.id]).toBe('stale')
  })
})
