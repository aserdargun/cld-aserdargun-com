import {
  serviceCategories,
  type Catalog,
  type ProviderId,
  type Scenario,
} from '../domain/catalog'
import {
  evaluateCategoryCoverage,
  projectScenarioForCategory,
  unassignedScenarioDimensions,
} from '../domain/coverage'
import { estimateOffer, priceKindForFreeTierUnit, type PricingContext } from '../domain/pricing'
import { estimateProvider } from '../domain/ranking'
import { getCatalogHealth, getUsableExchangeRates, sourceEvidenceIssue } from './catalog'

export const catalogSnapshotDate = '2026-09-04'
const validationDate = new Date(`${catalogSnapshotDate}T00:00:00.000Z`)
const majorProviderIds = ['azure', 'gcp', 'aws'] as const
const alternativeProviderIds = ['hetzner', 'oracle', 'cloudflare', 'digitalocean', 'vultr'] as const
const requiredAlternativeAdvantageCounts: Record<(typeof alternativeProviderIds)[number], number> = {
  hetzner: 2,
  oracle: 2,
  cloudflare: 1,
  digitalocean: 2,
  vultr: 2,
}

function checkUniqueIds(records: readonly { id: string }[], label: string, failures: string[]): void {
  const seen = new Set<string>()
  for (const record of records) {
    if (seen.has(record.id)) failures.push(`${label} contains duplicate ID ${record.id}`)
    seen.add(record.id)
  }
}

function checkSnapshotDate(date: string, label: string, failures: string[]): void {
  if (date > catalogSnapshotDate) {
    failures.push(`${label} is dated after catalog snapshot ${catalogSnapshotDate}: ${date}`)
  }
}

function alternativeAdvantageOfferIds(
  providerId: ProviderId,
  catalog: Catalog,
  context: PricingContext,
): Set<string> {
  const alternativeOffers = catalog.offers.filter(
    (offer) => offer.providerId === providerId && offer.rankable,
  )
  const majorOffers = catalog.offers.filter(
    (offer) => majorProviderIds.includes(offer.providerId as (typeof majorProviderIds)[number]) && offer.rankable,
  )

  return new Set(alternativeOffers.flatMap((alternative) => {
    const isAdvantaged = catalog.scenarios.some((scenario) => {
      if (
        !scenario.requiredCategories.includes(alternative.category) ||
        (alternative.category === 'object-storage' && scenario.id !== 'static-site') ||
        unassignedScenarioDimensions(scenario).length > 0 ||
        !evaluateCategoryCoverage(alternative, scenario, alternative.category).complete
      ) {
        return false
      }
      const projection = projectScenarioForCategory(scenario, alternative.category)
      const alternativeEstimate = estimateOffer(alternative, projection, context)
      if (alternativeEstimate.status !== 'current' || alternativeEstimate.totalUsd === null) return false

      const comparableMajorTotals = majorProviderIds.flatMap((majorProviderId) => {
        const qualifyingTotals = majorOffers
          .filter((major) =>
            major.providerId === majorProviderId &&
            major.category === alternative.category &&
            evaluateCategoryCoverage(major, scenario, alternative.category).complete,
          )
          .map((major) => estimateOffer(major, projection, context))
          .filter((estimate) => estimate.status === 'current' && estimate.totalUsd !== null)
          .map((estimate) => estimate.totalUsd!)
        return qualifyingTotals.length > 0 ? [Math.min(...qualifyingTotals)] : []
      })
      if (comparableMajorTotals.length !== majorProviderIds.length) return false
      const cheaperMajorCount = comparableMajorTotals.filter(
        (majorTotal) => alternativeEstimate.totalUsd! < majorTotal,
      ).length
      return cheaperMajorCount >= 2
    })
    return isAdvantaged ? [alternative.id] : []
  }))
}

function countCompleteCurrentEstimates(catalog: Catalog, scenario: Scenario, context: PricingContext): number {
  return catalog.providers.filter((provider) => {
    const estimate = estimateProvider(provider.id, catalog.offers, scenario, context)
    return estimate.status === 'current' &&
      estimate.totalUsd !== null &&
      estimate.missingCategories.length === 0 &&
      estimate.missingDimensions.length === 0
  }).length
}

export function validateCatalog(catalog: Catalog): string[] {
  const failures: string[] = []
  checkUniqueIds(catalog.providers, 'providers', failures)
  checkUniqueIds(catalog.sources, 'sources', failures)
  checkUniqueIds(catalog.offers, 'offers', failures)
  checkUniqueIds(catalog.freeTiers, 'free tiers', failures)
  checkUniqueIds(catalog.exchangeRates, 'exchange rates', failures)
  checkUniqueIds(catalog.scenarios, 'scenarios', failures)

  const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]))
  const providersById = new Map(catalog.providers.map((provider) => [provider.id, provider]))
  const offersById = new Map(catalog.offers.map((offer) => [offer.id, offer]))
  for (const source of catalog.sources) {
    checkSnapshotDate(source.accessedAt, `source ${source.id}`, failures)
    if (new URL(source.url).protocol !== 'https:') failures.push(`source ${source.id} is not HTTPS`)
  }

  for (const provider of catalog.providers) {
    checkSnapshotDate(provider.verifiedAt, `provider ${provider.id}`, failures)
    if (provider.regions.length === 0) failures.push(`provider ${provider.id} has no supported regions`)
    checkUniqueIds(provider.regions, `provider ${provider.id} regions`, failures)
    if (provider.purchaseSourceIds.length === 0) failures.push(`provider ${provider.id} lacks purchase evidence`)
    for (const sourceId of provider.purchaseSourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) failures.push(`provider ${provider.id} references missing purchase source ${sourceId}`)
      else if (sourceEvidenceIssue(source, provider.id, 'purchase')) {
        failures.push(`provider ${provider.id} purchase source ${sourceId} has wrong owner or kind`)
      }
    }
    for (const region of provider.regions) {
      if (region.scope === 'global' && region.countryCode !== null) {
        failures.push(`provider ${provider.id} global region ${region.id} must have countryCode null`)
      }
      if (region.scope === 'regional' && region.countryCode === null) {
        failures.push(`provider ${provider.id} regional region ${region.id} requires a countryCode`)
      }
      const source = sourcesById.get(region.sourceId)
      if (!source) failures.push(`provider ${provider.id} region ${region.id} references missing source`)
      else if (sourceEvidenceIssue(source, provider.id, 'regions')) {
        failures.push(`provider ${provider.id} region ${region.id} source has wrong owner or kind`)
      }
    }
    const scopesByRegionSource = new Map<string, Set<string>>()
    for (const region of provider.regions) {
      const scopes = scopesByRegionSource.get(region.sourceId) ?? new Set<string>()
      scopes.add(region.scope)
      scopesByRegionSource.set(region.sourceId, scopes)
    }
    for (const [sourceId, scopes] of scopesByRegionSource) {
      if (scopes.has('global') && scopes.size > 1) {
        failures.push(`provider ${provider.id} region source ${sourceId} mixes global and regional scope`)
      }
    }
    if (!catalog.sources.some((source) => source.owner === provider.id)) {
      failures.push(`provider ${provider.id} lacks an owned official source`)
    }
    if (!catalog.offers.some((offer) => offer.providerId === provider.id)) {
      failures.push(`provider ${provider.id} lacks an offer`)
    }
  }

  for (const offer of catalog.offers) {
    checkSnapshotDate(offer.verifiedAt, `offer ${offer.id}`, failures)
    if (typeof offer.rankable !== 'boolean') failures.push(`offer ${offer.id} lacks explicit rankability`)
    const provider = providersById.get(offer.providerId)
    if (!provider?.regions.some((region) => region.id === offer.region)) {
      failures.push(`offer ${offer.id} references undeclared region ${offer.region} for provider ${offer.providerId}`)
    }
    if (offer.rankable && offer.category === 'compute' && (!(offer.specs.vcpu! > 0) || !(offer.specs.ramGb! > 0))) {
      failures.push(`rankable compute offer ${offer.id} lacks complete vCPU/RAM capacity`)
    }
    if (offer.rankable && offer.category === 'gpu-ai' &&
      (!(offer.specs.vcpu! > 0) || !(offer.specs.ramGb! > 0) || !(offer.specs.gpuVramGb! > 0))) {
      failures.push(`rankable GPU offer ${offer.id} lacks a complete VM and GPU capacity`)
    }
    if (!offer.prices.some((component) => component.price > 0)) failures.push(`offer ${offer.id} lacks a positive paid component`)
    if (offer.notes.length === 0) failures.push(`offer ${offer.id} lacks a major-exclusion note`)
    for (const component of offer.prices) {
      if (component.monthlyCap !== undefined && !(component.monthlyCap > 0)) {
        failures.push(`offer ${offer.id} has non-positive monthly cap ${component.monthlyCap}`)
      }
      if (component.currency !== 'USD') {
        const hasUsableRate = catalog.exchangeRates.some(
          (rate) => rate.base === 'EUR' &&
            rate.quote === 'USD' &&
            rate.rate > 0 &&
            rate.date <= offer.verifiedAt &&
            sourceEvidenceIssue(sourcesById.get(rate.sourceId), 'ecb', 'exchange-rate') === null,
        )
        if (!hasUsableRate) failures.push(`offer ${offer.id} lacks a usable dated ECB EUR/USD rate on or before ${offer.verifiedAt}`)
      }
    }
    for (const sourceId of offer.sourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) failures.push(`offer ${offer.id} references missing source ${sourceId}`)
      else if (sourceEvidenceIssue(source, offer.providerId, 'pricing')) {
        failures.push(`offer ${offer.id} source ${sourceId} has wrong owner or kind`)
      }
    }
  }

  for (const freeTier of catalog.freeTiers) {
    checkSnapshotDate(freeTier.verifiedAt, `free tier ${freeTier.id}`, failures)
    if (freeTier.compatibleOfferIds.length === 0 && freeTier.compatiblePriceKinds.length > 0) {
      failures.push(`free tier ${freeTier.id} is display-only but declares compatible price kinds`)
    }
    if (freeTier.compatibleOfferIds.length > 0 && freeTier.compatiblePriceKinds.length === 0) {
      failures.push(`free tier ${freeTier.id} has compatible offers but no compatible price kinds`)
    }
    if (freeTier.compatibleOfferIds.length > 0) {
      const quotaKind = priceKindForFreeTierUnit(freeTier.quota.unit)
      for (const priceKind of freeTier.compatiblePriceKinds) {
        if (quotaKind !== priceKind) {
          failures.push(`free tier ${freeTier.id} quota unit ${freeTier.quota.unit} does not map to compatible price kind ${priceKind}`)
        }
      }
    }
    for (const offerId of freeTier.compatibleOfferIds) {
      const offer = offersById.get(offerId)
      if (!offer) {
        failures.push(`free tier ${freeTier.id} references missing compatible offer ${offerId}`)
      } else if (offer.providerId !== freeTier.providerId || offer.category !== freeTier.category || !offer.rankable) {
        failures.push(`free tier ${freeTier.id} incompatible offer ${offerId}`)
      } else {
        for (const priceKind of freeTier.compatiblePriceKinds) {
          if (!offer.prices.some((component) => component.kind === priceKind)) {
            failures.push(`free tier ${freeTier.id} offer ${offerId} lacks compatible component ${priceKind}`)
          }
        }
      }
    }
    for (const sourceId of freeTier.sourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) failures.push(`free tier ${freeTier.id} references missing source ${sourceId}`)
      else if (sourceEvidenceIssue(source, freeTier.providerId, 'free-tier')) {
        failures.push(`free tier ${freeTier.id} source ${sourceId} has wrong owner or kind`)
      }
    }
  }

  for (const providerId of majorProviderIds) {
    const covered = new Set(
      catalog.offers.filter((offer) => offer.providerId === providerId).map((offer) => offer.category),
    )
    for (const category of serviceCategories) {
      if (!covered.has(category)) failures.push(`major provider ${providerId} lacks category ${category}`)
    }
  }

  for (const providerId of alternativeProviderIds) {
    const count = catalog.offers.filter((offer) => offer.providerId === providerId).length
    if (count < 2) failures.push(`alternative provider ${providerId} has only ${count} offers`)
  }

  const minimumFreeTiers: Partial<Record<ProviderId, number>> = { azure: 6, gcp: 6, aws: 4, oracle: 4 }
  for (const [providerId, minimum] of Object.entries(minimumFreeTiers) as [ProviderId, number][]) {
    const count = catalog.freeTiers.filter((freeTier) => freeTier.providerId === providerId).length
    if (count < minimum) failures.push(`provider ${providerId} has only ${count} free-tier records; requires ${minimum}`)
  }

  for (const rate of catalog.exchangeRates) {
    checkSnapshotDate(rate.date, `exchange rate ${rate.id}`, failures)
    const source = sourcesById.get(rate.sourceId)
    if (!source) failures.push(`exchange rate ${rate.id} references missing source ${rate.sourceId}`)
    else if (sourceEvidenceIssue(source, 'ecb', 'exchange-rate')) {
      failures.push(`exchange rate ${rate.id} does not use an ECB exchange-rate source`)
    }
  }
  if (!catalog.exchangeRates.some((rate) =>
    rate.base === 'EUR' &&
    rate.quote === 'USD' &&
    rate.date <= catalogSnapshotDate &&
    sourceEvidenceIssue(sourcesById.get(rate.sourceId), 'ecb', 'exchange-rate') === null)) {
    failures.push(`catalog lacks a dated ECB EUR/USD rate on or before ${catalogSnapshotDate}`)
  }

  const health = getCatalogHealth(catalog, validationDate)
  for (const reference of health.invalidReferences) failures.push(`catalog health reports invalid reference ${reference}`)
  if (health.staleCount > 0) failures.push(`catalog health reports ${health.staleCount} stale offer/free-tier records`)

  const pricingContext: PricingContext = {
    exchangeRates: getUsableExchangeRates(catalog, health),
    freeTiers: catalog.freeTiers,
    statusByOfferId: health.statusByOfferId,
    statusByFreeTierId: health.statusByFreeTierId,
    statusByExchangeRateId: health.statusByExchangeRateId,
  }
  for (const scenario of catalog.scenarios) {
    const unassigned = unassignedScenarioDimensions(scenario)
    if (unassigned.length > 0) {
      failures.push(`scenario ${scenario.id} has unassigned nonzero dimensions: ${unassigned.join(', ')}`)
    }
    const requiredCount = scenario.id === 'ai-gpu' ? 2 : 3
    const actualCount = countCompleteCurrentEstimates(catalog, scenario, pricingContext)
    if (actualCount < requiredCount) {
      failures.push(`scenario ${scenario.id} has ${actualCount} complete current estimates; requires ${requiredCount}`)
    }
  }
  for (const providerId of alternativeProviderIds) {
    const advantageOfferIds = alternativeAdvantageOfferIds(providerId, catalog, pricingContext)
    const requiredCount = requiredAlternativeAdvantageCounts[providerId]
    if (advantageOfferIds.size < requiredCount) {
      failures.push(`alternative provider ${providerId} has ${advantageOfferIds.size} distinct category-complete price-advantaged offer${advantageOfferIds.size === 1 ? '' : 's'}; requires ${requiredCount}`)
    }
  }
  return failures
}
