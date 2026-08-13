import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useComparisonState } from '../app/useComparisonState'
import { ScenarioCalculator } from './ScenarioCalculator'

function CalculatorFixture() {
  const state = useComparisonState()

  return (
    <>
      <ScenarioCalculator state={state} />
      <output aria-label="Test senaryo durumu">
        {JSON.stringify(state.scenario)}
      </output>
    </>
  )
}

afterEach(cleanup)

describe('ScenarioCalculator', () => {
  it('offers all six presets and selects the AI / GPU scenario', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const scenarioSelect = screen.getByRole('combobox', { name: 'Kullanım senaryosu' })
    expect(within(scenarioSelect).getAllByRole('option')).toHaveLength(6)
    expect(scenarioSelect).toHaveTextContent('Küçük web uygulaması')
    expect(scenarioSelect).toHaveTextContent('API / backend')
    expect(scenarioSelect).toHaveTextContent('Veritabanlı SaaS')
    expect(scenarioSelect).toHaveTextContent('Statik site')
    expect(scenarioSelect).toHaveTextContent('AI / GPU')
    expect(scenarioSelect).toHaveTextContent('Yüksek trafik')

    await user.selectOptions(scenarioSelect, 'ai-gpu')

    expect(screen.getByRole('spinbutton', { name: 'Aylık GPU kullanımı' })).toHaveValue(100)
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"id":"ai-gpu"')
  })

  it('updates outbound traffic to 100 GB without losing the other requirements', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Kullanım senaryosu' }), 'high-traffic')
    const outbound = screen.getByRole('spinbutton', { name: 'Aylık dış trafik' })
    await user.clear(outbound)
    await user.type(outbound, '100')

    expect(outbound).toHaveValue(100)
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"outboundGb":100')
    expect(screen.getByRole('status', { name: 'Senaryo gereksinim özeti' })).toHaveTextContent(
      '100 GB dış trafik',
    )
    expect(screen.getByRole('spinbutton', { name: 'Aylık çalışma süresi' })).toHaveValue(730)
  })

  it('keeps negative and empty values out of scenario state', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const storage = screen.getByRole('spinbutton', { name: 'Depolama' })
    await user.clear(storage)
    await user.type(storage, '-5')

    expect(screen.getByRole('alert')).toHaveTextContent('0 veya daha büyük bir sayı girin')
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"storageGb":50')

    await user.clear(storage)

    expect(screen.getByRole('alert')).toHaveTextContent('0 veya daha büyük bir sayı girin')
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"storageGb":50')
  })

  it('resets edits to the selected preset defaults', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const hours = screen.getByRole('spinbutton', { name: 'Aylık çalışma süresi' })
    await user.clear(hours)
    await user.type(hours, '20')
    expect(hours).toHaveValue(20)

    await user.click(screen.getByRole('button', { name: 'Varsayılan değerlere sıfırla' }))

    expect(hours).toHaveValue(730)
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"hoursPerMonth":730')
  })

  it('clears an invalid local draft even when the preset state does not rerender', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const storage = screen.getByRole('spinbutton', { name: 'Depolama' })
    await user.clear(storage)

    expect(storage).toHaveValue(null)
    expect(screen.getByRole('alert')).toHaveTextContent('0 veya daha büyük bir sayı girin')

    await user.click(screen.getByRole('button', { name: 'Varsayılan değerlere sıfırla' }))

    expect(storage).toHaveValue(50)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Test senaryo durumu')).toHaveTextContent('"storageGb":50')
  })

  it('keeps every pricing and capacity input visible with units and a non-negative bound', () => {
    render(<CalculatorFixture />)

    const labels = [
      'Aylık çalışma süresi',
      'vCPU',
      'RAM',
      'Depolama',
      'Aylık dış trafik',
      'Aylık istek sayısı',
      'Veritabanı depolaması',
      'Aylık GPU kullanımı',
      'GPU VRAM',
    ]

    labels.forEach((label) => {
      expect(screen.getByRole('spinbutton', { name: label })).toHaveAttribute('min', '0')
    })

    expect(screen.getAllByText('GB').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('saat/ay')).toBeInTheDocument()
    expect(screen.getByText('milyon istek/ay')).toBeInTheDocument()
    expect(screen.getByText('GPU saat/ay')).toBeInTheDocument()
  })
})
