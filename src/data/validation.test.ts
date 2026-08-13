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

  it('requires each alternative to prove a capacity-matched advantage over a major provider', () => {
    const catalog = clonedCatalog()
    for (const offer of catalog.offers.filter((candidate) => candidate.providerId === 'hetzner')) {
      for (const component of offer.prices) {
        component.price = 1_000_000
        component.monthlyCap = 1_000_000
      }
    }

    expect(validateCatalog(catalog)).toContain(
      'alternative provider hetzner lacks a capacity-matched normalized price advantage over a major provider',
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
