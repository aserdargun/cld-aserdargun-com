import { t } from '../i18n'
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
  new: t('Yeni'),
  known: t('Biliyorum'),
  repeat: t('Tekrar'),
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
  const [currentTerm, setCurrentTerm] = useState(glossary[0]?.id)

  const filtered = useMemo(() => {
    if (filter === 'repeat') {
      return glossary.filter((entry) => statuses[entry.id] === 'repeat')
    }
    if (filter === 'new') {
      return glossary.filter((entry) => statuses[entry.id] !== 'known')
    }
    return glossary
  }, [filter, statuses])

  const counts = useMemo(() => {
    const total = glossary.length
    const known = glossary.filter((entry) => statuses[entry.id] === 'known').length
    const repeat = glossary.filter((entry) => statuses[entry.id] === 'repeat').length
    const fresh = total - known
    return { total, known, repeat, fresh }
  }, [statuses])

  const current = filtered.find((entry) => entry.id === currentTerm) ?? filtered[0]
  const currentIndex = current ? filtered.indexOf(current) : 0
  const status: FlashcardStatus = current ? (statuses[current.id] ?? 'new') : 'new'

  const handleMark = (entry: GlossaryTerm, nextStatus: FlashcardStatus) => {
    setCurrentTerm(filtered[(currentIndex + 1) % filtered.length]?.id)
    setRevealed(false)
    onStatusChange(entry.id, nextStatus)
  }

  const resetDeck = () => {
    setFilter('all')
    setCurrentTerm(glossary[0]?.id)
    setRevealed(false)
    onReset()
  }

  return (
    <div className="flashcard" data-testid="flashcard-deck">
      <div className="flashcard__toolbar">
        <div className="flashcard__filters" role="group" aria-label={t('Flashcard filtresi')}>
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
              {value === 'all'
                ? t('Tümü')
                : value === 'repeat'
                  ? t('Tekrar kuyruğu')
                  : t('Yeni + Tekrar')}
            </button>
          ))}
        </div>
        <div className="flashcard__stats" role="status" aria-live="polite">
          <span>
            <strong>{counts.known}</strong> / {counts.total}
            {t(' biliyorum')}
          </span>
          <span className="flashcard__stat-repeat">
            <strong>{counts.repeat}</strong>
            {t(' tekrar')}
          </span>
        </div>
      </div>

      {current ? (
        <article
          className={`flashcard__card${revealed ? ' is-revealed' : ''}`}
          data-testid={`flashcard-card-${current.id}`}
        >
          <header className="flashcard__card-header">
            <span className={`flashcard__status flashcard__status--${STATUS_CLASS[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            <span className="flashcard__count">
              {filtered.findIndex((entry) => entry.id === current.id) + 1} / {filtered.length}
            </span>
          </header>

          <div className="flashcard__face flashcard__face--front">
            <p className="flashcard__hint">{t('Terim')}</p>
            <h4>{current.term}</h4>
          </div>

          {revealed ? (
            <div className="flashcard__face flashcard__face--back">
              <p className="flashcard__hint">{t('Tanım')}</p>
              <p>{current.definition}</p>
              <p className="flashcard__example">
                <strong>{t('Örnek:')}</strong> {current.example}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flashcard__reveal"
              data-testid="flashcard-reveal"
            >
              {t('Tanımı göster')}
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
                {t('Tekrar')}
              </button>
              <button
                type="button"
                onClick={() => handleMark(current, 'known')}
                className="flashcard__action flashcard__action--known"
                data-testid="flashcard-mark-known"
              >
                {t('Biliyorum')}
              </button>
            </div>
          ) : null}
        </article>
      ) : (
        <p className="flashcard__empty" role="status">
          {filter === 'repeat' ? t('Tekrar kuyruğu boş.') : t('Bu filtrede gösterilecek kart yok.')}{' '}
          {t('Diğer kartları görmek için Tümü filtresini seçebilirsin.')}
        </p>
      )}

      <footer className="flashcard__footer">
        <button
          type="button"
          onClick={resetDeck}
          className="flashcard__reset"
          data-testid="flashcard-reset"
        >
          {t('İlerlemeyi sıfırla')}
        </button>
      </footer>
    </div>
  )
}
