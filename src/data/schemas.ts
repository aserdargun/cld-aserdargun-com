import { z } from 'zod'
import { providerIds, scenarioUsageDimensions, serviceCategories } from '../domain/catalog'
import { priceKindForFreeTierUnit } from '../domain/pricing'

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
    monthlyCap: positiveNumber.optional(),
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
    purchaseSourceIds: z.array(nonEmptyString).min(1),
    verifiedAt: isoDate,
    strengths: z.array(nonEmptyString),
    limitations: z.array(nonEmptyString),
    regions: z.array(
      z
        .object({
          id: nonEmptyString,
          name: nonEmptyString,
          countryCode: z.string().trim().length(2).nullable(),
          scope: z.enum(['regional', 'global']),
          sourceId: nonEmptyString,
        })
        .strict()
        .superRefine((region, context) => {
          if (region.scope === 'global' && region.countryCode !== null) {
            context.addIssue({ code: 'custom', path: ['countryCode'], message: 'Global regions cannot claim one country' })
          }
          if (region.scope === 'regional' && region.countryCode === null) {
            context.addIssue({ code: 'custom', path: ['countryCode'], message: 'Regional entries require a country code' })
          }
        }),
    ).min(1),
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
    rankable: z.boolean(),
    region: nonEmptyString,
    specs: z
      .object({
        vcpu: nonNegativeNumber.optional(),
        ramGb: nonNegativeNumber.optional(),
        storageGb: nonNegativeNumber.optional(),
        outboundGb: nonNegativeNumber.optional(),
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
    compatibleOfferIds: z.array(nonEmptyString),
    compatiblePriceKinds: z.array(priceComponentSchema.shape.kind),
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
    scopeNote: nonEmptyString,
    requiredCategories: z.array(z.enum(serviceCategories)).min(1),
    coverageByCategory: z.partialRecord(
      z.enum(serviceCategories),
      z.array(z.enum(scenarioUsageDimensions)),
    ),
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
  .superRefine((scenario, context) => {
    const required = new Set(scenario.requiredCategories)
    for (const category of scenario.requiredCategories) {
      if (!(category in scenario.coverageByCategory)) {
        context.addIssue({ code: 'custom', path: ['coverageByCategory', category], message: 'Required category needs an explicit coverage declaration' })
      }
    }
    for (const [category, dimensions] of Object.entries(scenario.coverageByCategory)) {
      if (!required.has(category as (typeof serviceCategories)[number])) {
        context.addIssue({ code: 'custom', path: ['coverageByCategory', category], message: 'Coverage category must be required by the scenario' })
      }
      if (dimensions && new Set(dimensions).size !== dimensions.length) {
        context.addIssue({ code: 'custom', path: ['coverageByCategory', category], message: 'Coverage dimensions must be unique' })
      }
    }
    const assigned = new Set(Object.values(scenario.coverageByCategory).flatMap((dimensions) => dimensions ?? []))
    for (const dimension of scenarioUsageDimensions) {
      if (scenario[dimension] > 0 && !assigned.has(dimension)) {
        context.addIssue({ code: 'custom', path: ['coverageByCategory'], message: `Nonzero dimension ${dimension} must be assigned` })
      }
    }
  })

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
    const providersById = new Map(catalog.providers.map((provider) => [provider.id, provider]))
    const offersById = new Map(catalog.offers.map((offer) => [offer.id, offer]))
    catalog.offers.forEach((offer, offerIndex) => {
      const provider = providersById.get(offer.providerId)
      if (!provider?.regions.some((region) => region.id === offer.region)) {
        context.addIssue({
          code: 'custom',
          path: ['offers', offerIndex, 'region'],
          message: `Offer region ${offer.region} is not declared by provider ${offer.providerId}`,
        })
      }
    })
    catalog.freeTiers.forEach((freeTier, freeTierIndex) => {
      if (freeTier.compatibleOfferIds.length === 0 && freeTier.compatiblePriceKinds.length > 0) {
        context.addIssue({
          code: 'custom',
          path: ['freeTiers', freeTierIndex, 'compatiblePriceKinds'],
          message: 'Display-only free tiers cannot declare applicable price components',
        })
      }
      if (freeTier.compatibleOfferIds.length > 0 && freeTier.compatiblePriceKinds.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['freeTiers', freeTierIndex, 'compatiblePriceKinds'],
          message: 'Engine-applicable free tiers require at least one price component kind',
        })
      }
      if (freeTier.compatibleOfferIds.length > 0) {
        const quotaKind = priceKindForFreeTierUnit(freeTier.quota.unit)
        for (const priceKind of freeTier.compatiblePriceKinds) {
          if (quotaKind !== priceKind) {
            context.addIssue({
              code: 'custom',
              path: ['freeTiers', freeTierIndex, 'quota', 'unit'],
              message: `Quota unit ${freeTier.quota.unit} must map to ${priceKind}`,
            })
          }
        }
      }
      freeTier.compatibleOfferIds.forEach((offerId, offerIdIndex) => {
        const compatibleOffer = offersById.get(offerId)
        const path = ['freeTiers', freeTierIndex, 'compatibleOfferIds', offerIdIndex]
        if (!compatibleOffer) {
          context.addIssue({ code: 'custom', path, message: `Unknown compatible offer ID: ${offerId}` })
          return
        }
        if (compatibleOffer.providerId !== freeTier.providerId || compatibleOffer.category !== freeTier.category) {
          context.addIssue({
            code: 'custom',
            path,
            message: `Compatible offer ${offerId} must share provider and category`,
          })
        }
        for (const priceKind of freeTier.compatiblePriceKinds) {
          if (!compatibleOffer.prices.some((component) => component.kind === priceKind)) {
            context.addIssue({
              code: 'custom',
              path: ['freeTiers', freeTierIndex, 'compatiblePriceKinds'],
              message: `Compatible offer ${offerId} has no ${priceKind} component`,
            })
          }
        }
      })
    })
  })
