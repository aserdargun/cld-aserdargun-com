import { z } from 'zod'
import { providerIds, serviceCategories } from '../domain/catalog'

const nonEmptyString = z.string().trim().min(1)
const nonNegativeNumber = z.number().finite().nonnegative()
const positiveNumber = z.number().finite().positive()
const isoDate = z.iso.date()
const scenarioIds = [
  'small-web-app',
  'api-backend',
  'database-saas',
  'static-site',
  'ai-gpu',
  'high-traffic',
] as const

export const priceComponentSchema = z
  .object({
    kind: z.enum([
      'instance-hour',
      'flat-month',
      'storage-gb-month',
      'outbound-gb',
      'requests-million',
      'database-gb-month',
      'gpu-hour',
    ]),
    price: positiveNumber,
    currency: z.enum(['USD', 'EUR']),
    includedQuantity: nonNegativeNumber,
    monthlyCap: nonNegativeNumber.optional(),
  })
  .strict()

export const providerSchema = z
  .object({
    id: z.enum(providerIds),
    name: nonEmptyString,
    shortName: nonEmptyString,
    officialSite: z.url().refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
    purchaseAvailability: z.enum(['verified', 'conditional', 'unverified']),
    purchaseNote: nonEmptyString,
    verifiedAt: isoDate,
    strengths: z.array(nonEmptyString),
    limitations: z.array(nonEmptyString),
    regions: z.array(
      z
        .object({
          id: nonEmptyString,
          name: nonEmptyString,
          countryCode: z.string().trim().length(2),
          sourceId: nonEmptyString,
        })
        .strict(),
    ),
  })
  .strict()

export const sourceSchema = z
  .object({
    id: nonEmptyString,
    owner: z.union([z.enum(providerIds), z.literal('ecb')]),
    title: nonEmptyString,
    url: z.url().refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
    kind: z.enum(['pricing', 'free-tier', 'regions', 'purchase', 'exchange-rate']),
    accessedAt: isoDate,
  })
  .strict()

export const offerSchema = z
  .object({
    id: nonEmptyString,
    providerId: z.enum(providerIds),
    serviceName: nonEmptyString,
    category: z.enum(serviceCategories),
    region: nonEmptyString,
    specs: z
      .object({
        vcpu: nonNegativeNumber.optional(),
        ramGb: nonNegativeNumber.optional(),
        storageGb: nonNegativeNumber.optional(),
        gpuModel: nonEmptyString.optional(),
        gpuVramGb: nonNegativeNumber.optional(),
      })
      .strict(),
    prices: z.array(priceComponentSchema),
    sourceIds: z.array(nonEmptyString).min(1),
    verifiedAt: isoDate,
    notes: z.array(nonEmptyString),
  })
  .strict()

export const freeTierSchema = z
  .object({
    id: nonEmptyString,
    providerId: z.enum(providerIds),
    serviceName: nonEmptyString,
    category: z.enum(serviceCategories),
    type: z.enum(['new-account-credit', 'time-limited', 'always-free', 'eligibility-limited']),
    quota: z
      .object({
        amount: nonNegativeNumber,
        unit: nonEmptyString,
        period: z.enum(['once', 'month']),
      })
      .strict(),
    durationMonths: nonNegativeNumber.nullable(),
    eligibilityNote: nonEmptyString,
    overageNote: nonEmptyString,
    automaticChargeNote: nonEmptyString,
    sourceIds: z.array(nonEmptyString).min(1),
    verifiedAt: isoDate,
  })
  .strict()

export const exchangeRateSchema = z
  .object({
    id: nonEmptyString,
    base: z.literal('EUR'),
    quote: z.literal('USD'),
    rate: positiveNumber,
    date: isoDate,
    sourceId: nonEmptyString,
  })
  .strict()

export const scenarioSchema = z
  .object({
    id: z.enum(scenarioIds),
    name: nonEmptyString,
    description: nonEmptyString,
    requiredCategories: z.array(z.enum(serviceCategories)).min(1),
    hoursPerMonth: nonNegativeNumber,
    vcpu: nonNegativeNumber,
    ramGb: nonNegativeNumber,
    storageGb: nonNegativeNumber,
    outboundGb: nonNegativeNumber,
    requestsMillion: nonNegativeNumber,
    databaseGb: nonNegativeNumber,
    gpuHours: nonNegativeNumber,
    gpuVramGb: nonNegativeNumber,
  })
  .strict()

export const catalogSchema = z
  .object({
    providers: z.array(providerSchema),
    sources: z.array(sourceSchema),
    offers: z.array(offerSchema),
    freeTiers: z.array(freeTierSchema),
    exchangeRates: z.array(exchangeRateSchema),
    scenarios: z.array(scenarioSchema),
  })
  .strict()
  .superRefine((catalog, context) => {
    const requireExactIds = (ids: string[], requiredIds: readonly string[], path: PropertyKey[]) => {
      const actualIds = new Set(ids)
      const hasRequiredSet = requiredIds.every((id) => actualIds.has(id))
      if (ids.length !== requiredIds.length || actualIds.size !== requiredIds.length || !hasRequiredSet) {
        context.addIssue({ code: 'custom', path, message: 'Must contain each required ID exactly once' })
      }
    }

    requireExactIds(
      catalog.providers.map((provider) => provider.id),
      providerIds,
      ['providers'],
    )
    requireExactIds(
      catalog.scenarios.map((scenario) => scenario.id),
      scenarioIds,
      ['scenarios'],
    )
    const sourceIds = new Set(catalog.sources.map((source) => source.id))
    const checkSource = (sourceId: string, path: PropertyKey[]) => {
      if (!sourceIds.has(sourceId)) {
        context.addIssue({ code: 'custom', path, message: `Unknown source ID: ${sourceId}` })
      }
    }

    catalog.providers.forEach((provider, providerIndex) => {
      provider.regions.forEach((region, regionIndex) => {
        checkSource(region.sourceId, ['providers', providerIndex, 'regions', regionIndex, 'sourceId'])
      })
    })
    catalog.offers.forEach((offer, offerIndex) => {
      offer.sourceIds.forEach((sourceId, sourceIndex) => {
        checkSource(sourceId, ['offers', offerIndex, 'sourceIds', sourceIndex])
      })
    })
    catalog.freeTiers.forEach((freeTier, freeTierIndex) => {
      freeTier.sourceIds.forEach((sourceId, sourceIndex) => {
        checkSource(sourceId, ['freeTiers', freeTierIndex, 'sourceIds', sourceIndex])
      })
    })
    catalog.exchangeRates.forEach((exchangeRate, exchangeRateIndex) => {
      checkSource(exchangeRate.sourceId, ['exchangeRates', exchangeRateIndex, 'sourceId'])
    })
  })
