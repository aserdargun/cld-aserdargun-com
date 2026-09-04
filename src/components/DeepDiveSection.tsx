import { deepDives, type DeepDive } from '../data/education'

interface DeepDiveSectionProps {
  onMarkLearned: (id: string, learned: boolean) => void
  isLearned: (id: string) => boolean
  onSetNote: (id: string, text: string) => void
  notes: Record<string, string>
}

/**
 * Konu derinleştirme bölümü.
 * Üç derinleştirme: Kubernetes’a giriş, Sunucusuz mimari, GPU/AI iş yükleri.
 * Her biri için: ön koşullar, adım adım yolculuk, akış şeması, sık yapılan hata,
 * sonraki adım önerisi, "Öğrendim" düğmesi ve kişisel not paneli.
 */
export function DeepDiveSection({ onMarkLearned, isLearned, onSetNote, notes }: DeepDiveSectionProps) {
  return (
    <section
      className="deep-dive page-section"
      id="derinleştirme"
      aria-labelledby="deep-dive-heading"
    >
      <header className="page-section__heading">
        <h2 id="deep-dive-heading">Konu derinleştirme</h2>
        <p>
          Servis kategorilerinin üstüne çıkan, kendi kendine öğrenilebilecek üç kısa yolculuk.
          Her yolculuk 4-5 adımdan oluşur; ön koşulları ve sonraki adımı açıkça yazılıdır.
        </p>
      </header>

      <div className="deep-dive__grid">
        {deepDives.map((dive) => (
          <DeepDiveCard
            key={dive.id}
            dive={dive}
            isLearned={isLearned(`deep-dive:${dive.id}`)}
            onMarkLearned={onMarkLearned}
            note={notes[`deep-dive:${dive.id}`] ?? ''}
            onSetNote={onSetNote}
          />
        ))}
      </div>
    </section>
  )
}

interface DeepDiveCardProps {
  dive: DeepDive
  isLearned: boolean
  onMarkLearned: (id: string, learned: boolean) => void
  note: string
  onSetNote: (id: string, text: string) => void
}

function DeepDiveCard({ dive, isLearned, onMarkLearned, note, onSetNote }: DeepDiveCardProps) {
  return (
    <article
      className={`deep-dive__card${isLearned ? ' is-learned' : ''}`}
      aria-labelledby={`dive-${dive.id}-heading`}
    >
      <header className="deep-dive__card-header">
        <div>
          <h3 id={`dive-${dive.id}-heading`}>{dive.title}</h3>
          <p>{dive.oneLiner}</p>
        </div>
        <button
          type="button"
          className={`learned-toggle${isLearned ? ' is-learned' : ''}`}
          aria-pressed={isLearned}
          onClick={() => onMarkLearned(`deep-dive:${dive.id}`, !isLearned)}
          data-testid={`learned-toggle-deep-dive:${dive.id}`}
        >
          <span aria-hidden="true" className="learned-toggle__icon">
            {isLearned ? '✓' : '○'}
          </span>
          <span>{isLearned ? 'Öğrenildi' : 'Öğrendim'}</span>
        </button>
      </header>

      <section className="deep-dive__prereq">
        <h4>Önce bilmen gereken</h4>
        <ul>
          {dive.prerequisites.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <ol className="deep-dive__steps">
        {dive.steps.map((step) => (
          <li key={step.title}>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>

      <section className="deep-dive__flow" aria-label={`${dive.title} akış şeması`}>
        <p className="deep-dive__flow-caption">{dive.architecture.caption}</p>
        <ol className="deep-dive__flow-list">
          {dive.architecture.flow.map((step, index) => (
            <li key={`${dive.id}-flow-${index}`}>
              <span className="deep-dive__flow-index">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="deep-dive__pitfall">
        <h4>Sık yapılan hata</h4>
        <p>{dive.pitfall}</p>
      </section>

      <section className="deep-dive__next">
        <h4>Sonraki adım</h4>
        <p>{dive.nextStep}</p>
      </section>

      <section className="notes-panel notes-panel--inline" aria-label={`${dive.title} kişisel not`}>
        <header className="notes-panel__header">
          <h4>Kişisel notun</h4>
        </header>
        <textarea
          className="notes-panel__textarea"
          rows={2}
          placeholder={`${dive.title} hakkında notun...`}
          value={note}
          onChange={(event) => onSetNote(`deep-dive:${dive.id}`, event.target.value)}
          data-testid={`notes-deep-dive:${dive.id}`}
        />
      </section>
    </article>
  )
}
