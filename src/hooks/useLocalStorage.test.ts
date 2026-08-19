import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default value when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('cld:key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('persists updates and re-hydrates on remount', () => {
    const { result, unmount } = renderHook(() => useLocalStorage('cld:greet', 'merhaba'))
    act(() => result.current[1]('selam'))
    expect(window.localStorage.getItem('cld:greet')).toBe(JSON.stringify('selam'))
    unmount()

    const second = renderHook(() => useLocalStorage('cld:greet', 'merhaba'))
    expect(second.result.current[0]).toBe('selam')
  })

  it('supports functional updaters', () => {
    const { result } = renderHook(() => useLocalStorage<number>('cld:n', 0))
    act(() => result.current[1]((previous) => previous + 1))
    act(() => result.current[1]((previous) => previous + 1))
    expect(result.current[0]).toBe(2)
    expect(JSON.parse(window.localStorage.getItem('cld:n') ?? '0')).toBe(2)
  })

  it('reset() clears the value back to default and removes the key', () => {
    const { result } = renderHook(() => useLocalStorage('cld:reset', { count: 1 }))
    act(() => result.current[1]({ count: 5 }))
    expect(result.current[0]).toEqual({ count: 5 })
    act(() => result.current[2]())
    expect(result.current[0]).toEqual({ count: 1 })
    expect(window.localStorage.getItem('cld:reset')).toBeNull()
  })

  it('falls back to default when stored payload is corrupted', () => {
    window.localStorage.setItem('cld:bad', 'not-json{')
    const { result } = renderHook(() => useLocalStorage('cld:bad', ['fallback']))
    expect(result.current[0]).toEqual(['fallback'])
  })

  it('uses custom serializer and deserializer when provided', () => {
    const { result } = renderHook(() =>
      useLocalStorage('cld:custom', 5, {
        serializer: (value) => `n=${value}`,
        deserializer: (raw) => Number(raw.replace('n=', '')),
      }),
    )
    act(() => result.current[1](9))
    expect(window.localStorage.getItem('cld:custom')).toBe('n=9')
    expect(result.current[0]).toBe(9)
  })
})
