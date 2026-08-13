import {
  scenarioUsageDimensions,
  type Offer,
  type Scenario,
  type ScenarioUsageDimension,
  type ServiceCategory,
} from './catalog'

export interface CategoryCoverageEvaluation {
  complete: boolean
  missingDimensions: ScenarioUsageDimension[]
}

function uniqueDimensions(dimensions: readonly ScenarioUsageDimension[]): ScenarioUsageDimension[] {
  return [...new Set(dimensions)]
}

export function assignedDimensionsForCategory(
  scenario: Scenario,
  category: ServiceCategory,
): ScenarioUsageDimension[] {
  return uniqueDimensions(scenario.coverageByCategory[category] ?? [])
}

export function unassignedScenarioDimensions(scenario: Scenario): ScenarioUsageDimension[] {
  const assigned = new Set(
    scenario.requiredCategories.flatMap((category) => assignedDimensionsForCategory(scenario, category)),
  )
  return scenarioUsageDimensions.filter((dimension) => scenario[dimension] > 0 && !assigned.has(dimension))
}

export function projectScenarioForCategory(scenario: Scenario, category: ServiceCategory): Scenario {
  const assigned = new Set(assignedDimensionsForCategory(scenario, category))
  const projected = { ...scenario, requiredCategories: [category] }
  for (const dimension of scenarioUsageDimensions) {
    projected[dimension] = assigned.has(dimension) ? scenario[dimension] : 0
  }
  return projected
}

function coversDimension(
  offer: Offer,
  scenario: Scenario,
  dimension: ScenarioUsageDimension,
): boolean {
  const priceKinds = new Set(offer.prices.map((component) => component.kind))
  switch (dimension) {
    case 'hoursPerMonth':
      return priceKinds.has('instance-hour') || priceKinds.has('flat-month')
    case 'vcpu':
      return offer.specs.vcpu !== undefined && offer.specs.vcpu >= scenario.vcpu
    case 'ramGb':
      return offer.specs.ramGb !== undefined && offer.specs.ramGb >= scenario.ramGb
    case 'storageGb':
      return priceKinds.has('storage-gb-month') ||
        (offer.specs.storageGb !== undefined && offer.specs.storageGb >= scenario.storageGb)
    case 'outboundGb':
      return priceKinds.has('outbound-gb') ||
        (offer.specs.outboundGb !== undefined && offer.specs.outboundGb >= scenario.outboundGb)
    case 'requestsMillion':
      return priceKinds.has('requests-million')
    case 'databaseGb':
      return priceKinds.has('database-gb-month') ||
        (offer.category === 'managed-database' &&
          offer.specs.storageGb !== undefined &&
          offer.specs.storageGb >= scenario.databaseGb)
    case 'gpuHours':
      return priceKinds.has('gpu-hour')
    case 'gpuVramGb':
      return offer.specs.gpuVramGb !== undefined && offer.specs.gpuVramGb >= scenario.gpuVramGb
  }
}

export function evaluateCategoryCoverage(
  offer: Offer,
  scenario: Scenario,
  category: ServiceCategory = offer.category,
): CategoryCoverageEvaluation {
  const projection = projectScenarioForCategory(scenario, category)
  const dimensions = assignedDimensionsForCategory(scenario, category)
  const missingDimensions = dimensions.filter(
    (dimension) => projection[dimension] > 0 && !coversDimension(offer, projection, dimension),
  )
  return {
    complete: offer.category === category && missingDimensions.length === 0,
    missingDimensions,
  }
}
