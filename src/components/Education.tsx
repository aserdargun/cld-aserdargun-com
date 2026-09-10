import { memo, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  CategoryIcon,
  LatencyMap,
  ResponsibilityPyramid,
  SavingsBar,
} from './Diagrams'
import { DeepDiveSection } from './DeepDiveSection'
import { FlashcardDeck } from './FlashcardDeck'
import { LearnedToggle } from './LearnedToggle'
import { LearningPath, type LearningPathStep } from './LearningPath'
import { NotesPanel } from './NotesPanel'
import {
  conceptLayers,
  deepDives,
  educationVersion,
  glossary,
  pricingModels,
  providerSnapshots,
  quizQuestions,
  regionLesson,
  serviceCategoryLessons,
  type QuizOptionId,
  type ServiceCategoryLesson,
} from '../data/education'
import { useLearningState } from '../app/useLearningState'
import type { ServiceCategory } from '../domain/catalog'

/**
 * "Öğren" bölümü.
 *
 * Üniversite öğrencisi düzeyinde, görsel destekli, kalıcı bilgi sağlamak için
 * kavramsal kartlar, diyagramlar, sözlük, bilgi testi, sıralı öğrenme yolu,
 * flashcard modu, kişisel notlar ve konu derinleştirmesi sunar.
 */

const subSections: readonly LearningPathStep[] = [
  { id: 'hizli-baslangic', label: 'Hızlı başlangıç', href: '#hizli-baslangic' },
  { id: 'bulut-bilesenleri', label: 'Bulut bileşenleri', href: '#bulut-bilesenleri' },
  { id: 'servis-kategorileri', label: 'Servis kategorileri', href: '#servis-kategorileri' },
  { id: 'fiyatlandirma', label: 'Fiyatlandırma', href: '#fiyatlandirma' },
  { id: 'bolge', label: 'Bölge ve gecikme', href: '#bolge' },
  { id: 'saglayicilar', label: 'Sağlayıcı kartları', href: '#saglayicilar' },
  { id: 'sozluk', label: 'Sözlük', href: '#sozluk' },
  { id: 'bilgi-testi', label: 'Bilgi testi', href: '#bilgi-testi' },
  { id: 'derinleştirme', label: 'Konu derinleştirme', href: '#derinleştirme' },
]

const stepById = (id: string): LearningPathStep => {
  const step = subSections.find((s) => s.id === id)
  if (!step) throw new Error(`Bilinmeyen bölüm: ${id}`)
  return step
}

const latencyRegions = [
  { id: 'tr-istanbul', label: 'İstanbul (aynı şehir)', ms: 5 },
  { id: 'eu-frankfurt', label: 'Frankfurt (eu-central-1)', ms: 45 },
  { id: 'eu-west', label: 'Batı Avrupa (NL/BE)', ms: 50 },
  { id: 'eu-north', label: 'Kuzey Avrupa (Stockholm)', ms: 70 },
  { id: 'us-east', label: 'ABD Doğu (Virginia)', ms: 130 },
  { id: 'asia-tokyo', label: 'Asya (Tokyo)', ms: 220 },
] as const

export const Education = memo(EducationContent)

function EducationContent() {
  const {
    state,
    isLearned,
    toggleLearned,
    markLearned,
    setNote,
    setFlashcardStatus,
    resetFlashcard,
    recordVisit,
  } = useLearningState()

  // Bölüm başına öğrenilen ve toplam öğe sayısını hesapla.
  const { learnedByStep, totalPerStep } = useMemo(() => {
    const learned: Record<string, number> = {}
    const total: Record<string, number> = {}
    for (const layer of conceptLayers) {
      const key = `concept:${layer.id}`
      total['bulut-bilesenleri'] = (total['bulut-bilesenleri'] ?? 0) + 1
      if (isLearned(key)) learned['bulut-bilesenleri'] = (learned['bulut-bilesenleri'] ?? 0) + 1
    }
    for (const lesson of serviceCategoryLessons) {
      const key = `category:${lesson.category}`
      total['servis-kategorileri'] = (total['servis-kategorileri'] ?? 0) + 1
      if (isLearned(key)) learned['servis-kategorileri'] = (learned['servis-kategorileri'] ?? 0) + 1
    }
    for (const model of pricingModels) {
      const key = `pricing:${model.id}`
      total['fiyatlandirma'] = (total['fiyatlandirma'] ?? 0) + 1
      if (isLearned(key)) learned['fiyatlandirma'] = (learned['fiyatlandirma'] ?? 0) + 1
    }
    for (const snapshot of providerSnapshots) {
      const key = `provider:${snapshot.providerId}`
      total['saglayicilar'] = (total['saglayicilar'] ?? 0) + 1
      if (isLearned(key)) learned['saglayicilar'] = (learned['saglayicilar'] ?? 0) + 1
    }
    for (const term of glossary) {
      const key = `term:${term.term}`
      total['sozluk'] = (total['sozluk'] ?? 0) + 1
      if (isLearned(key)) learned['sozluk'] = (learned['sozluk'] ?? 0) + 1
    }
    total['derinleştirme'] = deepDives.length
    learned['derinleştirme'] = deepDives.filter((dive) => isLearned(`deep-dive:${dive.id}`)).length
    return { learnedByStep: learned, totalPerStep: total }
  }, [isLearned])

  const overallLearned = Object.values(learnedByStep).reduce((sum, n) => sum + n, 0)
  const overallTotal = Object.values(totalPerStep).reduce((sum, n) => sum + n, 0)

  return (
    <section className="education page-section" id="ogren" aria-labelledby="education-heading">
      <header className="page-section__heading">
        <h2 id="education-heading">Öğren</h2>
        <p>
          Bulut kavramlarını, servis kategorilerini, fiyatlandırma modellerini ve
          bölge seçimini üniversite öğrencisi düzeyinde, görsellerle desteklenmiş
          olarak anlatan kalıcı bir referans. Sıralı yol haritası, “Öğrendim”
          işaretleri, kişisel notlar ve flashcard modu tarayıcına kaydedilir.
        </p>
        <p className="education__version">
          İçerik sürümü: <time dateTime={educationVersion}>{educationVersion}</time>
          {' • '}
          <strong data-testid="education-overall-progress">
            {overallLearned} / {overallTotal} kavram öğrenildi
          </strong>
        </p>
      </header>

      <LearningPath
        steps={subSections}
        learnedByStep={learnedByStep}
        totalPerStep={totalPerStep}
        lastVisited={state.lastVisited}
        onVisit={recordVisit}
      />

      <nav className="education__tabs" aria-label="Eğitim alt başlıkları">
        {subSections.map((sub) => (
          <a key={sub.id} href={sub.href}>
            {sub.label}
          </a>
        ))}
      </nav>

      <QuickStart id={stepById('hizli-baslangic').id} />
      <ConceptLayers
        id={stepById('bulut-bilesenleri').id}
        isLearned={isLearned}
        toggleLearned={toggleLearned}
        onSetNote={setNote}
        note={state.notes['bulut-bilesenleri'] ?? ''}
      />
      <ServiceCategoryGuide
        id={stepById('servis-kategorileri').id}
        isLearned={isLearned}
        toggleLearned={toggleLearned}
        onSetNote={setNote}
        note={state.notes['servis-kategorileri'] ?? ''}
      />
      <PricingModelsGuide
        id={stepById('fiyatlandirma').id}
        isLearned={isLearned}
        toggleLearned={toggleLearned}
        onSetNote={setNote}
        note={state.notes['fiyatlandirma'] ?? ''}
      />
      <RegionGuide
        id={stepById('bolge').id}
        onSetNote={setNote}
        note={state.notes['bolge'] ?? ''}
      />
      <ProviderSnapshots
        id={stepById('saglayicilar').id}
        isLearned={isLearned}
        toggleLearned={toggleLearned}
        onSetNote={setNote}
        note={state.notes['saglayicilar'] ?? ''}
      />
      <Glossary
        id={stepById('sozluk').id}
        isLearned={isLearned}
        toggleLearned={toggleLearned}
        flashcardStatuses={state.flashcard}
        onFlashcardStatusChange={setFlashcardStatus}
        onFlashcardReset={resetFlashcard}
        onSetNote={setNote}
        note={state.notes['sozluk'] ?? ''}
      />
      <KnowledgeCheck
        id={stepById('bilgi-testi').id}
        onSetNote={setNote}
        note={state.notes['bilgi-testi'] ?? ''}
      />
      <DeepDiveSection
        onMarkLearned={markLearned}
        isLearned={isLearned}
        onSetNote={setNote}
        notes={state.notes}
      />
    </section>
  )
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <article className="education__section" id={id} aria-labelledby={`${id}-heading`}>
      <header className="education__section-header">
        <h3 id={`${id}-heading`}>{title}</h3>
        {lead ? <p>{lead}</p> : null}
      </header>
      {children}
    </article>
  )
}

function QuickStart({ id }: { id: string }) {
  return (
    <Section
      id={id}
      title="Hızlı başlangıç"
      lead="Bu uygulamayı ilk kez açtıysan aşağıdaki üç adımla başlayabilirsin."
    >
      <ol className="quickstart">
        <li>
          <span className="quickstart__step">1</span>
          <div>
            <h4>Bir senaryo seç</h4>
            <p>
              “Senaryolar” bölümünden öğrenci projenle eşleşen hazır bir kalıbı seç:
              küçük web uygulaması, API arka ucu, statik site, AI GPU gibi.
            </p>
          </div>
        </li>
        <li>
          <span className="quickstart__step">2</span>
          <div>
            <h4>Sağlayıcı ve bölgeyi daralt</h4>
            <p>
              Filtre çubuğundan ilgilendiğin sağlayıcıları (Azure, GCP, AWS, Hetzner, Oracle,
              Cloudflare, DigitalOcean, Vultr) ve bölgeleri seç; tabloyu karşılaştır.
            </p>
          </div>
        </li>
        <li>
          <span className="quickstart__step">3</span>
          <div>
            <h4>Sonucu öğren</h4>
            <p>
              “Öğren” bölümünde her kategorinin neden o fiyatlandırıldığını, fiyat
              modellerinin farkını ve bölge seçiminin gecikmeye etkisini oku.
            </p>
          </div>
        </li>
      </ol>
    </Section>
  )
}

function ConceptLayers({
  id,
  isLearned,
  toggleLearned,
  onSetNote,
  note,
}: {
  id: string
  isLearned: (id: string) => boolean
  toggleLearned: (id: string) => void
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  return (
    <Section
      id={id}
      title="Bulut bileşenleri: IaaS, PaaS, SaaS"
      lead="Sorumluluk payı yukarı çıktıkça senden uzaklaşır. Aşağıdaki piramit, her katmanda neyi senin yönettiğini özetler."
    >
      <ResponsibilityPyramid layers={conceptLayers} />
      <div className="education__grid">
        {conceptLayers.map((layer) => (
          <article key={layer.id} className="education__card">
            <header className="education__card-top">
              <h4>{layer.title}</h4>
              <LearnedToggle
                id={`concept:${layer.id}`}
                learned={isLearned(`concept:${layer.id}`)}
                onToggle={toggleLearned}
              />
            </header>
            <p>
              <strong>Kim yönetir?</strong> {layer.whoManages}
            </p>
            <p>
              <strong>Örnek:</strong> {layer.example}
            </p>
          </article>
        ))}
      </div>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function ServiceCategoryGuide({
  id,
  isLearned,
  toggleLearned,
  onSetNote,
  note,
}: {
  id: string
  isLearned: (id: string) => boolean
  toggleLearned: (id: string) => void
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  const firstLesson = serviceCategoryLessons[0]!
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>(firstLesson.category)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  function handleCategoryKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = serviceCategoryLessons.length - 1
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
      : event.key === 'ArrowRight' ? (index + 1) % (last + 1)
      : event.key === 'ArrowLeft' ? (index + last) % (last + 1) : null
    if (next === null) return
    event.preventDefault()
    setActiveCategory(serviceCategoryLessons[next]!.category)
    tabRefs.current[next]?.focus()
  }
  const active: ServiceCategoryLesson = useMemo(
    () => serviceCategoryLessons.find((lesson) => lesson.category === activeCategory) ?? firstLesson,
    [activeCategory, firstLesson],
  )
  return (
    <Section
      id={id}
      title="Servis kategorileri ne işe yarar?"
      lead="Her sekmenin arkasındaki kategori, uygulamanın bir ihtiyacını karşılar. Tıkla, detayını gör."
    >
      <div className="category-tabs" role="tablist" aria-label="Servis kategorisi seç">
        {serviceCategoryLessons.map((lesson, index) => (
          <button
            key={lesson.category}
            type="button"
            role="tab"
            id={`${id}-tab-${lesson.category}`}
            aria-controls={`${id}-panel`}
            tabIndex={activeCategory === lesson.category ? 0 : -1}
            ref={(element) => { tabRefs.current[index] = element }}
            onKeyDown={(event) => handleCategoryKey(event, index)}
            aria-selected={activeCategory === lesson.category}
            className={`category-tabs__button${activeCategory === lesson.category ? ' is-active' : ''}`}
            onClick={() => setActiveCategory(lesson.category)}
          >
            <CategoryIcon categoryId={lesson.category} title={lesson.title} />
            <span>{lesson.title}</span>
          </button>
        ))}
      </div>

      <article className="category-detail" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active.category}`}>
        <header className="category-detail__header">
          <div>
            <h4 id={`${id}-${active.category}`}>{active.title}</h4>
            <p className="category-detail__oneliner">{active.oneLiner}</p>
          </div>
          <LearnedToggle
            id={`category:${active.category}`}
            learned={isLearned(`category:${active.category}`)}
            onToggle={toggleLearned}
          />
        </header>
        <dl className="category-detail__list">
          <div>
            <dt>Ne?</dt>
            <dd>{active.whatIsIt}</dd>
          </div>
          <div>
            <dt>Ne zaman?</dt>
            <dd>{active.whenToUse}</dd>
          </div>
          <div>
            <dt>Benzetme</dt>
            <dd>{active.analogy}</dd>
          </div>
          <div>
            <dt>Anahtar terimler</dt>
            <dd>
              <ul className="chip-list">
                {active.keyTerms.map((term) => (
                  <li key={term}><span className="chip">{term}</span></li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Sık yapılan hata</dt>
            <dd>{active.commonMistake}</dd>
          </div>
        </dl>
      </article>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function PricingModelsGuide({
  id,
  isLearned,
  toggleLearned,
  onSetNote,
  note,
}: {
  id: string
  isLearned: (id: string) => boolean
  toggleLearned: (id: string) => void
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  return (
    <Section
      id={id}
      title="Fiyatlandırma modelleri"
      lead="Aynı sanal makine, farklı taahhütlerle farklı fiyata gelir. Çubuk ne kadar uzunsa o kadar çok tasarruf."
    >
      <div className="education__grid education__grid--two">
        {pricingModels.map((model) => (
          <article key={model.id} className="education__card education__card--pricing">
            <header className="education__card-top">
              <div>
                <h4>{model.title}</h4>
                <p>{model.oneLiner}</p>
              </div>
              <LearnedToggle
                id={`pricing:${model.id}`}
                learned={isLearned(`pricing:${model.id}`)}
                onToggle={toggleLearned}
              />
            </header>
            <SavingsBar savings={model.savingsHint} label={model.title} />
            <p className="diagram-caption">Temsili öğretim örneği; güncel indirim oranı veya tasarruf garantisi değildir.</p>
            <dl>
              <div>
                <dt>Artı</dt>
                <dd>{model.pros}</dd>
              </div>
              <div>
                <dt>Eksi</dt>
                <dd>{model.cons}</dd>
              </div>
              <div>
                <dt>En uygun kullanım</dt>
                <dd>{model.bestFor}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function RegionGuide({
  id,
  onSetNote,
  note,
}: {
  id: string
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  return (
    <Section
      id={id}
      title="Bölge ve gecikme"
      lead={regionLesson.whyItMatters}
    >
      <div className="education__grid education__grid--two">
        <div>
          <ul className="region-bullets">
            {regionLesson.bulletPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="region-misconception">
            <strong>Yaygın inanış:</strong> {regionLesson.misconception}
          </p>
        </div>
        <div>
          <LatencyMap regions={latencyRegions} />
          <p className="diagram-caption">Sayılar öğretim için seçilmiş örneklerdir; İstanbul’dan yapılmış ölçümler değildir.
            {' '}Bölge kararını kendi ağından ölçerek ver.
            {' '}<a href="https://aws.amazon.com/blogs/networking-and-content-delivery/measuring-network-latency-to-aws-region-before-deployment/" target="_blank" rel="noopener noreferrer">AWS gecikme ölçüm rehberi</a>
          </p>
        </div>
      </div>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function ProviderSnapshots({
  id,
  isLearned,
  toggleLearned,
  onSetNote,
  note,
}: {
  id: string
  isLearned: (id: string) => boolean
  toggleLearned: (id: string) => void
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  return (
    <Section
      id={id}
      title="Sağlayıcı kartları"
      lead="Her sağlayıcıyı tek cümlede tanı, kimin için uygun olduğunu gör."
    >
      <div className="education__grid education__grid--two">
        {providerSnapshots.map((snapshot) => (
          <article key={snapshot.providerId} className="education__card education__card--provider">
            <header className="education__card-top">
              <h4>{providerIdToDisplayName(snapshot.providerId)}</h4>
              <LearnedToggle
                id={`provider:${snapshot.providerId}`}
                learned={isLearned(`provider:${snapshot.providerId}`)}
                onToggle={toggleLearned}
              />
            </header>
            <p className="education__card-oneliner">{snapshot.oneLiner}</p>
            <dl>
              <div>
                <dt>Kime uygun?</dt>
                <dd>{snapshot.forWhom}</dd>
              </div>
              <div>
                <dt>İmza özellik</dt>
                <dd>{snapshot.signature}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function Glossary({
  id,
  isLearned,
  toggleLearned,
  flashcardStatuses,
  onFlashcardStatusChange,
  onFlashcardReset,
  onSetNote,
  note,
}: {
  id: string
  isLearned: (id: string) => boolean
  toggleLearned: (id: string) => void
  flashcardStatuses: Record<string, import('../app/useLearningState').FlashcardStatus>
  onFlashcardStatusChange: (termId: string, status: import('../app/useLearningState').FlashcardStatus) => void
  onFlashcardReset: () => void
  onSetNote: (id: string, text: string) => void
  note: string
}) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'list' | 'flashcard'>('list')
  const normalized = query.trim().toLocaleLowerCase('tr-TR')
  const filtered = glossary.filter((entry) => {
    if (!normalized) return true
    return (
      entry.term.toLocaleLowerCase('tr-TR').includes(normalized) ||
      entry.definition.toLocaleLowerCase('tr-TR').includes(normalized)
    )
  })
  return (
    <Section
      id={id}
      title="Sözlük"
      lead="Bulutla ilgili sık karşılaşılan terimlerin kısa, kalıcı tanımları. Flashcard moduyla hızlıca tekrar edebilirsin."
    >
      <div className="glossary__toolbar">
        <div className="glossary__modes" role="group" aria-label="Sözlük görünümü">
          <button
            type="button"
            aria-pressed={mode === 'list'}
            className={`glossary__mode${mode === 'list' ? ' is-active' : ''}`}
            onClick={() => setMode('list')}
            data-testid="glossary-mode-list"
          >
            Kart listesi
          </button>
          <button
            type="button"
            aria-pressed={mode === 'flashcard'}
            className={`glossary__mode${mode === 'flashcard' ? ' is-active' : ''}`}
            onClick={() => setMode('flashcard')}
            data-testid="glossary-mode-flashcard"
          >
            Flashcard modu
          </button>
        </div>
        {mode === 'list' ? (
          <label className="glossary__search">
            <span className="visually-hidden">Sözlükte ara</span>
            <input
              type="search"
              placeholder="Terim veya açıklama ara..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-testid="glossary-search"
            />
          </label>
        ) : null}
      </div>

      {mode === 'list' ? (
        <div className="glossary__grid" data-testid="glossary-list">
          {filtered.length === 0 ? (
            <p className="glossary__empty">“{query}” için eşleşen terim bulunamadı.</p>
          ) : (
            filtered.map((entry) => (
              <article key={entry.term} className="glossary__item">
                <header className="glossary__item-header">
                  <h4>{entry.term}</h4>
                  <LearnedToggle
                    id={`term:${entry.term}`}
                    learned={isLearned(`term:${entry.term}`)}
                    onToggle={toggleLearned}
                  />
                </header>
                <p>{entry.definition}</p>
                <p className="glossary__example">
                  <strong>Örnek:</strong> {entry.example}
                </p>
              </article>
            ))
          )}
        </div>
      ) : (
        <FlashcardDeck
          statuses={flashcardStatuses}
          onStatusChange={onFlashcardStatusChange}
          onReset={onFlashcardReset}
        />
      )}
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

interface KnowledgeCheckProps {
  id: string
  onSetNote: (id: string, text: string) => void
  note: string
}

function KnowledgeCheck({ id, onSetNote, note }: KnowledgeCheckProps) {
  const [state, setState] = useState<{ answers: Record<string, QuizOptionId | undefined>; submitted: boolean }>({
    answers: {},
    submitted: false,
  })
  const correctCount = quizQuestions.filter(
    (question) => state.answers[question.id] === question.correctId,
  ).length
  const answeredCount = Object.values(state.answers).filter(Boolean).length
  const allAnswered = answeredCount === quizQuestions.length
  const handleSelect = (questionId: string, optionId: QuizOptionId) => {
    if (state.submitted) return
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: optionId } }))
  }
  const handleSubmit = () => {
    if (!allAnswered) return
    setState((prev) => ({ ...prev, submitted: true }))
  }
  const handleReset = () => {
    setState({ answers: {}, submitted: false })
  }
  return (
    <Section
      id={id}
      title="Bilgi testi"
      lead="Yedi kısa soru. Hepsini yanıtla, “Testi değerlendir”e tıkla, eksiklerini öğren."
    >
      <ol className="quiz">
        {quizQuestions.map((question, index) => {
          const selected = state.answers[question.id]
          return (
            <li key={question.id} className="quiz__item">
              <h4>{index + 1}. {question.prompt}</h4>
              <ul className="quiz__options" role="radiogroup" aria-label={question.prompt}>
                {question.options.map((option) => {
                  const isSelected = selected === option.id
                  const isCorrect = option.id === question.correctId
                  const showResult = state.submitted
                  let className = 'quiz__option'
                  if (showResult && isCorrect) className += ' is-correct'
                  else if (showResult && isSelected && !isCorrect) className += ' is-wrong'
                  else if (isSelected) className += ' is-selected'
                  return (
                    <li key={option.id}>
                      <label className={className}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={isSelected ?? false}
                          onChange={() => handleSelect(question.id, option.id)}
                          disabled={state.submitted}
                          data-testid={`${question.id}-${option.id}`}
                        />
                        <span>{option.text}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              {state.submitted ? (
                <p className="quiz__explanation">{question.explanation}</p>
              ) : null}
            </li>
          )
        })}
      </ol>
      <div className="quiz__actions">
        {!state.submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="quiz__button quiz__button--primary"
            data-testid="quiz-submit"
          >
            Testi değerlendir ({answeredCount}/{quizQuestions.length})
          </button>
        ) : (
          <>
            <p className="quiz__score" role="status" data-testid="quiz-score">
              {correctCount} / {quizQuestions.length} doğru
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="quiz__button"
              data-testid="quiz-reset"
            >
              Yeniden dene
            </button>
          </>
        )}
      </div>
      <NotesPanel sectionId={id} value={note} onChange={onSetNote} />
    </Section>
  )
}

function providerIdToDisplayName(providerId: string): string {
  const map: Record<string, string> = {
    azure: 'Microsoft Azure',
    gcp: 'Google Cloud',
    aws: 'Amazon Web Services',
    hetzner: 'Hetzner',
    oracle: 'Oracle Cloud',
    cloudflare: 'Cloudflare',
    digitalocean: 'DigitalOcean',
    vultr: 'Vultr',
  }
  return map[providerId] ?? providerId
}
