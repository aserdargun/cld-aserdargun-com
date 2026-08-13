import { providerIds, serviceCategories, type Catalog, type ProviderId } from '../src/domain/catalog'
import { getCatalogHealth, loadCatalog } from '../src/data/catalog'

const validationDate = new Date('2026-08-13T00:00:00.000Z')
const maximumAgeDays = 30
const failures: string[] = []

function fail(message: string): void {
  failures.push(message)
}

function checkUniqueIds(records: readonly { id: string }[], label: string): void {
  const seen = new Set<string>()
  for (const record of records) {
    if (seen.has(record.id)) fail(`${label} contains duplicate ID ${record.id}`)
    seen.add(record.id)
  }
}

function checkFreshDate(date: string, label: string): void {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  const ageDays = Math.floor((validationDate.getTime() - timestamp) / 86_400_000)
  if (!Number.isFinite(timestamp)) fail(`${label} has invalid date ${date}`)
  else if (ageDays < 0) fail(`${label} is future-dated ${date}`)
  else if (ageDays > maximumAgeDays) fail(`${label} is stale at ${ageDays} days old`)
}

function validate(catalog: Catalog): void {
  checkUniqueIds(catalog.providers, 'providers')
  checkUniqueIds(catalog.sources, 'sources')
  checkUniqueIds(catalog.offers, 'offers')
  checkUniqueIds(catalog.freeTiers, 'free tiers')
  checkUniqueIds(catalog.exchangeRates, 'exchange rates')
  checkUniqueIds(catalog.scenarios, 'scenarios')

  const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]))
  for (const source of catalog.sources) {
    checkFreshDate(source.accessedAt, `source ${source.id}`)
    if (new URL(source.url).protocol !== 'https:') fail(`source ${source.id} is not HTTPS`)
  }

  for (const provider of catalog.providers) {
    checkFreshDate(provider.verifiedAt, `provider ${provider.id}`)
    if (provider.purchaseSourceIds.length === 0) fail(`provider ${provider.id} lacks purchase evidence`)
    for (const sourceId of provider.purchaseSourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) fail(`provider ${provider.id} references missing purchase source ${sourceId}`)
      else if (source.owner !== provider.id || source.kind !== 'purchase') {
        fail(`provider ${provider.id} purchase source ${sourceId} has wrong owner or kind`)
      }
    }
    for (const region of provider.regions) {
      const source = sourcesById.get(region.sourceId)
      if (!source) fail(`provider ${provider.id} region ${region.id} references missing source`)
      else if (source.owner !== provider.id || source.kind !== 'regions') {
        fail(`provider ${provider.id} region ${region.id} source has wrong owner or kind`)
      }
    }
    if (!catalog.sources.some((source) => source.owner === provider.id)) {
      fail(`provider ${provider.id} lacks an owned official source`)
    }
    if (!catalog.offers.some((offer) => offer.providerId === provider.id)) {
      fail(`provider ${provider.id} lacks an offer`)
    }
  }

  for (const offer of catalog.offers) {
    checkFreshDate(offer.verifiedAt, `offer ${offer.id}`)
    if (!offer.prices.some((component) => component.price > 0)) fail(`offer ${offer.id} lacks a positive paid component`)
    if (offer.notes.length === 0) fail(`offer ${offer.id} lacks a major-exclusion note`)
    for (const sourceId of offer.sourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) fail(`offer ${offer.id} references missing source ${sourceId}`)
      else if (source.owner !== offer.providerId || source.kind !== 'pricing') {
        fail(`offer ${offer.id} source ${sourceId} has wrong owner or kind`)
      }
    }
  }

  for (const freeTier of catalog.freeTiers) {
    checkFreshDate(freeTier.verifiedAt, `free tier ${freeTier.id}`)
    for (const sourceId of freeTier.sourceIds) {
      const source = sourcesById.get(sourceId)
      if (!source) fail(`free tier ${freeTier.id} references missing source ${sourceId}`)
      else if (source.owner !== freeTier.providerId || source.kind !== 'free-tier') {
        fail(`free tier ${freeTier.id} source ${sourceId} has wrong owner or kind`)
      }
    }
  }

  for (const providerId of ['azure', 'gcp', 'aws'] as const) {
    const covered = new Set(
      catalog.offers.filter((offer) => offer.providerId === providerId).map((offer) => offer.category),
    )
    for (const category of serviceCategories) {
      if (!covered.has(category)) fail(`major provider ${providerId} lacks category ${category}`)
    }
  }

  for (const providerId of ['hetzner', 'oracle', 'cloudflare', 'digitalocean', 'vultr'] as const) {
    const count = catalog.offers.filter((offer) => offer.providerId === providerId).length
    if (count < 2) fail(`alternative provider ${providerId} has only ${count} offers`)
  }

  const minimumFreeTiers: Partial<Record<ProviderId, number>> = { azure: 6, gcp: 6, aws: 4, oracle: 4 }
  for (const [providerId, minimum] of Object.entries(minimumFreeTiers) as [ProviderId, number][]) {
    const count = catalog.freeTiers.filter((freeTier) => freeTier.providerId === providerId).length
    if (count < minimum) fail(`provider ${providerId} has only ${count} free-tier records; requires ${minimum}`)
  }

  for (const rate of catalog.exchangeRates) {
    checkFreshDate(rate.date, `exchange rate ${rate.id}`)
    const source = sourcesById.get(rate.sourceId)
    if (!source) fail(`exchange rate ${rate.id} references missing source ${rate.sourceId}`)
    else if (source.owner !== 'ecb' || source.kind !== 'exchange-rate') {
      fail(`exchange rate ${rate.id} does not use an ECB exchange-rate source`)
    }
  }
  if (!catalog.exchangeRates.some((rate) => rate.base === 'EUR' && rate.quote === 'USD' && rate.date === '2026-08-13')) {
    fail('catalog lacks the required 2026-08-13 ECB EUR/USD rate')
  }

  const health = getCatalogHealth(catalog, validationDate)
  for (const reference of health.invalidReferences) fail(`catalog health reports invalid reference ${reference}`)
  if (health.staleCount > 0) fail(`catalog health reports ${health.staleCount} stale offer/free-tier records`)
}

let catalog: Catalog
try {
  catalog = loadCatalog()
} catch (error) {
  const message = error instanceof Error ? error.message.replaceAll('\n', ' ') : String(error)
  console.error(`FAIL schema parse: ${message}`)
  process.exit(1)
}

validate(catalog)

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`)
  process.exit(1)
}

for (const providerId of providerIds) {
  const offerCount = catalog.offers.filter((offer) => offer.providerId === providerId).length
  const freeTierCount = catalog.freeTiers.filter((freeTier) => freeTier.providerId === providerId).length
  console.log(`provider ${providerId}: ${offerCount} offers, ${freeTierCount} free-tier records`)
}
for (const category of serviceCategories) {
  const count = catalog.offers.filter((offer) => offer.category === category).length
  console.log(`category ${category}: ${count} offers`)
}
console.log(`catalog valid: ${catalog.providers.length} providers, ${catalog.offers.length} offers, ${catalog.freeTiers.length} free-tier records, ${catalog.sources.length} sources`)
