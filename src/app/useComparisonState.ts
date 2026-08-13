import { useCallback, useState } from 'react'
import { loadCatalog } from '../data/catalog'
import {
  providerIds,
  serviceCategories,
  type ProviderId,
  type Scenario,
  type ServiceCategory,
} from '../domain/catalog'

export interface ComparisonState {
  scenario: Scenario
  selectedProviderIds: Set<ProviderId>
  selectedCategories: Set<ServiceCategory>
  freeOnly: boolean
  includeStale: boolean
  selectScenario: (id: string) => void
  updateScenario: (patch: Partial<Scenario>) => void
  toggleProvider: (id: ProviderId) => void
  toggleCategory: (id: ServiceCategory) => void
  setFreeOnly: (value: boolean) => void
  setIncludeStale: (value: boolean) => void
  resetScenario: () => void
}

const scenarios = loadCatalog().scenarios

function defaultScenario(): Scenario {
  const firstScenario = scenarios[0]
  if (!firstScenario) {
    throw new Error('Comparison state requires at least one scenario')
  }
  return firstScenario
}

function scenarioForId(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}

function toggleInSet<T>(selected: Set<T>, id: T): Set<T> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function useComparisonState(): ComparisonState {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario)
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<ProviderId>>(() => new Set(providerIds))
  const [selectedCategories, setSelectedCategories] = useState<Set<ServiceCategory>>(
    () => new Set(serviceCategories),
  )
  const [freeOnly, setFreeOnly] = useState(false)
  const [includeStale, setIncludeStale] = useState(false)

  const selectScenario = useCallback((id: string) => {
    const preset = scenarioForId(id)
    if (preset) setScenario(preset)
  }, [])

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setScenario((current) => ({ ...current, ...patch }))
  }, [])

  const toggleProvider = useCallback((id: ProviderId) => {
    setSelectedProviderIds((current) => toggleInSet(current, id))
  }, [])

  const toggleCategory = useCallback((id: ServiceCategory) => {
    setSelectedCategories((current) => toggleInSet(current, id))
  }, [])

  const resetScenario = useCallback(() => {
    setScenario((current) => scenarioForId(current.id) ?? defaultScenario())
  }, [])

  return {
    scenario,
    selectedProviderIds,
    selectedCategories,
    freeOnly,
    includeStale,
    selectScenario,
    updateScenario,
    toggleProvider,
    toggleCategory,
    setFreeOnly,
    setIncludeStale,
    resetScenario,
  }
}
