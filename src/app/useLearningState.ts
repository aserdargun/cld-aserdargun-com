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

function deserializeLearningState(raw: string): LearningPersistedState {
  const parsed: unknown = JSON.parse(raw)
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown> : {}
  const saved = record(parsed)
  const pick = <T,>(value: unknown, valid: (entry: unknown) => entry is T): Record<string, T> =>
    Object.fromEntries(Object.entries(record(value)).filter(([, entry]) => valid(entry))) as Record<string, T>
  return {
    learnedIds: pick(saved.learnedIds, (entry): entry is true => entry === true),
    notes: pick(saved.notes, (entry): entry is string => typeof entry === 'string'),
    flashcard: pick(saved.flashcard, (entry): entry is FlashcardStatus =>
      entry === 'new' || entry === 'known' || entry === 'repeat'),
    lastVisited: typeof saved.lastVisited === 'string' ? saved.lastVisited : null,
  }
}

export function useLearningState() {
  const [state, setState, reset] = useLocalStorage<LearningPersistedState>(STORAGE_KEY, defaultState, { deserializer: deserializeLearningState })

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
