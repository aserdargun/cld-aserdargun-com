import { describe, expect, it } from 'vitest'
import { providerIds, serviceCategories } from '../domain/catalog'
import { estimateProvider, rankProviderEstimates } from '../domain/ranking'
import { getCatalogHealth, loadCatalog } from './catalog'
import { catalogSchema, freeTierSchema, offerSchema, priceComponentSchema, providerSchema } from './schemas'

const sourceBackedOffer = {
  id: 'source-backed-offer',
  providerId: 'azure' as const,
  serviceName: 'Example compute',
  category: 'compute' as const,
  rankable: true,
  region: 'westeurope',
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

  it('rejects a zero monthly cap', () => {
    const result = priceComponentSchema.safeParse({
      kind: 'outbound-gb',
      price: 0.1,
      currency: 'USD',
      includedQuantity: 0,
      monthlyCap: 0,
    })

    expect(result.success).toBe(false)
  })

  it('requires every offer to declare whether it is rankable', () => {
    const withoutRankability: Partial<typeof sourceBackedOffer> = { ...sourceBackedOffer }
    delete withoutRankability.rankable

    expect(offerSchema.safeParse(withoutRankability).success).toBe(false)
  })

  it('rejects an uncorroborated unlimited outbound capacity claim', () => {
    expect(offerSchema.safeParse({
      ...sourceBackedOffer,
      category: 'cdn-network',
      specs: { outboundGbUnlimited: true },
    }).success).toBe(false)
  })

  it('accepts an explicitly scoped global provider region without a fabricated country', () => {
    const catalog = loadCatalog()
    const cloudflare = catalog.providers.find((provider) => provider.id === 'cloudflare')
    if (!cloudflare) throw new Error('Seeded Cloudflare provider is required for this test')

    expect(providerSchema.safeParse({
      ...cloudflare,
      regions: [{ id: 'global', name: 'Global edge network', countryCode: null, scope: 'global', sourceId: 'cloudflare-network' }],
    }).success).toBe(true)
  })

  it('rejects a provider without any supported regions', () => {
    const catalog = loadCatalog()
    const azure = catalog.providers.find((provider) => provider.id === 'azure')
    if (!azure) throw new Error('Seeded Azure provider is required for this test')

    expect(providerSchema.safeParse({ ...azure, regions: [] }).success).toBe(false)
  })

  it('accepts explicit offer and component applicability on a free tier', () => {
    const catalog = loadCatalog()
    const freeTier = catalog.freeTiers[0]
    const compatibleOffer = catalog.offers.find(
      (offer) => offer.providerId === freeTier?.providerId && offer.category === freeTier.category,
    )
    if (!freeTier || !compatibleOffer) throw new Error('Seeded compatible free tier and offer are required')

    expect(freeTierSchema.safeParse({
      ...freeTier,
      compatibleOfferIds: [compatibleOffer.id],
      compatiblePriceKinds: [compatibleOffer.prices[0]!.kind],
    }).success).toBe(true)
  })

  it('rejects free-tier applicability across providers, categories, or missing components', () => {
    const catalog = loadCatalog()
    const freeTierIndex = catalog.freeTiers.findIndex((tier) => tier.id === 'azure-functions-flex-executions')
    if (freeTierIndex < 0) throw new Error('Seeded Azure Functions free tier is required')
    const freeTier = catalog.freeTiers[freeTierIndex]!
    const invalidTiers = [
      { ...freeTier, compatibleOfferIds: ['gcp-cloud-run-requests-belgium'] },
      { ...freeTier, compatibleOfferIds: ['azure-b2s-westeurope'] },
      { ...freeTier, compatiblePriceKinds: ['outbound-gb' as const] },
      { ...freeTier, compatibleOfferIds: [], compatiblePriceKinds: ['requests-million' as const] },
    ]

    for (const invalidTier of invalidTiers) {
      const freeTiers = [...catalog.freeTiers]
      freeTiers[freeTierIndex] = invalidTier
      expect(catalogSchema.safeParse({ ...catalog, freeTiers }).success).toBe(false)
    }
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
          { ...azure, regions: [{ id: 'test-region', name: 'Test region', countryCode: 'TR', scope: 'regional', sourceId: 'missing-region-source' }] },
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
    expect(health.statusByExchangeRateId).toEqual({ 'test-rate': 'invalid' })
    expect(health.invalidCount).toBe(2)
  })

  it('keeps an invalid exchange-rate source from pricing or ranking EUR offers', () => {
    const catalog = loadCatalog()
    const parsed = loadCatalog({
      ...catalog,
      exchangeRates: catalog.exchangeRates.map((rate) => ({
        ...rate,
        sourceId: 'missing-ecb-source',
      })),
    })
    const health = getCatalogHealth(parsed, new Date('2026-08-14T00:00:00Z'))
    const computeOnly = {
      ...catalog.scenarios.find((scenario) => scenario.id === 'small-web-app')!,
      requiredCategories: ['compute' as const],
      coverageByCategory: { compute: ['hoursPerMonth' as const, 'vcpu' as const, 'ramGb' as const] },
      storageGb: 0,
      outboundGb: 0,
    }
    const context = {
      exchangeRates: parsed.exchangeRates,
      freeTiers: parsed.freeTiers,
      statusByOfferId: health.statusByOfferId,
      statusByFreeTierId: health.statusByFreeTierId,
      statusByExchangeRateId: health.statusByExchangeRateId,
    }
    const hetzner = estimateProvider('hetzner', parsed.offers, computeOnly, context)
    const azure = estimateProvider('azure', parsed.offers, computeOnly, context)
    const ranked = rankProviderEstimates([hetzner, azure])

    expect(health.invalidReferences).toContain(
      `exchange-rate:${parsed.exchangeRates[0]!.id}:missing-ecb-source`,
    )
    expect(health.statusByExchangeRateId[parsed.exchangeRates[0]!.id]).toBe('invalid')
    expect(hetzner).toMatchObject({ totalUsd: null, status: 'invalid' })
    expect(hetzner.lineItems).toEqual([])
    expect(azure.totalUsd).not.toBeNull()
    expect(azure.status).toBe('current')
    expect(ranked.map((estimate) => [estimate.providerId, estimate.rank])).toEqual([
      ['azure', 'best-price'],
      ['hetzner', null],
    ])
  })

  it('also invalidates an exchange rate backed by the wrong source owner or kind', () => {
    const catalog = loadCatalog()
    const rate = { ...catalog.exchangeRates[0]!, sourceId: 'azure-purchase-methods' }
    const parsed = loadCatalog({ ...catalog, exchangeRates: [rate] })
    const health = getCatalogHealth(parsed, new Date('2026-08-14T00:00:00Z'))

    expect(health.statusByExchangeRateId[rate.id]).toBe('invalid')
    expect(health.invalidReferences).toContain(`exchange-rate:${rate.id}:azure-purchase-methods`)
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

  it('loads provider evidence defects without invalidating unrelated offer data', () => {
    const catalog = loadCatalog()
    const azure = catalog.providers.find((provider) => provider.id === 'azure')!
    const parsed = loadCatalog({
      ...catalog,
      providers: [
        {
          ...azure,
          purchaseSourceIds: ['missing-purchase-source'],
          regions: [{ ...azure.regions[0]!, sourceId: 'missing-region-source' }],
        },
        ...catalog.providers.filter((provider) => provider.id !== 'azure'),
      ],
    })
    const health = getCatalogHealth(parsed, new Date('2026-08-14T00:00:00Z'))

    expect(health.invalidReferences).toEqual(expect.arrayContaining([
      'provider:azure:purchase:missing-purchase-source',
      `provider:azure:region:${azure.regions[0]!.id}:missing-region-source`,
    ]))
    expect(health.statusByOfferId['azure-b2s-westeurope']).toBe('current')
  })

  it('accepts a nonempty offer with a known official source', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      offers: [...catalog.offers, sourceBackedOffer],
    })

    expect(result.success).toBe(true)
  })

  it('loads a structurally valid catalog with an unknown source and isolates the affected offer', () => {
    const catalog = loadCatalog()
    const affectedFreeTier = { ...catalog.freeTiers[0]!, id: 'missing-source-free-tier', sourceIds: ['unknown-free-source'] }
    const invalidCheapOffer = {
      ...sourceBackedOffer,
      specs: { vcpu: 2, ramGb: 4 },
      prices: [{ kind: 'flat-month' as const, price: 0.01, currency: 'USD' as const, includedQuantity: 0 }],
      sourceIds: ['unknown-source'],
    }
    const mutated = {
      ...catalog,
      offers: [...catalog.offers, invalidCheapOffer],
      freeTiers: [...catalog.freeTiers, affectedFreeTier],
    }
    const parsed = loadCatalog(mutated)
    const health = getCatalogHealth(parsed, new Date('2026-08-14T00:00:00Z'))

    expect(parsed.offers).toHaveLength(catalog.offers.length + 1)
    expect(health.statusByOfferId['source-backed-offer']).toBe('invalid')
    expect(health.statusByFreeTierId['missing-source-free-tier']).toBe('invalid')
    expect(health.statusByOfferId[catalog.offers[0]!.id]).toBe('current')
    expect(health.invalidReferences).toContain('offer:source-backed-offer:unknown-source')
    expect(health.invalidReferences).toContain('free-tier:missing-source-free-tier:unknown-free-source')

    const computeOnly = {
      ...catalog.scenarios.find((scenario) => scenario.id === 'small-web-app')!,
      requiredCategories: ['compute' as const],
      coverageByCategory: { compute: ['hoursPerMonth' as const, 'vcpu' as const, 'ramGb' as const] },
      storageGb: 0,
      outboundGb: 0,
    }
    const estimate = estimateProvider('azure', parsed.offers, computeOnly, {
      exchangeRates: parsed.exchangeRates,
      freeTiers: parsed.freeTiers,
      statusByOfferId: health.statusByOfferId,
      statusByFreeTierId: health.statusByFreeTierId,
    })
    expect(estimate.lineItems.map((lineItem) => lineItem.offer.id)).not.toContain('source-backed-offer')
    expect(estimate.totalUsd).not.toBeNull()
  })

  it('rejects an offer whose region is not declared by its provider', () => {
    const catalog = loadCatalog()
    const result = catalogSchema.safeParse({
      ...catalog,
      offers: [{ ...catalog.offers[0]!, region: 'fabricated-region' }, ...catalog.offers.slice(1)],
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

  it('keeps unrelated official free tiers display-only', () => {
    const incompatibleIds = [
      'azure-vm-750-hours',
      'azure-container-registry-100gb',
      'gcp-cloud-run-functions-2m',
      'aws-sqs-million-requests',
      'oracle-block-volume-200gb',
    ]

    for (const freeTierId of incompatibleIds) {
      expect(catalog.freeTiers.find((freeTier) => freeTier.id === freeTierId)).toMatchObject({
        compatibleOfferIds: [],
        compatiblePriceKinds: [],
      })
    }
  })

  it('declares a nonempty modeled scope and typed coverage for every scenario', () => {
    for (const scenario of catalog.scenarios) {
      expect(scenario.scopeNote.trim()).not.toBe('')
      expect(Object.keys(scenario.coverageByCategory)).toEqual(expect.arrayContaining(scenario.requiredCategories))
    }
  })

  it('uses the current Flex Consumption grants instead of the legacy one-million Consumption grant', () => {
    const executions = catalog.freeTiers.find((tier) => tier.id === 'azure-functions-flex-executions')
    const executionTime = catalog.freeTiers.find((tier) => tier.id === 'azure-functions-flex-execution-time')

    expect(executions).toMatchObject({
      type: 'eligibility-limited',
      quota: { amount: 0.25, unit: 'million requests', period: 'month' },
      compatibleOfferIds: ['azure-functions-flex-requests-westeurope'],
      compatiblePriceKinds: ['requests-million'],
    })
    expect(executionTime).toMatchObject({
      quota: { amount: 100000, unit: 'GB-s', period: 'month' },
      compatibleOfferIds: [],
      compatiblePriceKinds: [],
    })
    expect(catalog.freeTiers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerId: 'azure',
        compatibleOfferIds: ['azure-functions-flex-requests-westeurope'],
        quota: expect.objectContaining({ amount: 1, unit: 'million requests' }),
      }),
    ]))
  })

  it('rejects an engine-applicable free tier whose quota unit maps to another price kind', () => {
    const catalog = loadCatalog()
    const freeTiers = catalog.freeTiers.map((freeTier) =>
      freeTier.id === 'azure-functions-flex-executions'
        ? { ...freeTier, quota: { ...freeTier.quota, unit: 'GB-s' } }
        : freeTier,
    )

    expect(catalogSchema.safeParse({ ...catalog, freeTiers }).success).toBe(false)
    expect(() => loadCatalog({ ...catalog, freeTiers })).toThrow()
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
