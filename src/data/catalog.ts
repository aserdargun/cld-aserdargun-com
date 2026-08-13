import type { Catalog, CatalogHealth, FreeTier, Offer, VerificationStatus } from '../domain/catalog'
import exchangeRates from './exchange-rates.json'
import freeTiers from './free-tiers.json'
import offers from './offers.json'
import providers from './providers.json'
import scenarios from './scenarios.json'
import sources from './sources.json'
import { catalogSchema } from './schemas'

export function loadCatalog(): Catalog {
  return catalogSchema.parse({ providers, sources, offers, freeTiers, exchangeRates, scenarios })
}

function verificationStatus(
  verifiedAt: string,
  sourceIds: string[],
  knownSourceIds: Set<string>,
  today: Date,
): VerificationStatus {
  if (sourceIds.some((sourceId) => !knownSourceIds.has(sourceId))) {
    return 'invalid'
  }

  const verifiedOn = new Date(`${verifiedAt}T00:00:00.000Z`)
  const todayAtUtcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const ageInDays = Math.floor((todayAtUtcMidnight - verifiedOn.getTime()) / 86_400_000)
  return ageInDays > 30 ? 'stale' : 'current'
}

function collectInvalidReferences(catalog: Catalog, knownSourceIds: Set<string>): string[] {
  const invalidReferences: string[] = []
  const addMissing = (record: string, sourceIds: string[]) => {
    sourceIds.forEach((sourceId) => {
      if (!knownSourceIds.has(sourceId)) invalidReferences.push(`${record}:${sourceId}`)
    })
  }

  catalog.providers.forEach((provider) => {
    provider.regions.forEach((region) => addMissing(`provider:${provider.id}:region:${region.id}`, [region.sourceId]))
  })
  catalog.offers.forEach((offer) => addMissing(`offer:${offer.id}`, offer.sourceIds))
  catalog.freeTiers.forEach((freeTier) => addMissing(`free-tier:${freeTier.id}`, freeTier.sourceIds))
  catalog.exchangeRates.forEach((exchangeRate) => addMissing(`exchange-rate:${exchangeRate.id}`, [exchangeRate.sourceId]))

  return invalidReferences
}

function statusesFor<T extends Offer | FreeTier>(
  records: T[],
  knownSourceIds: Set<string>,
  today: Date,
): Record<string, VerificationStatus> {
  return Object.fromEntries(
    records.map((record) => [
      record.id,
      verificationStatus(record.verifiedAt, record.sourceIds, knownSourceIds, today),
    ]),
  )
}

export function getCatalogHealth(catalog: Catalog, today: Date): CatalogHealth {
  const knownSourceIds = new Set(catalog.sources.map((source) => source.id))
  const statusByOfferId = statusesFor(catalog.offers, knownSourceIds, today)
  const statusByFreeTierId = statusesFor(catalog.freeTiers, knownSourceIds, today)
  const statusValues = [...Object.values(statusByOfferId), ...Object.values(statusByFreeTierId)]
  const invalidReferences = collectInvalidReferences(catalog, knownSourceIds)

  return {
    statusByOfferId,
    statusByFreeTierId,
    invalidReferences,
    staleCount: statusValues.filter((status) => status === 'stale').length,
    invalidCount: invalidReferences.length,
  }
}
