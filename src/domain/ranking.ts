import type {
  Offer,
  ProviderId,
  Scenario,
  ScenarioUsageDimension,
  ServiceCategory,
  VerificationStatus,
} from './catalog'
import {
  assignedDimensionsForCategory,
  evaluateCategoryCoverage,
  projectScenarioForCategory,
  unassignedScenarioDimensions,
} from './coverage'
import { estimateOffer, type OfferEstimate, type PricingContext } from './pricing'

export interface ProviderEstimate {
  providerId: ProviderId
  totalUsd: number | null
  subtotalBeforeFreeTierUsd: number | null
  lineItems: OfferEstimate[]
  missingCategories: ServiceCategory[]
  missingDimensions: ScenarioUsageDimension[]
  status: VerificationStatus
}

export type ProviderPriceRank = 'best-price' | 'second-price' | null

export interface RankedProviderEstimate extends ProviderEstimate {
  rank: ProviderPriceRank
}

export function meetsCapacityRequirements(offer: Offer, scenario: Scenario): boolean {
  return evaluateCategoryCoverage(offer, scenario, offer.category).complete
}

function sumOrNull(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null || !Number.isFinite(value))) return null
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0)
  return Number.isFinite(sum) ? sum : null
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
  const missingDimensions = new Set<ScenarioUsageDimension>(unassignedScenarioDimensions(scenario))

  scenario.requiredCategories.forEach((category) => {
    const projection = projectScenarioForCategory(scenario, category)
    const candidates = offers
      .filter(
        (offer) =>
          offer.providerId === providerId &&
          offer.category === category &&
          offer.rankable &&
          evaluateCategoryCoverage(offer, scenario, category).complete,
      )
      .map((offer) => estimateOffer(offer, projection, context))
      .filter((estimate) => estimate.status !== 'invalid' && estimate.totalUsd !== null)
      .sort((left, right) => {
        const statusDifference = Number(left.status === 'stale') - Number(right.status === 'stale')
        return statusDifference !== 0
          ? statusDifference
          : (left.totalUsd ?? Infinity) - (right.totalUsd ?? Infinity)
      })

    const selected = candidates[0]
    if (selected) lineItems.push(selected)
    else {
      missingCategories.push(category)
      assignedDimensionsForCategory(scenario, category).forEach((dimension) => {
        if (projection[dimension] > 0) missingDimensions.add(dimension)
      })
    }
  })

  const isComplete = scenario.requiredCategories.length > 0 &&
    missingCategories.length === 0 && missingDimensions.size === 0 &&
    sumOrNull(lineItems.map((lineItem) => lineItem.totalUsd)) !== null
  return {
    providerId,
    totalUsd: isComplete ? sumOrNull(lineItems.map((lineItem) => lineItem.totalUsd)) : null,
    subtotalBeforeFreeTierUsd: isComplete
      ? sumOrNull(lineItems.map((lineItem) => lineItem.subtotalBeforeFreeTierUsd))
      : null,
    lineItems,
    missingCategories,
    missingDimensions: [...missingDimensions],
    status: providerStatus(lineItems, isComplete),
  }
}

function isComplete(estimate: ProviderEstimate): boolean {
  return estimate.missingCategories.length === 0 && estimate.missingDimensions.length === 0 && estimate.totalUsd !== null && Number.isFinite(estimate.totalUsd)
}

export function rankProviderEstimates(
  estimates: readonly ProviderEstimate[],
): RankedProviderEstimate[] {
  const sorted = estimates
    .map((estimate, index) => ({ estimate, index }))
    .sort((left, right) => {
      const group = (estimate: ProviderEstimate) => {
        if (!isComplete(estimate)) return 2
        return estimate.status === 'current' ? 0 : 1
      }
      const groupDifference = group(left.estimate) - group(right.estimate)
      if (groupDifference !== 0) return groupDifference

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
