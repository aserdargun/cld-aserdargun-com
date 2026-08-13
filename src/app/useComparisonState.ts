import { useCallback, useState } from 'react'
import { loadCatalog } from '../data/catalog'
import {
  providerIds,
  serviceCategories,
  type Provider,
  type ProviderId,
  type Scenario,
  type ServiceCategory,
} from '../domain/catalog'

export interface ComparisonState {
  scenario: Scenario
  selectedProviderIds: Set<ProviderId>
  selectedCategories: Set<ServiceCategory>
  selectedRegionKeys: Set<ProviderRegionKey>
  freeOnly: boolean
  includeStale: boolean
  selectScenario: (id: string) => void
  updateScenario: (patch: Partial<Scenario>) => void
  toggleProvider: (id: ProviderId) => void
  toggleCategory: (id: ServiceCategory) => void
  toggleRegion: (providerId: ProviderId, regionId: string) => void
  setFreeOnly: (value: boolean) => void
  setIncludeStale: (value: boolean) => void
  resetScenario: () => void
}

export type ProviderRegionKey = `${ProviderId}:${string}`

export function providerRegionKey(providerId: ProviderId, regionId: string): ProviderRegionKey {
  return `${providerId}:${regionId}`
}

export function resolveInitialScenario(presets: readonly Scenario[]): Scenario {
  const smallWebApp = presets.find((scenario) => scenario.id === 'small-web-app')
  if (!smallWebApp) {
    throw new Error('Comparison state requires the small-web-app scenario')
  }
  return smallWebApp
}

function scenarioForId(presets: readonly Scenario[], id: string): Scenario | undefined {
  return presets.find((scenario) => scenario.id === id)
}

function toggleInSet<T>(selected: Set<T>, id: T): Set<T> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function useComparisonState(
  providedScenarioPresets?: readonly Scenario[],
  providedProviders?: readonly Provider[],
): ComparisonState {
  const fallbackCatalog = providedScenarioPresets === undefined || providedProviders === undefined
    ? loadCatalog()
    : null
  const scenarioPresets = providedScenarioPresets ?? fallbackCatalog!.scenarios
  const providers = providedProviders ?? fallbackCatalog!.providers
  const [scenario, setScenario] = useState<Scenario>(() => resolveInitialScenario(scenarioPresets))
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<ProviderId>>(() => new Set(providerIds))
  const [selectedCategories, setSelectedCategories] = useState<Set<ServiceCategory>>(
    () => new Set(serviceCategories),
  )
  const [selectedRegionKeys, setSelectedRegionKeys] = useState<Set<ProviderRegionKey>>(
    () => new Set(providers.flatMap((provider) => (
      provider.regions.map((region) => providerRegionKey(provider.id, region.id))
    ))),
  )
  const [freeOnly, setFreeOnly] = useState(false)
  const [includeStale, setIncludeStale] = useState(false)

  const selectScenario = useCallback((id: string) => {
    const preset = scenarioForId(scenarioPresets, id)
    if (preset) setScenario(preset)
  }, [scenarioPresets])

  const updateScenario = useCallback((patch: Partial<Scenario>) => {
    setScenario((current) => ({ ...current, ...patch }))
  }, [])

  const toggleProvider = useCallback((id: ProviderId) => {
    setSelectedProviderIds((current) => toggleInSet(current, id))
  }, [])

  const toggleCategory = useCallback((id: ServiceCategory) => {
    setSelectedCategories((current) => toggleInSet(current, id))
  }, [])

  const toggleRegion = useCallback((providerId: ProviderId, regionId: string) => {
    setSelectedRegionKeys((current) => toggleInSet(current, providerRegionKey(providerId, regionId)))
  }, [])

  const resetScenario = useCallback(() => {
    setScenario((current) => (
      scenarioForId(scenarioPresets, current.id) ?? resolveInitialScenario(scenarioPresets)
    ))
  }, [scenarioPresets])

  return {
    scenario,
    selectedProviderIds,
    selectedCategories,
    selectedRegionKeys,
    freeOnly,
    includeStale,
    selectScenario,
    updateScenario,
    toggleProvider,
    toggleCategory,
    toggleRegion,
    setFreeOnly,
    setIncludeStale,
    resetScenario,
  }
}
