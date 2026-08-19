import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

/**
 * Eğitim bölümü için kişisel ilerleme durumu.
 *
 * - `learnedIds`: "Öğrendim" işaretlenen öğelerin ID'leri.
 * - `notes`: Bölüm başına serbest metin not.
 * - `flashcardState`: Flashcard modunda kart başına durum (known/repeat/new).
 *
 * Tüm alanlar `localStorage`'da saklanır; tek bir anahtar altında tutulur ki
 * anahtar alanı şişmesin.
 */

export type FlashcardStatus = 'new' | 'known' | 'repeat'

export interface LearningPersistedState {
  learnedIds: Record<string, true>
  notes: Record<string, string>
  flashcard: Record<string, FlashcardStatus>
  lastVisited: string | null
}

const STORAGE_KEY = 'cld:learning:v1'

const defaultState: LearningPersistedState = {
  learnedIds: {},
  notes: {},
  flashcard: {},
  lastVisited: null,
}

export function useLearningState() {
  const [state, setState, reset] = useLocalStorage<LearningPersistedState>(STORAGE_KEY, defaultState)

  const isLearned = useCallback(
    (id: string) => Boolean(state.learnedIds[id]),
    [state.learnedIds],
  )

  const toggleLearned = useCallback(
    (id: string) => {
      setState((previous) => {
        const next: LearningPersistedState = {
          ...previous,
          learnedIds: { ...previous.learnedIds },
        }
        if (next.learnedIds[id]) {
          delete next.learnedIds[id]
        } else {
          next.learnedIds[id] = true
        }
        return next
      })
    },
    [setState],
  )

  const markLearned = useCallback(
    (id: string, learned: boolean) => {
      setState((previous) => {
        const next: LearningPersistedState = {
          ...previous,
          learnedIds: { ...previous.learnedIds },
        }
        if (learned) {
          next.learnedIds[id] = true
        } else {
          delete next.learnedIds[id]
        }
        return next
      })
    },
    [setState],
  )

  const setNote = useCallback(
    (id: string, text: string) => {
      setState((previous) => {
        const next: LearningPersistedState = {
          ...previous,
          notes: { ...previous.notes },
        }
        if (text.trim() === '') {
          delete next.notes[id]
        } else {
          next.notes[id] = text
        }
        return next
      })
    },
    [setState],
  )

  const setFlashcardStatus = useCallback(
    (id: string, status: FlashcardStatus) => {
      setState((previous) => ({
        ...previous,
        flashcard: { ...previous.flashcard, [id]: status },
      }))
    },
    [setState],
  )

  const resetFlashcard = useCallback(() => {
    setState((previous) => ({ ...previous, flashcard: {} }))
  }, [setState])

  const recordVisit = useCallback(
    (id: string) => {
      setState((previous) => ({ ...previous, lastVisited: id }))
    },
    [setState],
  )

  const progress = useMemo(() => {
    const total = state.learnedIds ? Object.keys(state.learnedIds).length : 0
    return total
  }, [state.learnedIds])

  return {
    state,
    isLearned,
    toggleLearned,
    markLearned,
    setNote,
    setFlashcardStatus,
    resetFlashcard,
    recordVisit,
    progress,
    reset,
  } as const
}
