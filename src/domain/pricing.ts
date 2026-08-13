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
}

export interface CurrencyConversion {
  amountUsd: number | null
  converted: boolean
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

const kindByFreeTierUnit: Record<string, PriceKind> = {
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

export function convertToUsd(
  amount: number,
  currency: Currency,
  exchangeRates: readonly ExchangeRateInput[],
  verifiedAt?: string,
): CurrencyConversion {
  if (currency === 'USD') return { amountUsd: amount, converted: true }

  const matchingRates = exchangeRates.filter(
    (exchangeRate) =>
      exchangeRate.base === 'EUR' &&
      exchangeRate.quote === 'USD' &&
      (!verifiedAt || !exchangeRate.date || exchangeRate.date <= verifiedAt),
  )
  const latestRate = matchingRates.reduce<ExchangeRateInput | undefined>((latest, exchangeRate) => {
    if (!latest || (exchangeRate.date ?? '') > (latest.date ?? '')) return exchangeRate
    return latest
  }, undefined)

  return latestRate
    ? { amountUsd: amount * latestRate.rate, converted: true }
    : { amountUsd: null, converted: false }
}

function freeTierQuantity(
  offer: Offer,
  component: PriceComponent,
  context: PricingContext,
): number {
  const eligibleIds = new Set(context.eligibleFreeTierIds ?? [])
  return context.freeTiers.reduce((total, freeTier) => {
    const isEligible = eligibleIds.has(freeTier.id)
    const isWithinDuration =
      freeTier.durationMonths === null ||
      (context.monthsSinceAccountCreation !== undefined &&
        context.monthsSinceAccountCreation <= freeTier.durationMonths)
    const quotaKind = kindByFreeTierUnit[normalizedUnit(freeTier.quota.unit)]
    const isMatchingQuota =
      freeTier.quota.period === 'month' && quotaKind !== undefined && quotaKind === component.kind

    return isEligible &&
      isWithinDuration &&
      isMatchingQuota &&
      freeTier.providerId === offer.providerId &&
      freeTier.category === offer.category
      ? total + freeTier.quota.amount
      : total
  }, 0)
}

function estimateLineItem(
  offer: Offer,
  component: PriceComponent,
  scenario: Scenario,
  context: PricingContext,
): PriceLineItemEstimate {
  const quantity = quantityByKind[component.kind](scenario)
  const chargeableQuantity = Math.max(0, quantity - component.includedQuantity)
  const tierQuantity = freeTierQuantity(offer, component, context)
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
  const lineItems = offer.prices.map((component) => estimateLineItem(offer, component, scenario, context))

  return {
    offer,
    status: context.statusByOfferId?.[offer.id] ?? 'current',
    lineItems,
    subtotalBeforeFreeTierUsd: sumOrNull(lineItems.map((lineItem) => lineItem.subtotalBeforeFreeTierUsd)),
    freeTierSavingsUsd: sumOrNull(lineItems.map((lineItem) => lineItem.freeTierSavingsUsd)),
    totalUsd: sumOrNull(lineItems.map((lineItem) => lineItem.totalUsd)),
  }
}
