import type {
  Catalog,
  CatalogHealth,
  ExchangeRate,
  FreeTier,
  Offer,
  Source,
  VerificationStatus,
} from '../domain/catalog'
import exchangeRates from './exchange-rates.json'
import freeTiers from './free-tiers.json'
import offers from './offers.json'
import providers from './providers.json'
import scenarios from './scenarios.json'
import sources from './sources.json'
import { catalogSchema } from './schemas'

const bundledCatalog = { providers, sources, offers, freeTiers, exchangeRates, scenarios }

export function loadCatalog(input: unknown = bundledCatalog): Catalog {
  return catalogSchema.parse(input)
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

function isValidExchangeRateSource(source: Source | undefined): boolean {
  return source?.owner === 'ecb' && source.kind === 'exchange-rate'
}

function collectInvalidReferences(catalog: Catalog, sourcesById: Map<string, Source>): string[] {
  const invalidReferences: string[] = []
  const addMissing = (record: string, sourceIds: string[]) => {
    sourceIds.forEach((sourceId) => {
      if (!sourcesById.has(sourceId)) invalidReferences.push(`${record}:${sourceId}`)
    })
  }

  catalog.providers.forEach((provider) => {
    addMissing(`provider:${provider.id}:purchase`, provider.purchaseSourceIds)
    provider.regions.forEach((region) => addMissing(`provider:${provider.id}:region:${region.id}`, [region.sourceId]))
  })
  catalog.offers.forEach((offer) => addMissing(`offer:${offer.id}`, offer.sourceIds))
  catalog.freeTiers.forEach((freeTier) => addMissing(`free-tier:${freeTier.id}`, freeTier.sourceIds))
  catalog.exchangeRates.forEach((exchangeRate) => {
    if (!isValidExchangeRateSource(sourcesById.get(exchangeRate.sourceId))) {
      invalidReferences.push(`exchange-rate:${exchangeRate.id}:${exchangeRate.sourceId}`)
    }
  })

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
  const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]))
  const knownSourceIds = new Set(sourcesById.keys())
  const statusByOfferId = statusesFor(catalog.offers, knownSourceIds, today)
  const statusByFreeTierId = statusesFor(catalog.freeTiers, knownSourceIds, today)
  const statusByExchangeRateId = Object.fromEntries(
    catalog.exchangeRates.map((exchangeRate) => [
      exchangeRate.id,
      isValidExchangeRateSource(sourcesById.get(exchangeRate.sourceId)) ? 'current' : 'invalid',
    ] satisfies [string, VerificationStatus]),
  )
  const statusValues = [...Object.values(statusByOfferId), ...Object.values(statusByFreeTierId)]
  const invalidReferences = collectInvalidReferences(catalog, sourcesById)

  return {
    statusByOfferId,
    statusByFreeTierId,
    statusByExchangeRateId,
    invalidReferences,
    staleCount: statusValues.filter((status) => status === 'stale').length,
    invalidCount: invalidReferences.length,
  }
}

export function getUsableExchangeRates(
  catalog: Pick<Catalog, 'exchangeRates'>,
  health: Pick<CatalogHealth, 'statusByExchangeRateId'>,
): ExchangeRate[] {
  return catalog.exchangeRates.filter(
    (exchangeRate) => health.statusByExchangeRateId[exchangeRate.id] === 'current',
  )
}
