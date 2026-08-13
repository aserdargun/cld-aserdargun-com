import { describe, expect, it } from 'vitest'
import { providerIds, serviceCategories } from '../domain/catalog'
import { getCatalogHealth, loadCatalog } from './catalog'
import { catalogSchema, priceComponentSchema, providerSchema } from './schemas'

const sourceBackedOffer = {
  id: 'source-backed-offer',
  providerId: 'azure' as const,
  serviceName: 'Example compute',
  category: 'compute' as const,
  region: 'example-region',
  specs: {},
  prices: [],
  sourceIds: ['azure-retail-vm-b2s'],
  verifiedAt: '2026-08-13',
  notes: [],
}

describe('catalog schemas', () => {
  it('accepts explicit purchase evidence on a provider', () => {
    const catalog = loadCatalog()
    const provider = catalog.providers[0]
    if (!provider) throw new Error('A seeded provider is required for this test')

    expect(providerSchema.safeParse({ ...provider, purchaseSourceIds: ['official-purchase-source'] }).success).toBe(true)
  })

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

  it('counts invalid provider purchase-source references', () => {
    const catalog = loadCatalog()
    const azure = catalog.providers.find((provider) => provider.id === 'azure')
    if (!azure) throw new Error('Seeded Azure provider is required for this test')

    const health = getCatalogHealth(
      {
        ...catalog,
        providers: [
          { ...azure, purchaseSourceIds: ['missing-purchase-source'] },
          ...catalog.providers.filter((provider) => provider.id !== 'azure'),
        ],
      },
      new Date('2026-08-13T00:00:00Z'),
    )

    expect(health.invalidReferences).toContain('provider:azure:purchase:missing-purchase-source')
    expect(health.invalidCount).toBe(1)
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

describe('official catalog policy', () => {
  const catalog = loadCatalog()
  const freeTierCount = (providerId: (typeof providerIds)[number]) =>
    catalog.freeTiers.filter((freeTier) => freeTier.providerId === providerId).length

  it('contains exactly the approved providers', () => {
    expect(catalog.providers).toHaveLength(8)
    expect(new Set(catalog.providers.map((provider) => provider.id))).toEqual(new Set(providerIds))
  })

  it('meets the required free-tier minimums', () => {
    expect(freeTierCount('azure')).toBeGreaterThanOrEqual(6)
    expect(freeTierCount('gcp')).toBeGreaterThanOrEqual(6)
    expect(freeTierCount('aws')).toBeGreaterThanOrEqual(4)
    expect(freeTierCount('oracle')).toBeGreaterThanOrEqual(4)
  })

  it('backs every offer with an official source and a positive paid component', () => {
    expect(catalog.offers.every((offer) => offer.sourceIds.length > 0)).toBe(true)
    expect(catalog.offers.every((offer) => offer.prices.some((component) => component.price > 0))).toBe(true)
  })

  it('uses HTTPS for every source', () => {
    expect(catalog.sources.every((source) => new URL(source.url).protocol === 'https:')).toBe(true)
  })

  it('gives every provider an offer, an owned official source, and purchase evidence', () => {
    for (const provider of catalog.providers) {
      expect(catalog.offers.some((offer) => offer.providerId === provider.id)).toBe(true)
      expect(catalog.sources.some((source) => source.owner === provider.id)).toBe(true)
      expect(provider.purchaseSourceIds.length).toBeGreaterThan(0)
    }
  })

  it('covers every approved category for each major provider and two offers per alternative', () => {
    for (const providerId of ['azure', 'gcp', 'aws'] as const) {
      const categories = new Set(
        catalog.offers.filter((offer) => offer.providerId === providerId).map((offer) => offer.category),
      )
      expect(categories).toEqual(new Set(serviceCategories))
    }

    for (const providerId of ['hetzner', 'oracle', 'cloudflare', 'digitalocean', 'vultr'] as const) {
      expect(catalog.offers.filter((offer) => offer.providerId === providerId).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('uses provider-owned source records of the right kind for purchase and price claims', () => {
    const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]))

    for (const provider of catalog.providers) {
      for (const sourceId of provider.purchaseSourceIds) {
        expect(sourcesById.get(sourceId)).toMatchObject({ owner: provider.id, kind: 'purchase' })
      }
    }

    for (const offer of catalog.offers) {
      for (const sourceId of offer.sourceIds) {
        expect(sourcesById.get(sourceId)?.owner).toBe(offer.providerId)
      }
      expect(offer.notes.length).toBeGreaterThan(0)
    }
  })
})
