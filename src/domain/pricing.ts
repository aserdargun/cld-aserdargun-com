import type {
  Currency,
  ExchangeRate,
  FreeTier,
  Offer,
  PriceComponent,
  PriceKind,
  Scenario,
  VerificationStatus,
} from './catalog'

export interface ExchangeRateInput {
  id?: string
  base: ExchangeRate['base']
  quote: ExchangeRate['quote']
  rate: number
  date?: string
}

export interface PricingContext {
  exchangeRates: readonly ExchangeRateInput[]
  freeTiers: readonly FreeTier[]
  eligibleFreeTierIds?: readonly string[]
  monthsSinceAccountCreation?: number
  statusByOfferId?: Readonly<Record<string, VerificationStatus>>
  statusByFreeTierId?: Readonly<Record<string, VerificationStatus>>
  statusByExchangeRateId?: Readonly<Record<string, VerificationStatus>>
}

export interface CurrencyConversion {
  amountUsd: number | null
  converted: boolean
}

export function selectEurUsdExchangeRate<T extends ExchangeRateInput>(
  exchangeRates: readonly T[],
  verifiedAt?: string,
): T | null {
  const matchingRates = exchangeRates.filter(
    (exchangeRate) =>
      exchangeRate.base === 'EUR' &&
      exchangeRate.quote === 'USD' &&
      (!verifiedAt || (exchangeRate.date !== undefined && exchangeRate.date <= verifiedAt)),
  )

  return matchingRates.reduce<T | null>((latest, exchangeRate) => {
    if (!latest || (exchangeRate.date ?? '') > (latest.date ?? '')) return exchangeRate
    return latest
  }, null)
}

export interface PriceLineItemEstimate {
  component: PriceComponent
  quantity: number
  includedQuantity: number
  freeTierQuantity: number
  subtotalBeforeFreeTierUsd: number | null
  freeTierSavingsUsd: number | null
  totalUsd: number | null
}

export interface OfferEstimate {
  offer: Offer
  status: VerificationStatus
  lineItems: PriceLineItemEstimate[]
  subtotalBeforeFreeTierUsd: number | null
  freeTierSavingsUsd: number | null
  totalUsd: number | null
}

const quantityByKind: Record<PriceKind, (scenario: Scenario) => number> = {
  'instance-hour': (scenario) => scenario.hoursPerMonth,
  'flat-month': () => 1,
  'storage-gb-month': (scenario) => scenario.storageGb,
  'outbound-gb': (scenario) => scenario.outboundGb,
  'requests-million': (scenario) => scenario.requestsMillion,
  'database-gb-month': (scenario) => scenario.databaseGb,
  'gpu-hour': (scenario) => scenario.gpuHours,
}

export const priceKindByFreeTierUnit: Readonly<Record<string, PriceKind>> = {
  'instance-hours': 'instance-hour',
  'storage-gb-month': 'storage-gb-month',
  'outbound-gb': 'outbound-gb',
  'million requests': 'requests-million',
  'database-gb-month': 'database-gb-month',
  'gpu-hours': 'gpu-hour',
}

function normalizedUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function priceKindForFreeTierUnit(unit: string): PriceKind | null {
  return priceKindByFreeTierUnit[normalizedUnit(unit)] ?? null
}

export function convertToUsd(
  amount: number,
  currency: Currency,
  exchangeRates: readonly ExchangeRateInput[],
  verifiedAt?: string,
): CurrencyConversion {
  if (currency === 'USD') return { amountUsd: amount, converted: true }

  const latestRate = selectEurUsdExchangeRate(exchangeRates, verifiedAt)

  return latestRate
    ? { amountUsd: amount * latestRate.rate, converted: true }
    : { amountUsd: null, converted: false }
}

interface FreeTierAllocation {
  quantity: number
  statuses: VerificationStatus[]
}

function allocateFreeTierQuantity(
  offer: Offer,
  component: PriceComponent,
  context: PricingContext,
  remainingQuotaById: Map<string, number>,
  maximumQuantity: number,
): FreeTierAllocation {
  const eligibleIds = new Set(context.eligibleFreeTierIds ?? [])
  return context.freeTiers.reduce<FreeTierAllocation>((allocation, freeTier) => {
    const isEligible = eligibleIds.has(freeTier.id)
    const isWithinDuration =
      freeTier.durationMonths === null ||
      (context.monthsSinceAccountCreation !== undefined &&
        context.monthsSinceAccountCreation <= freeTier.durationMonths)
    const quotaKind = priceKindForFreeTierUnit(freeTier.quota.unit)
    const isMatchingQuota =
      freeTier.quota.period === 'month' && quotaKind !== null && quotaKind === component.kind
    const isCompatibleOffer = freeTier.compatibleOfferIds.includes(offer.id)
    const isCompatibleComponent = freeTier.compatiblePriceKinds.includes(component.kind)
    const status = context.statusByFreeTierId?.[freeTier.id] ?? 'invalid'
    const remainingQuota = remainingQuotaById.get(freeTier.id) ?? freeTier.quota.amount
    const allocatedQuantity = Math.min(remainingQuota, Math.max(0, maximumQuantity - allocation.quantity))

    if (isEligible &&
      isWithinDuration &&
      isMatchingQuota &&
      isCompatibleOffer &&
      isCompatibleComponent &&
      freeTier.providerId === offer.providerId &&
      freeTier.category === offer.category &&
      status !== 'invalid' &&
      allocatedQuantity > 0) {
      remainingQuotaById.set(freeTier.id, remainingQuota - allocatedQuantity)
      return { quantity: allocation.quantity + allocatedQuantity, statuses: [...allocation.statuses, status] }
    }

    return allocation
  }, { quantity: 0, statuses: [] })
}

function estimateLineItem(
  offer: Offer,
  component: PriceComponent,
  scenario: Scenario,
  context: PricingContext,
  remainingQuotaById: Map<string, number>,
  usedStaleFreeTier: { value: boolean },
): PriceLineItemEstimate {
  const quantity = quantityByKind[component.kind](scenario)
  const chargeableQuantity = Math.max(0, quantity - component.includedQuantity)
  const allocation = allocateFreeTierQuantity(
    offer,
    component,
    context,
    remainingQuotaById,
    chargeableQuantity,
  )
  const tierQuantity = allocation.quantity
  if (allocation.statuses.includes('stale')) usedStaleFreeTier.value = true
  const beforeFreeTier = Math.min(chargeableQuantity * component.price, component.monthlyCap ?? Infinity)
  const afterFreeTier = Math.min(
    Math.max(0, chargeableQuantity - tierQuantity) * component.price,
    component.monthlyCap ?? Infinity,
  )
  const subtotal = convertToUsd(beforeFreeTier, component.currency, context.exchangeRates, offer.verifiedAt).amountUsd
  const total = convertToUsd(afterFreeTier, component.currency, context.exchangeRates, offer.verifiedAt).amountUsd

  return {
    component,
    quantity,
    includedQuantity: component.includedQuantity,
    freeTierQuantity: tierQuantity,
    subtotalBeforeFreeTierUsd: subtotal,
    freeTierSavingsUsd: subtotal === null || total === null ? null : subtotal - total,
    totalUsd: total,
  }
}

function sumOrNull(values: readonly (number | null)[]): number | null {
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

export function estimateOffer(offer: Offer, scenario: Scenario, context: PricingContext): OfferEstimate {
  const exchangeRates = context.statusByExchangeRateId === undefined
    ? context.exchangeRates
    : context.exchangeRates.filter((exchangeRate) =>
      exchangeRate.id !== undefined && context.statusByExchangeRateId?.[exchangeRate.id] === 'current')
  const effectiveContext = exchangeRates === context.exchangeRates
    ? context
    : { ...context, exchangeRates }
  const remainingQuotaById = new Map<string, number>()
  const usedStaleFreeTier = { value: false }
  const lineItems = offer.prices.map((component) =>
    estimateLineItem(offer, component, scenario, effectiveContext, remainingQuotaById, usedStaleFreeTier),
  )
  const offerStatus = context.statusByOfferId?.[offer.id] ?? 'invalid'
  const hasPrices = lineItems.length > 0
  const hasInvalidPricing = !hasPrices || lineItems.some(
    (lineItem) => lineItem.subtotalBeforeFreeTierUsd === null || lineItem.totalUsd === null,
  )
  const status = offerStatus === 'invalid' || hasInvalidPricing
    ? 'invalid'
    : usedStaleFreeTier.value
      ? 'stale'
      : offerStatus

  return {
    offer,
    status,
    lineItems,
    subtotalBeforeFreeTierUsd: hasPrices
      ? sumOrNull(lineItems.map((lineItem) => lineItem.subtotalBeforeFreeTierUsd))
      : null,
    freeTierSavingsUsd: hasPrices ? sumOrNull(lineItems.map((lineItem) => lineItem.freeTierSavingsUsd)) : null,
    totalUsd: hasPrices ? sumOrNull(lineItems.map((lineItem) => lineItem.totalUsd)) : null,
  }
}
