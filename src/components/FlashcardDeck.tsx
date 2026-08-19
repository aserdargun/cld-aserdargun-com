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

  const handleNext = () => {
    setRevealed(false)
  }

  const handleMark = (entry: GlossaryTerm, status: FlashcardStatus) => {
    onStatusChange(entry.term, status)
    handleNext()
  }

  if (filtered.length === 0) {
    return (
      <div className="flashcard" data-testid="flashcard-deck">
        <p className="flashcard__empty">
          {filter === 'repeat'
            ? 'Tekrar kuyruğu boş. Tüm kartlar biliyorum olarak işaretlenmiş olabilir.'
            : 'Gösterilecek kart yok.'}
        </p>
        <button type="button" onClick={onReset} className="flashcard__reset">
          İlerlemeyi sıfırla
        </button>
      </div>
    )
  }

  const current = filtered[0]!
  const status: FlashcardStatus = statuses[current.term] ?? 'new'

  return (
    <div className="flashcard" data-testid="flashcard-deck">
      <div className="flashcard__toolbar">
        <div className="flashcard__filters" role="tablist" aria-label="Flashcard filtresi">
          {(['all', 'repeat', 'new'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => {
                setFilter(value)
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

      <article
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
      </article>

      <footer className="flashcard__footer">
        <button
          type="button"
          onClick={onReset}
          className="flashcard__reset"
          data-testid="flashcard-reset"
        >
          İlerlemeyi sıfırla
        </button>
      </footer>
    </div>
  )
}
