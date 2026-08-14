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
  sourcesById: Map<string, Source>,
  expectedOwner: Source['owner'],
  expectedKind: Source['kind'],
  today: Date,
): VerificationStatus {
  if (sourceIds.some((sourceId) => sourceEvidenceIssue(
    sourcesById.get(sourceId),
    expectedOwner,
    expectedKind,
  ) !== null)) {
    return 'invalid'
  }

  const verifiedOn = new Date(`${verifiedAt}T00:00:00.000Z`)
  const todayAtUtcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const ageInDays = Math.floor((todayAtUtcMidnight - verifiedOn.getTime()) / 86_400_000)
  return ageInDays > 30 ? 'stale' : 'current'
}

export type SourceEvidenceIssue = 'missing' | 'wrong-owner' | 'wrong-kind'

export function sourceEvidenceIssue(
  source: Source | undefined,
  expectedOwner: Source['owner'],
  expectedKind: Source['kind'],
): SourceEvidenceIssue | null {
  if (!source) return 'missing'
  if (source.owner !== expectedOwner) return 'wrong-owner'
  if (source.kind !== expectedKind) return 'wrong-kind'
  return null
}

function collectInvalidReferences(catalog: Catalog, sourcesById: Map<string, Source>): string[] {
  const invalidReferences: string[] = []
  const addInvalid = (
    record: string,
    sourceIds: string[],
    expectedOwner: Source['owner'],
    expectedKind: Source['kind'],
  ) => {
    sourceIds.forEach((sourceId) => {
      const issue = sourceEvidenceIssue(sourcesById.get(sourceId), expectedOwner, expectedKind)
      if (issue) {
        invalidReferences.push(`${record}:${sourceId}${issue === 'missing' ? '' : `:${issue}`}`)
      }
    })
  }

  catalog.providers.forEach((provider) => {
    addInvalid(`provider:${provider.id}:purchase`, provider.purchaseSourceIds, provider.id, 'purchase')
    provider.regions.forEach((region) => addInvalid(
      `provider:${provider.id}:region:${region.id}`,
      [region.sourceId],
      provider.id,
      'regions',
    ))
  })
  catalog.offers.forEach((offer) => addInvalid(
    `offer:${offer.id}`,
    offer.sourceIds,
    offer.providerId,
    'pricing',
  ))
  catalog.freeTiers.forEach((freeTier) => addInvalid(
    `free-tier:${freeTier.id}`,
    freeTier.sourceIds,
    freeTier.providerId,
    'free-tier',
  ))
  catalog.exchangeRates.forEach((exchangeRate) => {
    const issue = sourceEvidenceIssue(sourcesById.get(exchangeRate.sourceId), 'ecb', 'exchange-rate')
    if (issue) {
      invalidReferences.push(
        `exchange-rate:${exchangeRate.id}:${exchangeRate.sourceId}${issue === 'missing' ? '' : `:${issue}`}`,
      )
    }
  })

  return invalidReferences
}

function statusesFor<T extends Offer | FreeTier>(
  records: T[],
  sourcesById: Map<string, Source>,
  expectedKind: 'pricing' | 'free-tier',
  today: Date,
): Record<string, VerificationStatus> {
  return Object.fromEntries(
    records.map((record) => [
      record.id,
      verificationStatus(
        record.verifiedAt,
        record.sourceIds,
        sourcesById,
        record.providerId,
        expectedKind,
        today,
      ),
    ]),
  )
}

export function getCatalogHealth(catalog: Catalog, today: Date): CatalogHealth {
  const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]))
  const statusByOfferId = statusesFor(catalog.offers, sourcesById, 'pricing', today)
  const statusByFreeTierId = statusesFor(catalog.freeTiers, sourcesById, 'free-tier', today)
  const statusByExchangeRateId = Object.fromEntries(
    catalog.exchangeRates.map((exchangeRate) => [
      exchangeRate.id,
      sourceEvidenceIssue(sourcesById.get(exchangeRate.sourceId), 'ecb', 'exchange-rate') === null
        ? 'current'
        : 'invalid',
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
