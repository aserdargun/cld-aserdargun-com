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

  it('requires every provider, source, offer, free tier, and rate to use the snapshot date', () => {
    const catalog = clonedCatalog()
    catalog.providers[0]!.verifiedAt = '2026-08-12'
    catalog.sources[0]!.accessedAt = '2026-08-12'
    catalog.offers[0]!.verifiedAt = '2026-08-12'
    catalog.freeTiers[0]!.verifiedAt = '2026-08-12'
    catalog.exchangeRates[0]!.date = '2026-08-12'

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      'provider azure must use snapshot date 2026-08-13, got 2026-08-12',
      `source ${catalog.sources[0]!.id} must use snapshot date 2026-08-13, got 2026-08-12`,
      `offer ${catalog.offers[0]!.id} must use snapshot date 2026-08-13, got 2026-08-12`,
      `free tier ${catalog.freeTiers[0]!.id} must use snapshot date 2026-08-13, got 2026-08-12`,
      `exchange rate ${catalog.exchangeRates[0]!.id} must use snapshot date 2026-08-13, got 2026-08-12`,
    ]))
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
    const freeTier = catalog.freeTiers.find((tier) => tier.id === 'azure-functions-million-requests')!
    freeTier.compatibleOfferIds = ['gcp-cloud-run-requests-belgium']

    expect(validateCatalog(catalog)).toEqual(expect.arrayContaining([
      expect.stringContaining(`free tier ${freeTier.id} incompatible offer gcp-cloud-run-requests-belgium`),
    ]))
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
      'alternative provider hetzner has 1 distinct capacity-matched price-advantaged offer; requires 2',
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

  it('does not count an offer that is cheaper than only one of three comparable major providers', () => {
    const catalog = clonedCatalog()
    catalog.offers = catalog.offers.filter(
      (offer) => offer.id !== 'oracle-a1-two-ocpu-12gb-frankfurt',
    )

    expect(validateCatalog(catalog)).toContain(
      'alternative provider oracle has 1 distinct capacity-matched price-advantaged offer; requires 2',
    )
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
