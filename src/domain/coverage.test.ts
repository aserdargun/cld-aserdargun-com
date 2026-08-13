import { describe, expect, it } from 'vitest'
import type { Offer, Scenario, ScenarioUsageDimension, ServiceCategory } from './catalog'
import { evaluateCategoryCoverage, projectScenarioForCategory, unassignedScenarioDimensions } from './coverage'
import { estimateOffer, type PricingContext } from './pricing'
import { estimateProvider } from './ranking'
import { getCatalogHealth, loadCatalog } from '../data/catalog'

function scenario(
  coverageByCategory: Partial<Record<ServiceCategory, ScenarioUsageDimension[]>>,
  overrides: Partial<Scenario> = {},
): Scenario {
  return {
    id: 'static-site',
    name: 'Statik site',
    description: 'Test senaryosu',
    scopeNote: 'Test kapsamı.',
    requiredCategories: ['object-storage', 'cdn-network'],
    coverageByCategory,
    hoursPerMonth: 0,
    vcpu: 0,
    ramGb: 0,
    storageGb: 50,
    outboundGb: 500,
    requestsMillion: 0,
    databaseGb: 0,
    gpuHours: 0,
    gpuVramGb: 0,
    ...overrides,
  }
}

function offer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'storage',
    providerId: 'azure',
    serviceName: 'Storage',
    category: 'object-storage',
    rankable: true,
    region: 'westeurope',
    specs: {},
    prices: [{ kind: 'storage-gb-month', price: 0.02, currency: 'USD', includedQuantity: 0 }],
    sourceIds: ['source'],
    verifiedAt: '2026-08-13',
    notes: [],
    ...overrides,
  }
}

const context: PricingContext = {
  exchangeRates: [],
  freeTiers: [],
  statusByOfferId: { storage: 'current' },
}

describe('scenario category coverage', () => {
  it('projects each usage dimension only into its declared category', () => {
    const input = scenario({
      'object-storage': ['storageGb'],
      'cdn-network': ['outboundGb'],
    })

    const storageProjection = projectScenarioForCategory(input, 'object-storage')
    const cdnProjection = projectScenarioForCategory(input, 'cdn-network')

    expect(storageProjection.storageGb).toBe(50)
    expect(storageProjection.outboundGb).toBe(0)
    expect(cdnProjection.storageGb).toBe(0)
    expect(cdnProjection.outboundGb).toBe(500)

    const multiMeter = offer({
      prices: [
        { kind: 'storage-gb-month', price: 0.02, currency: 'USD', includedQuantity: 0 },
        { kind: 'outbound-gb', price: 0.1, currency: 'USD', includedQuantity: 0 },
      ],
    })
    expect(estimateOffer(multiMeter, storageProjection, context).totalUsd).toBe(1)
  })

  it('reports nonzero dimensions that are not assigned to a required category', () => {
    const input = scenario({ 'object-storage': ['storageGb'], 'cdn-network': ['outboundGb'] }, {
      requestsMillion: 1,
    })

    expect(unassignedScenarioDimensions(input)).toEqual(['requestsMillion'])
  })

  it('requires elastic pricing or enough fixed capacity for storage', () => {
    const input = scenario({ 'object-storage': ['storageGb'] })
    const fixed = offer({
      specs: { storageGb: 10 },
      prices: [{ kind: 'flat-month', price: 5, currency: 'USD', includedQuantity: 0 }],
    })

    expect(evaluateCategoryCoverage(fixed, input, 'object-storage')).toMatchObject({
      complete: false,
      missingDimensions: ['storageGb'],
    })
  })

  it('requires the price meter that corresponds to elastic usage', () => {
    const input = scenario({ 'object-storage': ['storageGb'] })
    const noStorageMeter = offer({
      specs: {},
      prices: [{ kind: 'flat-month', price: 5, currency: 'USD', includedQuantity: 0 }],
    })

    expect(evaluateCategoryCoverage(noStorageMeter, input, 'object-storage').missingDimensions).toContain('storageGb')
  })

  it('keeps the required number of complete current estimates in the real catalog', () => {
    const catalog = loadCatalog()
    const health = getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z'))
    const realContext: PricingContext = {
      exchangeRates: catalog.exchangeRates,
      freeTiers: catalog.freeTiers,
      statusByOfferId: health.statusByOfferId,
      statusByFreeTierId: health.statusByFreeTierId,
    }
    const counts = Object.fromEntries(catalog.scenarios.map((currentScenario) => [
      currentScenario.id,
      catalog.providers.filter((provider) =>
        estimateProvider(provider.id, catalog.offers, currentScenario, realContext).totalUsd !== null,
      ).length,
    ]))

    expect(counts).toEqual({
      'small-web-app': 3,
      'api-backend': 4,
      'database-saas': 3,
      'static-site': 3,
      'ai-gpu': 2,
      'high-traffic': 3,
    })
  })

  it('never leaves controlled usage edits as unchanged complete totals', () => {
    const catalog = loadCatalog()
    const health = getCatalogHealth(catalog, new Date('2026-08-14T00:00:00Z'))
    const realContext: PricingContext = {
      exchangeRates: catalog.exchangeRates,
      freeTiers: catalog.freeTiers,
      statusByOfferId: health.statusByOfferId,
      statusByFreeTierId: health.statusByFreeTierId,
    }
    const mutations: Record<Scenario['id'], Partial<Record<ScenarioUsageDimension, number>>[]> = {
      'small-web-app': [{ storageGb: 100_000 }, { outboundGb: 100_000 }],
      'api-backend': [
        { hoursPerMonth: 1 },
        { vcpu: 1 },
        { ramGb: 1 },
        { storageGb: 1 },
        { outboundGb: 1 },
      ],
      'database-saas': [
        { storageGb: 100_000 },
        { outboundGb: 100_000 },
        { requestsMillion: 1 },
        { databaseGb: 100_000 },
      ],
      'static-site': [{ requestsMillion: 1 }],
      'ai-gpu': [{ storageGb: 1_000 }, { outboundGb: 1 }],
      'high-traffic': [{ storageGb: 100_000 }, { requestsMillion: 1 }],
    }

    for (const currentScenario of catalog.scenarios) {
      const baselineByProvider = new Map(catalog.providers.flatMap((provider) => {
        const estimate = estimateProvider(provider.id, catalog.offers, currentScenario, realContext)
        return estimate.totalUsd === null ? [] : [[provider.id, estimate.totalUsd] as const]
      }))
      for (const mutation of mutations[currentScenario.id] ?? []) {
        const edited = { ...currentScenario, ...mutation }
        for (const [providerId, baseline] of baselineByProvider) {
          const estimate = estimateProvider(providerId, catalog.offers, edited, realContext)
          expect(
            estimate.totalUsd === null || estimate.totalUsd !== baseline,
            `${currentScenario.id}/${providerId}/${Object.keys(mutation)[0]} stayed complete and unchanged`,
          ).toBe(true)
        }
      }
    }
  })
})
