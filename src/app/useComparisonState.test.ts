import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { providerIds, serviceCategories } from '../domain/catalog'
import { useComparisonState } from './useComparisonState'

describe('useComparisonState', () => {
  it('starts with the small web app and every provider and category selected', () => {
    const { result } = renderHook(() => useComparisonState())

    expect(result.current.scenario.id).toBe('small-web-app')
    expect(result.current.selectedProviderIds).toEqual(new Set(providerIds))
    expect(result.current.selectedCategories).toEqual(new Set(serviceCategories))
    expect(result.current.freeOnly).toBe(false)
    expect(result.current.includeStale).toBe(false)
  })

  it('selects the GPU scenario without narrowing the category filter', () => {
    const { result } = renderHook(() => useComparisonState())

    act(() => result.current.selectScenario('ai-gpu'))

    expect(result.current.scenario.id).toBe('ai-gpu')
    expect(result.current.selectedCategories).toEqual(new Set(serviceCategories))
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
