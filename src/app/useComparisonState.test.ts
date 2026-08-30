import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import { providerIds } from '../domain/catalog'
import { resolveInitialScenario, useComparisonState } from './useComparisonState'

describe('useComparisonState', () => {
  it('starts with every provider and the small web app categories selected', () => {
    const catalog = loadCatalog()
    const { result } = renderHook(() => useComparisonState(catalog.scenarios, catalog.providers))

    expect(result.current.scenario.id).toBe('small-web-app')
    expect(result.current.selectedProviderIds).toEqual(new Set(providerIds))
    expect(result.current.selectedCategories).toEqual(new Set([
      'compute',
      'object-storage',
      'cdn-network',
    ]))
    expect(result.current.selectedRegionKeys).toEqual(new Set([
      'azure:westeurope',
      'gcp:europe-west1',
      'aws:eu-central-1',
      'aws:global',
      'hetzner:nbg1',
      'oracle:eu-frankfurt-1',
      'cloudflare:global',
      'digitalocean:fra1',
      'vultr:fra',
      'vultr:ams',
    ]))
    expect(result.current.freeOnly).toBe(false)
    expect(result.current.includeStale).toBe(false)
  })

  it('toggles provider-qualified regions without colliding on shared global ids', () => {
    const catalog = loadCatalog()
    const { result } = renderHook(() => useComparisonState(catalog.scenarios, catalog.providers))

    act(() => result.current.toggleRegion('aws', 'global'))

    expect(result.current.selectedRegionKeys.has('aws:global')).toBe(false)
    expect(result.current.selectedRegionKeys.has('cloudflare:global')).toBe(true)

    act(() => result.current.toggleRegion('aws', 'global'))

    expect(result.current.selectedRegionKeys.has('aws:global')).toBe(true)
  })

  it('starts with the small web app when scenario presets are reordered', () => {
    const reversedScenarios = [...loadCatalog().scenarios].reverse()

    expect(resolveInitialScenario(reversedScenarios).id).toBe('small-web-app')
  })

  it('rejects scenario presets that omit the required small web app', () => {
    const scenariosWithoutSmallWebApp = loadCatalog().scenarios.filter(
      (scenario) => scenario.id !== 'small-web-app',
    )

    expect(() => resolveInitialScenario(scenariosWithoutSmallWebApp)).toThrow(
      'Comparison state requires the small-web-app scenario',
    )
  })

  it('replaces selected categories with the selected GPU scenario requirements', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.selectScenario('ai-gpu'))

    expect(result.current.scenario.id).toBe('ai-gpu')
    expect(result.current.selectedCategories).toEqual(new Set(['gpu-ai']))
  })

  it('clears every offer filter without changing the current scenario', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.selectScenario('ai-gpu'))
    act(() => result.current.setFreeOnly(true))
    act(() => result.current.setIncludeStale(true))
    act(() => result.current.clearOfferFilters())

    expect(result.current.scenario.id).toBe('ai-gpu')
    expect(result.current.selectedProviderIds).toEqual(new Set())
    expect(result.current.selectedCategories).toEqual(new Set())
    expect(result.current.selectedRegionKeys).toEqual(new Set())
    expect(result.current.freeOnly).toBe(false)
    expect(result.current.includeStale).toBe(false)
  })

  it('restores all providers and regions with the current scenario categories', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.selectScenario('ai-gpu'))
    act(() => result.current.toggleProvider('azure'))
    act(() => result.current.toggleCategory('gpu-ai'))
    act(() => result.current.toggleRegion('aws', 'global'))
    act(() => result.current.setFreeOnly(true))
    act(() => result.current.setIncludeStale(true))
    act(() => result.current.resetOfferFiltersForScenario())

    expect(result.current.selectedProviderIds).toEqual(new Set(providerIds))
    expect(result.current.selectedCategories).toEqual(new Set(['gpu-ai']))
    expect(result.current.selectedRegionKeys.has('aws:global')).toBe(true)
    expect(result.current.selectedRegionKeys.has('cloudflare:global')).toBe(true)
    expect(result.current.selectedRegionKeys.size).toBe(10)
    expect(result.current.freeOnly).toBe(false)
    expect(result.current.includeStale).toBe(false)
  })

  it('toggles Azure without changing any other selected provider', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.toggleProvider('azure'))

    expect(result.current.selectedProviderIds.has('azure')).toBe(false)
    expect(result.current.selectedProviderIds).toEqual(new Set(providerIds.filter((id) => id !== 'azure')))
  })

  it('updates outbound traffic without discarding the remaining scenario inputs', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.updateScenario({ outboundGb: 100 }))

    expect(result.current.scenario.outboundGb).toBe(100)
    expect(result.current.scenario).toMatchObject({
      id: 'small-web-app',
      hoursPerMonth: 730,
      vcpu: 2,
      ramGb: 4,
      storageGb: 50,
    })
  })

  it('resets edits to the currently selected preset instead of the first preset', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.selectScenario('high-traffic'))
    act(() => result.current.updateScenario({ outboundGb: 1 }))
    act(() => result.current.resetScenario())

    expect(result.current.scenario).toMatchObject({
      id: 'high-traffic',
      outboundGb: 2000,
      vcpu: 8,
      ramGb: 16,
    })
  })
})
