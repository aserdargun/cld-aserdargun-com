import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLearningState } from './useLearningState'

afterEach(() => localStorage.clear())

describe('learning persistence recovery', () => {
  it.each(['null', '[]', '42', '{}', '{broken'])('recovers from an invalid stored shape: %s', (raw) => {
    localStorage.setItem('cld:learning:v1', raw)
    const { result } = renderHook(useLearningState)
    expect(result.current.isLearned('concept:iaas')).toBe(false)
    act(() => result.current.setNote('notes', 'Still usable'))
    expect(result.current.state.notes.notes).toBe('Still usable')
  })

  it('preserves valid notes and progress while discarding invalid fields', () => {
    localStorage.setItem('cld:learning:v1', JSON.stringify({
      learnedIds: { valid: true, wrong: 'true' }, notes: { valid: 'My note', wrong: {} },
      flashcard: { vCPU: 'known', RAM: 'invalid' }, lastVisited: 12,
    }))
    const { result } = renderHook(useLearningState)
    expect(result.current.state).toEqual({
      learnedIds: { valid: true }, notes: { valid: 'My note' },
      flashcard: { vCPU: 'known' }, lastVisited: null,
    })
  })

  it('clears progress when another tab clears local storage', () => {
    const { result } = renderHook(useLearningState)
    act(() => result.current.markLearned('concept:iaas', true))
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null })))
    expect(result.current.progress).toBe(0)
  })
})
