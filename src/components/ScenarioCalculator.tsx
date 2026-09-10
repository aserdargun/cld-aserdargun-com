import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ComparisonState } from '../app/useComparisonState'
import { loadCatalog } from '../data/catalog'
import type { Scenario, ServiceCategory } from '../domain/catalog'
import './ScenarioCalculator.css'

const categoryLabels: Record<ServiceCategory, string> = {
  compute: 'hesaplama',
  'gpu-ai': 'AI / GPU',
  'object-storage': 'nesne depolama',
  'managed-database': 'yönetilen veritabanı',
  serverless: 'sunucusuz işlem',
  'cdn-network': 'CDN / ağ',
  kubernetes: 'Kubernetes',
}

type NumericScenarioField = Exclude<
  keyof Scenario,
  'id' | 'name' | 'description' | 'scopeNote' | 'requiredCategories' | 'coverageByCategory'
>

interface FieldDefinition {
  key: NumericScenarioField
  label: string
  unit: string
  step?: number
}

const fields: readonly FieldDefinition[] = [
  { key: 'hoursPerMonth', label: 'Aylık çalışma süresi', unit: 'saat/ay' },
  { key: 'vcpu', label: 'vCPU', unit: 'çekirdek', step: 1 },
  { key: 'ramGb', label: 'RAM', unit: 'GB' },
  { key: 'storageGb', label: 'Depolama', unit: 'GB' },
  { key: 'outboundGb', label: 'Aylık dış trafik', unit: 'GB/ay' },
  { key: 'requestsMillion', label: 'Aylık istek sayısı', unit: 'milyon istek/ay' },
  { key: 'databaseGb', label: 'Veritabanı depolaması', unit: 'GB' },
  { key: 'gpuHours', label: 'Aylık GPU kullanımı', unit: 'GPU saat/ay' },
  { key: 'gpuVramGb', label: 'GPU VRAM', unit: 'GB' },
]

const requirementTextByField: Record<NumericScenarioField, (value: number) => string> = {
  hoursPerMonth: (value) => `${value.toLocaleString('tr-TR')} saat/ay`,
  vcpu: (value) => `${value.toLocaleString('tr-TR')} vCPU`,
  ramGb: (value) => `${value.toLocaleString('tr-TR')} GB RAM`,
  storageGb: (value) => `${value.toLocaleString('tr-TR')} GB depolama`,
  outboundGb: (value) => `${value.toLocaleString('tr-TR')} GB dış trafik`,
  requestsMillion: (value) => `${value.toLocaleString('tr-TR')} milyon istek/ay`,
  databaseGb: (value) => `${value.toLocaleString('tr-TR')} GB veritabanı depolaması`,
  gpuHours: (value) => `${value.toLocaleString('tr-TR')} GPU saat/ay`,
  gpuVramGb: (value) => `${value.toLocaleString('tr-TR')} GB GPU VRAM`,
}

type DraftValues = Record<NumericScenarioField, string>
type ValidationErrors = Partial<Record<NumericScenarioField, string>>

function draftValuesFor(scenario: Scenario): DraftValues {
  return Object.fromEntries(
    fields.map((field) => [field.key, String(scenario[field.key])]),
  ) as DraftValues
}

function parseUsageValue(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

interface ScenarioCalculatorProps {
  state: Pick<
    ComparisonState,
    'scenario' | 'selectScenario' | 'updateScenario' | 'resetScenario'
  >
  scenarios?: readonly Scenario[]
}

export function ScenarioCalculator({
  state,
  scenarios: providedScenarios,
}: ScenarioCalculatorProps) {
  const scenarios = providedScenarios ?? loadCatalog().scenarios
  const formId = useId()
  const panelId = `${formId}-panel`
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [scenarioSnapshot, setScenarioSnapshot] = useState(state.scenario)
  const [drafts, setDrafts] = useState<DraftValues>(() => draftValuesFor(state.scenario))
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [announcementId, setAnnouncementId] = useState(0)

  if (scenarioSnapshot !== state.scenario) {
    setScenarioSnapshot(state.scenario)
    setDrafts((current) => scenarioSnapshot.id !== state.scenario.id
      ? draftValuesFor(state.scenario)
      : Object.fromEntries(fields.map(({ key }) => [key, errors[key] ? current[key] : String(state.scenario[key])])) as DraftValues)
    if (scenarioSnapshot.id !== state.scenario.id) {
      setErrors({})
      setAdvancedOpen(false)
    }
  }

  function updateField(field: NumericScenarioField, value: string) {
    setDrafts((current) => ({ ...current, [field]: value }))
    const parsed = parseUsageValue(value)

    if (parsed === null) {
      setErrors((current) => ({ ...current, [field]: '0 veya daha büyük bir sayı girin.' }))
      return
    }

    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    state.updateScenario({ [field]: parsed })
  }

  function submitValidValues(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const patch: Partial<Scenario> = {}
    const nextErrors: ValidationErrors = {}

    fields.forEach((field) => {
      const parsed = parseUsageValue(drafts[field.key])
      if (parsed === null) nextErrors[field.key] = '0 veya daha büyük bir sayı girin.'
      else patch[field.key] = parsed
    })

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      state.updateScenario(patch)
      setAnnouncement('Hesaplama güncellendi.')
      setAnnouncementId((current) => current + 1)
    }
  }

  function resetToSelectedPreset() {
    const preset = scenarios.find((scenario) => scenario.id === state.scenario.id) ?? state.scenario
    setScenarioSnapshot(preset)
    setDrafts(draftValuesFor(preset))
    setErrors({})
    state.resetScenario()
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % scenarios.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + scenarios.length) % scenarios.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = scenarios.length - 1
    }

    if (nextIndex === null) return
    event.preventDefault()
    const nextScenario = scenarios[nextIndex]
    if (!nextScenario) return
    state.selectScenario(nextScenario.id)
    tabRefs.current[nextIndex]?.focus()
  }

  const categorySummary = state.scenario.requiredCategories
    .map((category) => categoryLabels[category])
    .join(', ')
  const requirementSummary = fields.flatMap((field) => {
    const value = state.scenario[field.key]
    return value > 0 ? [requirementTextByField[field.key](value)] : []
  })
  const activeTabId = `${formId}-tab-${state.scenario.id}`
  const selectedPreset = scenarios.find((scenario) => scenario.id === state.scenario.id) ?? state.scenario
  const primaryFields = fields.filter((field) => selectedPreset[field.key] > 0)
  const advancedFields = fields.filter((field) => selectedPreset[field.key] === 0)

  function renderField(field: FieldDefinition) {
    const inputId = `${formId}-${field.key}`
    const unitId = `${inputId}-unit`
    const errorId = `${inputId}-error`
    const error = errors[field.key]

    return (
      <label className="scenario-calculator__field" key={field.key} htmlFor={inputId}>
        <span>{field.label}</span>
        <span className="scenario-calculator__control">
          <input
            id={inputId}
            type="number"
            aria-label={field.label}
            min="0"
            step={field.step ?? 'any'}
            value={drafts[field.key]}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${unitId} ${errorId}` : unitId}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
          <span id={unitId} className="scenario-calculator__unit">
            {field.unit}
          </span>
        </span>
        {error ? (
          <span id={errorId} className="scenario-calculator__error" role="alert">
            {error}
          </span>
        ) : null}
      </label>
    )
  }

  return (
    <section className="scenario-calculator" aria-labelledby={`${formId}-heading`}>
      <div className="scenario-tabs" role="tablist" aria-label="Kullanım senaryoları">
        {scenarios.map((scenario, index) => (
          <button
            className="scenario-tabs__tab"
            key={scenario.id}
            id={`${formId}-tab-${scenario.id}`}
            type="button"
            role="tab"
            aria-selected={state.scenario.id === scenario.id}
            aria-controls={panelId}
            tabIndex={state.scenario.id === scenario.id ? 0 : -1}
            ref={(element) => { tabRefs.current[index] = element }}
            onClick={() => state.selectScenario(scenario.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {scenario.name}
          </button>
        ))}
      </div>

      <div
        className="scenario-calculator__panel"
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
      >
        <h2 id={`${formId}-heading`}>Senaryo hesaplayıcı</h2>
        <p className="scenario-calculator__description">{state.scenario.description}</p>

        <form onSubmit={submitValidValues} noValidate>
          <label className="scenario-calculator__scenario" htmlFor={`${formId}-scenario`}>
            <span>Kullanım senaryosu</span>
            <select
              id={`${formId}-scenario`}
              value={state.scenario.id}
              onChange={(event) => state.selectScenario(event.target.value)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="scenario-calculator__fieldset" aria-label="Temel kullanım">
            <legend>Temel kullanım</legend>
            <div className="scenario-calculator__fields">{primaryFields.map(renderField)}</div>
          </fieldset>

          <details
            className="scenario-calculator__advanced"
            open={advancedOpen}
            onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
          >
            <summary>Gelişmiş kullanım ayarları</summary>
            <div className="scenario-calculator__fields" aria-hidden={!advancedOpen}>
              {advancedFields.map(renderField)}
            </div>
          </details>

        <div className="scenario-calculator__actions">
          <button className="scenario-calculator__reset" type="button" onClick={resetToSelectedPreset}>
            <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
            Varsayılan değerlere sıfırla
          </button>
          <button className="scenario-calculator__submit" type="submit">
            Hesaplamayı güncelle
          </button>
        </div>
        </form>

        <div className="scenario-calculator__requirements" aria-label="Senaryo gereksinim özeti">
          <span className="scenario-calculator__requirements-label">Gereken hizmetler</span>
          <span>{categorySummary}; </span>
          {requirementSummary.map((requirement, index) => (
            <span key={requirement}>
              {requirement}{index < requirementSummary.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
        <aside
          className="scenario-calculator__scope-note"
          role="note"
          aria-label="Modelleme kapsamı"
        >
          <div>
            <strong>Bu tahmine dahil</strong>
            <span>{categorySummary}</span>
          </div>
          <div>
            <strong>Dahil değil</strong>
            <span>{state.scenario.scopeNote}</span>
          </div>
        </aside>
        <p key={announcementId} className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  )
}
