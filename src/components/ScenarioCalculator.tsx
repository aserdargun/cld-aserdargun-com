import { useId, useState, type FormEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import type { ComparisonState } from '../app/useComparisonState'
import { loadCatalog } from '../data/catalog'
import type { Scenario, ServiceCategory } from '../domain/catalog'
import './ScenarioCalculator.css'

const scenarios = loadCatalog().scenarios

const scenarioLabels: Record<string, string> = {
  'small-web-app': 'Küçük web uygulaması',
  'api-backend': 'API / backend',
  'database-saas': 'Veritabanlı SaaS',
  'static-site': 'Statik site',
  'ai-gpu': 'AI / GPU',
  'high-traffic': 'Yüksek trafik',
}

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
  'id' | 'name' | 'description' | 'requiredCategories'
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
}

export function ScenarioCalculator({ state }: ScenarioCalculatorProps) {
  const formId = useId()
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
    if (Object.keys(nextErrors).length === 0) state.updateScenario(patch)
  }

  function resetToSelectedPreset() {
    const preset = scenarios.find((scenario) => scenario.id === state.scenario.id) ?? state.scenario
    setScenarioSnapshot(preset)
    setDrafts(draftValuesFor(preset))
    setErrors({})
    state.resetScenario()
  }

  const categorySummary = state.scenario.requiredCategories
    .map((category) => categoryLabels[category])
    .join(', ')

  return (
    <section className="scenario-calculator" aria-labelledby={`${formId}-heading`}>
      <h2 id={`${formId}-heading`}>Senaryo hesaplayıcı</h2>

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
                {scenarioLabels[scenario.id] ?? scenario.name}
              </option>
            ))}
          </select>
        </label>

        <div className="scenario-calculator__fields">
          {fields.map((field) => {
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
          <button className="scenario-calculator__submit" type="submit">
            Hesaplamayı güncelle
          </button>
        </div>
      </form>

      <div
        className="scenario-calculator__requirements"
        role="status"
        aria-label="Senaryo gereksinim özeti"
        aria-live="polite"
      >
        <span className="scenario-calculator__requirements-label">Gereken hizmetler</span>
        <span>{categorySummary}; </span>
        <span>{state.scenario.hoursPerMonth} saat/ay, </span>
        <span>{state.scenario.storageGb} GB depolama, </span>
        <span>{state.scenario.outboundGb} GB dış trafik</span>
      </div>
    </section>
  )
}
