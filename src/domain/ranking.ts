import type { Offer, ProviderId, Scenario, ServiceCategory, VerificationStatus } from './catalog'
import { estimateOffer, type OfferEstimate, type PricingContext } from './pricing'

export interface ProviderEstimate {
  providerId: ProviderId
  totalUsd: number | null
  subtotalBeforeFreeTierUsd: number | null
  lineItems: OfferEstimate[]
  missingCategories: ServiceCategory[]
  status: VerificationStatus
}

export type ProviderPriceRank = 'best-price' | 'second-price' | null

export interface RankedProviderEstimate extends ProviderEstimate {
  rank: ProviderPriceRank
}

function meetsCapacityRequirements(offer: Offer, scenario: Scenario): boolean {
  const hasRequiredVcpu = scenario.vcpu === 0 || (offer.specs.vcpu ?? 0) >= scenario.vcpu
  const hasRequiredRam = scenario.ramGb === 0 || (offer.specs.ramGb ?? 0) >= scenario.ramGb
  const hasRequiredGpu = scenario.gpuVramGb === 0 || (offer.specs.gpuVramGb ?? 0) >= scenario.gpuVramGb
  return hasRequiredVcpu && hasRequiredRam && hasRequiredGpu
}

function sumOrNull(values: readonly (number | null)[]): number | null {
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function providerStatus(lineItems: readonly OfferEstimate[], isComplete: boolean): VerificationStatus {
  if (!isComplete) return 'invalid'
  return lineItems.some((lineItem) => lineItem.status === 'stale') ? 'stale' : 'current'
}

export function estimateProvider(
  providerId: ProviderId,
  offers: readonly Offer[],
  scenario: Scenario,
  context: PricingContext,
): ProviderEstimate {
  const lineItems: OfferEstimate[] = []
  const missingCategories: ServiceCategory[] = []

  scenario.requiredCategories.forEach((category) => {
    const candidates = offers
      .filter(
        (offer) =>
          offer.providerId === providerId && offer.category === category && meetsCapacityRequirements(offer, scenario),
      )
      .map((offer) => estimateOffer(offer, scenario, context))
      .filter((estimate) => estimate.status !== 'invalid' && estimate.totalUsd !== null)
      .sort((left, right) => (left.totalUsd ?? Infinity) - (right.totalUsd ?? Infinity))

    const selected = candidates[0]
    if (selected) lineItems.push(selected)
    else missingCategories.push(category)
  })

  const isComplete = missingCategories.length === 0
  return {
    providerId,
    totalUsd: isComplete ? sumOrNull(lineItems.map((lineItem) => lineItem.totalUsd)) : null,
    subtotalBeforeFreeTierUsd: isComplete
      ? sumOrNull(lineItems.map((lineItem) => lineItem.subtotalBeforeFreeTierUsd))
      : null,
    lineItems,
    missingCategories,
    status: providerStatus(lineItems, isComplete),
  }
}

function isComplete(estimate: ProviderEstimate): boolean {
  return estimate.missingCategories.length === 0 && estimate.totalUsd !== null
}

export function rankProviderEstimates(
  estimates: readonly ProviderEstimate[],
): RankedProviderEstimate[] {
  const sorted = estimates
    .map((estimate, index) => ({ estimate, index }))
    .sort((left, right) => {
      const completeness = Number(isComplete(right.estimate)) - Number(isComplete(left.estimate))
      if (completeness !== 0) return completeness

      const totalDifference = (left.estimate.totalUsd ?? Infinity) - (right.estimate.totalUsd ?? Infinity)
      return totalDifference !== 0 ? totalDifference : left.index - right.index
    })
    .map(({ estimate }) => estimate)

  let currentRank = 0
  return sorted.map((estimate) => {
    const qualifiesForRank = isComplete(estimate) && estimate.status === 'current'
    const rank: ProviderPriceRank = qualifiesForRank
      ? currentRank++ === 0
        ? 'best-price'
        : currentRank === 2
          ? 'second-price'
          : null
      : null

    return { ...estimate, rank }
  })
}
