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
  it('groups active preset fields and exposes the mobile scenario control', () => {
    render(<CalculatorFixture />)

    expect(screen.getByLabelText('Kullanım senaryosu').closest('label')).not.toHaveClass('visually-hidden')
    expect(screen.getByRole('group', { name: 'Temel kullanım' })).toContainElement(
      screen.getByLabelText('Aylık çalışma süresi'),
    )
    const advanced = screen.getByText('Gelişmiş kullanım ayarları').closest('details')
    expect(advanced).not.toBeNull()
    expect(advanced).not.toHaveAttribute('open')
    expect(within(advanced!).getByLabelText('Aylık GPU kullanımı')).toBeInTheDocument()
    expect(screen.getByText('Bu tahmine dahil')).toBeInTheDocument()
    expect(screen.getByText('Dahil değil')).toBeInTheDocument()
  })

  it('replaces the success announcement node for each valid explicit submit', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    await user.click(screen.getByRole('button', { name: 'Hesaplamayı güncelle' }))
    const firstAnnouncement = screen.getByText('Hesaplama güncellendi.').closest('[role="status"]')
    expect(firstAnnouncement).not.toBeNull()
    expect(firstAnnouncement).toHaveTextContent('Hesaplama güncellendi.')

    await user.click(screen.getByRole('button', { name: 'Hesaplamayı güncelle' }))
    const secondAnnouncement = screen.getByText('Hesaplama güncellendi.').closest('[role="status"]')
    expect(secondAnnouncement).not.toBeNull()
    expect(secondAnnouncement).toHaveTextContent('Hesaplama güncellendi.')
    expect(secondAnnouncement).not.toBe(firstAnnouncement)
  })

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
    expect(screen.getByRole('note', { name: 'Modelleme kapsamı' })).toHaveTextContent(
      'Seçili GPU kullanım süresi ve GPU bellek gereksinimini kapsar',
    )
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
    expect(screen.getByLabelText('Senaryo gereksinim özeti')).toHaveTextContent(
      '100 GB dış trafik',
    )
    expect(screen.getByRole('note', { name: 'Modelleme kapsamı' })).toHaveTextContent(
      'seçili CDN çıkış trafiğini kapsar',
    )
    expect(screen.getByRole('note', { name: 'Modelleme kapsamı' })).not.toHaveTextContent('2.000')
    expect(screen.getByRole('spinbutton', { name: 'Aylık çalışma süresi' })).toHaveValue(730)
  })

  it('keeps the API scope generic when the selected request quantity changes', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Kullanım senaryosu' }), 'api-backend')
    const requests = screen.getByRole('spinbutton', { name: 'Aylık istek sayısı' })
    await user.clear(requests)
    await user.type(requests, '3')

    expect(requests).toHaveValue(3)
    expect(screen.getByRole('note', { name: 'Modelleme kapsamı' })).toHaveTextContent(
      'seçili serverless istek miktarının ücretini karşılaştırır',
    )
    expect(screen.getByRole('note', { name: 'Modelleme kapsamı' })).not.toHaveTextContent('10 milyon')
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

  it.each([
    ['small-web-app', ['730 saat/ay', '2 vCPU', '4 GB RAM', '50 GB depolama', '100 GB dış trafik']],
    ['api-backend', ['10 milyon istek/ay']],
    ['database-saas', ['730 saat/ay', '4 vCPU', '8 GB RAM']],
    ['static-site', ['50 GB depolama', '500 GB dış trafik']],
    ['ai-gpu', ['100 GPU saat/ay', '24 GB GPU VRAM']],
    ['high-traffic', ['730 saat/ay', '8 vCPU', '16 GB RAM', '2.000 GB dış trafik']],
  ] as const)('summarizes every nonzero requirement for %s', async (scenarioId, expectedRequirements) => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Kullanım senaryosu' }), scenarioId)
    const summary = screen.getByLabelText('Senaryo gereksinim özeti')
    for (const requirement of expectedRequirements) {
      expect(summary).toHaveTextContent(requirement)
    }
    expect(summary).not.toHaveTextContent(/(?:^|\D)0 (?:saat|vCPU|GB|milyon|GPU)/)
  })

  it('updates the typed requirement summary immediately after an edit', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const vcpu = screen.getByRole('spinbutton', { name: 'vCPU' })
    await user.clear(vcpu)
    await user.type(vcpu, '6')

    expect(screen.getByLabelText('Senaryo gereksinim özeti')).toHaveTextContent('6 vCPU')
  })

  it('supports wrapping arrow, Home and End navigation with linked tabs and tabpanel', async () => {
    const user = userEvent.setup()
    render(<CalculatorFixture />)

    const tablist = screen.getByRole('tablist', { name: 'Kullanım senaryoları' })
    const tabs = within(tablist).getAllByRole('tab')
    const smallWeb = within(tablist).getByRole('tab', { name: 'Küçük web uygulaması' })
    smallWeb.focus()

    await user.keyboard('{ArrowRight}')
    const api = within(tablist).getByRole('tab', { name: 'API / backend' })
    expect(api).toHaveFocus()
    expect(api).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'API / backend' })).toHaveTextContent('10 milyon istek/ay')

    await user.keyboard('{ArrowDown}')
    expect(within(tablist).getByRole('tab', { name: 'Veritabanlı SaaS' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(within(tablist).getByRole('tab', { name: 'Yüksek trafik' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(smallWeb).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(within(tablist).getByRole('tab', { name: 'Yüksek trafik' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(smallWeb).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    const highTraffic = within(tablist).getByRole('tab', { name: 'Yüksek trafik' })
    expect(highTraffic).toHaveFocus()
    expect(highTraffic).toHaveAttribute('aria-selected', 'true')

    const panelId = highTraffic.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(tabs.every((tab) => tab.getAttribute('aria-controls') === panelId)).toBe(true)
    expect(screen.getByRole('tabpanel', { name: 'Yüksek trafik' })).toHaveAttribute('id', panelId)
  })
})
