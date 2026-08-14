import { describe, expect, it } from 'vitest'
import type { Catalog } from '../domain/catalog'
import { loadCatalog } from './catalog'
import { validateCatalog } from './validation'

function clonedCatalog(): Catalog {
  return structuredClone(loadCatalog())
}

describe('catalog validator policy', () => {
  it('accepts the official snapshot', () => {
    expect(validateCatalog(clonedCatalog())).toEqual([])
  })

  it('keeps missing source foreign keys as production validation failures', () => {
    const catalog = clonedCatalog()
    catalog.offers[0]!.sourceIds = ['missing-pricing-source']
    catalog.freeTiers[0]!.sourceIds = ['missing-free-source']

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      `offer ${catalog.offers[0]!.id} references missing source missing-pricing-source`,
      `free tier ${catalog.freeTiers[0]!.id} references missing source missing-free-source`,
      `catalog health reports invalid reference offer:${catalog.offers[0]!.id}:missing-pricing-source`,
      `catalog health reports invalid reference free-tier:${catalog.freeTiers[0]!.id}:missing-free-source`,
    ]))
  })

  it.each([
    ['offer', 'azure-b2s-westeurope', 'azure-purchase-methods'],
    ['offer', 'azure-b2s-westeurope', 'gcp-compute-pricing'],
    ['free tier', 'azure-functions-flex-executions', 'azure-retail-vm-b2s'],
    ['free tier', 'azure-functions-flex-executions', 'gcp-free-program'],
  ] as const)('rejects an existing source with the wrong owner or kind for a %s', (recordType, recordId, sourceId) => {
    const catalog = clonedCatalog()
    if (recordType === 'offer') {
      catalog.offers.find((offer) => offer.id === recordId)!.sourceIds = [sourceId]
    } else {
      catalog.freeTiers.find((freeTier) => freeTier.id === recordId)!.sourceIds = [sourceId]
    }

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      `${recordType} ${recordId} source ${sourceId} has wrong owner or kind`,
      `catalog health reports invalid reference ${recordType === 'offer' ? 'offer' : 'free-tier'}:${recordId}:${sourceId}:${sourceId.startsWith('gcp-') ? 'wrong-owner' : 'wrong-kind'}`,
    ]))
  })

  it('rejects existing purchase and region sources with mismatched evidence ownership or kind', () => {
    const catalog = clonedCatalog()
    const azure = catalog.providers.find((provider) => provider.id === 'azure')!
    azure.purchaseSourceIds = ['gcp-purchase-currency']
    azure.regions[0]!.sourceId = 'azure-purchase-methods'

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      'provider azure purchase source gcp-purchase-currency has wrong owner or kind',
      `provider azure region ${azure.regions[0]!.id} source has wrong owner or kind`,
      'catalog health reports invalid reference provider:azure:purchase:gcp-purchase-currency:wrong-owner',
      `catalog health reports invalid reference provider:azure:region:${azure.regions[0]!.id}:azure-purchase-methods:wrong-kind`,
    ]))
  })

  it('allows independently verified dates through the snapshot date and rejects future records', () => {
    const catalog = clonedCatalog()
    expect(validateCatalog(catalog)).toEqual([])

    catalog.sources[0]!.accessedAt = '2026-08-15'
    expect(validateCatalog(catalog)).toContain(
      `source ${catalog.sources[0]!.id} is dated after catalog snapshot 2026-08-14: 2026-08-15`,
    )
  })

  it('requires a nonempty deterministic region set and exact offer-region references', () => {
    const catalog = clonedCatalog()
    catalog.providers.find((provider) => provider.id === 'azure')!.regions = []
    catalog.offers.find((offer) => offer.providerId === 'gcp')!.region = 'fabricated-region'

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      'provider azure has no supported regions',
      expect.stringContaining('references undeclared region fabricated-region'),
    ]))
  })

  it('requires positive monthly caps and a dated usable ECB rate for every EUR offer', () => {
    const catalog = clonedCatalog()
    const hetzner = catalog.offers.find((offer) => offer.providerId === 'hetzner')!
    hetzner.prices[0]!.monthlyCap = 0
    catalog.exchangeRates = []

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      expect.stringContaining(`offer ${hetzner.id} has non-positive monthly cap`),
      expect.stringContaining(`offer ${hetzner.id} lacks a usable dated ECB EUR/USD rate`),
    ]))
  })

  it('validates explicit rankability and free-tier offer/component applicability', () => {
    const catalog = clonedCatalog()
    const freeTier = catalog.freeTiers.find((tier) => tier.id === 'azure-functions-flex-executions')!
    freeTier.compatibleOfferIds = ['gcp-cloud-run-requests-belgium']

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      expect.stringContaining(`free tier ${freeTier.id} incompatible offer gcp-cloud-run-requests-belgium`),
    ]))
  })

  it('rejects a free-tier quota unit that cannot fund its declared compatible price kind', () => {
    const catalog = clonedCatalog()
    const freeTier = catalog.freeTiers.find((tier) => tier.id === 'azure-functions-flex-executions')!
    freeTier.quota.unit = 'GB-s'

    expect(validateCatalog(catalog)).toContain(
      `free tier ${freeTier.id} quota unit GB-s does not map to compatible price kind requests-million`,
    )
  })

  it('requires every seeded scenario to have three complete current estimates except GPU, which requires two', () => {
    const catalog = clonedCatalog()
    catalog.offers.forEach((offer) => { offer.rankable = false })

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      'scenario small-web-app has 0 complete current estimates; requires 3',
      'scenario ai-gpu has 0 complete current estimates; requires 2',
    ]))
  })

  it('rejects an alternative with two offers when only one distinct offer is price-advantaged', () => {
    const catalog = clonedCatalog()
    const hetznerOffers = catalog.offers.filter((offer) => offer.providerId === 'hetzner')
    expect(hetznerOffers).toHaveLength(2)
    for (const component of hetznerOffers[1]!.prices) {
      component.price = 1_000_000
      component.monthlyCap = 1_000_000
    }

    expect(validateCatalog(catalog)).toContain(
      'alternative provider hetzner has 1 distinct category-complete price-advantaged offer; requires 2',
    )
  })

  it('accepts exactly two distinct price-advantaged alternative offer IDs', () => {
    const catalog = clonedCatalog()
    const hetznerOfferIds = catalog.offers
      .filter((offer) => offer.providerId === 'hetzner')
      .map((offer) => offer.id)

    expect(hetznerOfferIds).toEqual(['hetzner-cx23-nuremberg', 'hetzner-cax11-nuremberg'])
    expect(validateCatalog(catalog)).not.toContain(expect.stringContaining('alternative provider hetzner has'))
  })

  it('accepts one distinct Cloudflare proof under the approved provider-specific threshold', () => {
    const catalog = clonedCatalog()
    const cloudflareOfferIds = catalog.offers
      .filter((offer) => offer.providerId === 'cloudflare')
      .map((offer) => offer.id)

    expect(cloudflareOfferIds).toEqual(['cloudflare-workers-paid-global', 'cloudflare-r2-standard-global'])
    expect(validateCatalog(catalog)).not.toContain(expect.stringContaining('alternative provider cloudflare has'))
  })

  it('rejects Cloudflare when no defensible price-advantaged offer remains', () => {
    const catalog = clonedCatalog()
    catalog.offers = catalog.offers.filter(
      (offer) => offer.id !== 'cloudflare-r2-standard-global',
    )

    expect(validateCatalog(catalog)).toContain(
      'alternative provider cloudflare has 0 distinct category-complete price-advantaged offers; requires 1',
    )
  })

  it('does not count an offer that is cheaper than only one of three comparable major providers', () => {
    const catalog = clonedCatalog()
    catalog.offers = catalog.offers.filter(
      (offer) => offer.id !== 'oracle-a1-two-ocpu-12gb-frankfurt',
    )

    expect(validateCatalog(catalog)).toContain(
      'alternative provider oracle has 1 distinct category-complete price-advantaged offer; requires 2',
    )
  })

  it('does not count undersized fixed storage as a category-complete price proof', () => {
    const catalog = clonedCatalog()
    const r2 = catalog.offers.find((offer) => offer.id === 'cloudflare-r2-standard-global')!
    r2.specs.storageGb = 10
    r2.prices = [{ kind: 'flat-month', price: 0.01, currency: 'USD', includedQuantity: 0 }]

    expect(validateCatalog(catalog)).toContain(
      'alternative provider cloudflare has 0 distinct category-complete price-advantaged offers; requires 1',
    )
  })

  it('counts Cloudflare R2 only against the static-site storage projection', () => {
    const catalog = clonedCatalog()
    const staticSite = catalog.scenarios.find((scenario) => scenario.id === 'static-site')!
    staticSite.requiredCategories = ['cdn-network']
    staticSite.coverageByCategory = { 'cdn-network': ['outboundGb', 'requestsMillion'] }
    staticSite.storageGb = 0

    expect(validateCatalog(catalog)).toContain(
      'alternative provider cloudflare has 0 distinct category-complete price-advantaged offers; requires 1',
    )
  })

  it('does not count a category price proof when the scenario has an unassigned nonzero dimension', () => {
    const catalog = clonedCatalog()
    for (const scenario of catalog.scenarios.filter((item) => item.requiredCategories.includes('object-storage'))) {
      scenario.databaseGb = 1
    }

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      expect.stringContaining('has unassigned nonzero dimensions: databaseGb'),
      'alternative provider cloudflare has 0 distinct category-complete price-advantaged offers; requires 1',
    ]))
  })

  it('requires global regions to remain country-neutral', () => {
    const catalog = clonedCatalog()
    const region = catalog.providers.find((provider) => provider.id === 'cloudflare')!.regions[0]!
    region.countryCode = 'DE'

    expect(validateCatalog(catalog)).toContain(
      'provider cloudflare global region global must have countryCode null',
    )
  })
})
