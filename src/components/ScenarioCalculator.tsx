import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ComparisonState } from '../app/useComparisonState'
import { loadCatalog } from '../data/catalog'
import type { Scenario, ScenarioUsageDimension, ServiceCategory } from '../domain/catalog'
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

function dimensionsForScenario(scenario: Scenario): Set<ScenarioUsageDimension> {
  return new Set(Object.values(scenario.coverageByCategory).flat())
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

  if (scenarioSnapshot !== state.scenario) {
    setScenarioSnapshot(state.scenario)
    setDrafts(draftValuesFor(state.scenario))
    setErrors({})
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

  const visibleDimensions = dimensionsForScenario(state.scenario)
  const visibleFields = fields.filter((field) => visibleDimensions.has(field.key))
  const categorySummary = state.scenario.requiredCategories
    .map((category) => categoryLabels[category])
    .join(', ')
  const requirementSummary = visibleFields.flatMap((field) => {
    const value = state.scenario[field.key]
    return value > 0 ? [requirementTextByField[field.key](value)] : []
  })
  const activeTabId = `${formId}-tab-${state.scenario.id}`

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

        <label className="scenario-calculator__scenario visually-hidden" htmlFor={`${formId}-scenario`}>
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

        <div className="scenario-calculator__fields">
          {visibleFields.map((field) => {
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
          })}
        </div>

        <div className="scenario-calculator__actions">
          <button className="scenario-calculator__reset" type="button" onClick={resetToSelectedPreset}>
            <RotateCcw aria-hidden="true" size={16} strokeWidth={2} />
            Varsayılan değerlere sıfırla
          </button>
        </div>

        <div
          className="scenario-calculator__requirements"
          role="status"
          aria-label="Senaryo gereksinim özeti"
          aria-live="polite"
        >
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
          <strong>Modelleme kapsamı</strong>
          <span>{state.scenario.scopeNote}</span>
        </aside>
      </div>
    </section>
  )
}
