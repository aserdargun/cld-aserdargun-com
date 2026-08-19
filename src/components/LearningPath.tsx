import { useEffect, useState } from 'react'

export interface LearningPathStep {
  id: string
  label: string
  href: string
}

interface LearningPathProps {
  steps: readonly LearningPathStep[]
  /** Bölüm başına öğrenildi durumu. */
  learnedByStep: Record<string, number>
  totalPerStep: Record<string, number>
  /** localStorage'da saklanan son ziyaret kimliği. */
  lastVisited: string | null
  onVisit: (id: string) => void
}

/**
 * Öğren bölümünün üstünde görünen sıralı yol haritası.
 * - Adımlar arası Önceki / Sonraki düğmeleri
 * - Her adımın altında küçük ilerleme çubuğu
 * - Son ziyaret edilen adım hafızada tutulur
 */
export function LearningPath({ steps, learnedByStep, totalPerStep, lastVisited, onVisit }: LearningPathProps) {
  const initialIndex = lastVisited
    ? Math.max(0, steps.findIndex((step) => step.id === lastVisited))
    : 0
  const [activeIndex, setActiveIndex] = useState(Math.min(initialIndex, steps.length - 1))

  useEffect(() => {
    const step = steps[activeIndex]
    if (step) onVisit(step.id)
  }, [activeIndex, steps, onVisit])

  const goPrev = () => {
    setActiveIndex((index) => Math.max(0, index - 1))
  }
  const goNext = () => {
    setActiveIndex((index) => Math.min(steps.length - 1, index + 1))
  }

  const currentStep = steps[activeIndex]
  const totalLearned = steps.reduce((sum, step) => sum + (learnedByStep[step.id] ?? 0), 0)
  const totalItems = steps.reduce((sum, step) => sum + (totalPerStep[step.id] ?? 0), 0)
  const overallPercent = totalItems === 0 ? 0 : Math.round((totalLearned / totalItems) * 100)

  return (
    <nav className="learning-path" aria-label="Sıralı öğrenme yolu" data-testid="learning-path">
      <div className="learning-path__header">
        <div>
          <h3>Sıralı öğrenme yolu</h3>
          <p>Yukarıdan aşağıya 9 adım. Her adımda “Öğrendim” işaretleyebilir, altta kişisel not bırakabilirsin.</p>
        </div>
        <div className="learning-path__progress" role="status" aria-live="polite">
          <strong>{totalLearned}</strong> / {totalItems} öğrenildi
          <span className="learning-path__progress-bar" aria-hidden="true">
            <span
              className="learning-path__progress-fill"
              style={{ width: `${overallPercent}%` }}
              data-testid="learning-path-progress-fill"
            />
          </span>
        </div>
      </div>

      <ol className="learning-path__steps">
        {steps.map((step, index) => {
          const learned = learnedByStep[step.id] ?? 0
          const total = totalPerStep[step.id] ?? 0
          const isActive = index === activeIndex
          const isComplete = total > 0 && learned >= total
          return (
            <li
              key={step.id}
              className={`learning-path__step${isActive ? ' is-active' : ''}${isComplete ? ' is-complete' : ''}`}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="learning-path__step-button"
                aria-current={isActive ? 'step' : undefined}
                data-testid={`learning-path-step-${step.id}`}
              >
                <span className="learning-path__step-index">{index + 1}</span>
                <span className="learning-path__step-label">{step.label}</span>
                <span className="learning-path__step-progress">
                  {learned} / {total}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {currentStep ? (
        <div className="learning-path__nav">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="learning-path__nav-button"
            data-testid="learning-path-prev"
          >
            ← Önceki
          </button>
          <a
            href={currentStep.href}
            className="learning-path__nav-link"
            data-testid="learning-path-current"
          >
            Şu an: {currentStep.label}
          </a>
          <button
            type="button"
            onClick={goNext}
            disabled={activeIndex === steps.length - 1}
            className="learning-path__nav-button"
            data-testid="learning-path-next"
          >
            Sonraki →
          </button>
        </div>
      ) : null}
    </nav>
  )
}
