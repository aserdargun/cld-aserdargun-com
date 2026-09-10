import { useMemo, useState } from 'react'
import { glossary, type GlossaryTerm } from '../data/education'
import type { FlashcardStatus } from '../app/useLearningState'

interface FlashcardDeckProps {
  /** Kart durumları ve güncelleyici. */
  statuses: Record<string, FlashcardStatus>
  onStatusChange: (termId: string, status: FlashcardStatus) => void
  onReset: () => void
}

const STATUS_LABEL: Record<FlashcardStatus, string> = {
  new: 'Yeni',
  known: 'Biliyorum',
  repeat: 'Tekrar',
}

const STATUS_CLASS: Record<FlashcardStatus, string> = {
  new: 'is-new',
  known: 'is-known',
  repeat: 'is-repeat',
}

type DeckFilter = 'all' | 'repeat' | 'new'

/**
 * Sözlükten üretilen flashcard destesi.
 * Kart çevirme, "Biliyorum / Tekrar" işaretleme ve tekrar kuyruğu.
 */
export function FlashcardDeck({ statuses, onStatusChange, onReset }: FlashcardDeckProps) {
  const [filter, setFilter] = useState<DeckFilter>('all')
  const [revealed, setRevealed] = useState(false)
  const [currentTerm, setCurrentTerm] = useState(glossary[0]?.term)

  const filtered = useMemo(() => {
    if (filter === 'repeat') {
      return glossary.filter((entry) => statuses[entry.term] === 'repeat')
    }
    if (filter === 'new') {
      return glossary.filter((entry) => statuses[entry.term] !== 'known')
    }
    return glossary
  }, [filter, statuses])

  const counts = useMemo(() => {
    const total = glossary.length
    const known = glossary.filter((entry) => statuses[entry.term] === 'known').length
    const repeat = glossary.filter((entry) => statuses[entry.term] === 'repeat').length
    const fresh = total - known
    return { total, known, repeat, fresh }
  }, [statuses])

  const current = filtered.find((entry) => entry.term === currentTerm) ?? filtered[0]
  const currentIndex = current ? filtered.indexOf(current) : 0
  const status: FlashcardStatus = current ? statuses[current.term] ?? 'new' : 'new'

  const handleMark = (entry: GlossaryTerm, nextStatus: FlashcardStatus) => {
    setCurrentTerm(filtered[(currentIndex + 1) % filtered.length]?.term)
    setRevealed(false)
    onStatusChange(entry.term, nextStatus)
  }

  const resetDeck = () => {
    setFilter('all')
    setCurrentTerm(glossary[0]?.term)
    setRevealed(false)
    onReset()
  }

  return (
    <div className="flashcard" data-testid="flashcard-deck">
      <div className="flashcard__toolbar">
        <div className="flashcard__filters" role="group" aria-label="Flashcard filtresi">
          {(['all', 'repeat', 'new'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value)
                setCurrentTerm(undefined)
                setRevealed(false)
              }}
              className={`flashcard__filter${filter === value ? ' is-active' : ''}`}
              data-testid={`flashcard-filter-${value}`}
            >
              {value === 'all' ? 'Tümü' : value === 'repeat' ? 'Tekrar kuyruğu' : 'Yeni + Tekrar'}
            </button>
          ))}
        </div>
        <div className="flashcard__stats" role="status" aria-live="polite">
          <span><strong>{counts.known}</strong> / {counts.total} biliyorum</span>
          <span className="flashcard__stat-repeat"><strong>{counts.repeat}</strong> tekrar</span>
        </div>
      </div>

      {current ? <article
        className={`flashcard__card${revealed ? ' is-revealed' : ''}`}
        data-testid={`flashcard-card-${current.term}`}
      >
        <header className="flashcard__card-header">
          <span className={`flashcard__status flashcard__status--${STATUS_CLASS[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <span className="flashcard__count">
            {filtered.findIndex((entry) => entry.term === current.term) + 1} / {filtered.length}
          </span>
        </header>

        <div className="flashcard__face flashcard__face--front">
          <p className="flashcard__hint">Terim</p>
          <h4>{current.term}</h4>
        </div>

        {revealed ? (
          <div className="flashcard__face flashcard__face--back">
            <p className="flashcard__hint">Tanım</p>
            <p>{current.definition}</p>
            <p className="flashcard__example">
              <strong>Örnek:</strong> {current.example}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="flashcard__reveal"
            data-testid="flashcard-reveal"
          >
            Tanımı göster
          </button>
        )}

        {revealed ? (
          <div className="flashcard__actions">
            <button
              type="button"
              onClick={() => handleMark(current, 'repeat')}
              className="flashcard__action flashcard__action--repeat"
              data-testid="flashcard-mark-repeat"
            >
              Tekrar
            </button>
            <button
              type="button"
              onClick={() => handleMark(current, 'known')}
              className="flashcard__action flashcard__action--known"
              data-testid="flashcard-mark-known"
            >
              Biliyorum
            </button>
          </div>
        ) : null}
      </article> : (
        <p className="flashcard__empty" role="status">
          {filter === 'repeat' ? 'Tekrar kuyruğu boş.' : 'Bu filtrede gösterilecek kart yok.'}
          {' '}Diğer kartları görmek için Tümü filtresini seçebilirsin.
        </p>
      )}

      <footer className="flashcard__footer">
        <button
          type="button"
          onClick={resetDeck}
          className="flashcard__reset"
          data-testid="flashcard-reset"
        >
          İlerlemeyi sıfırla
        </button>
      </footer>
    </div>
  )
}
