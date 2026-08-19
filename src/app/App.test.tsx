import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'

afterEach(cleanup)

describe('App', () => {
  it('renders the source-backed page sections in the required order', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Bulut maliyetlerini karşılaştır', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Türkiye’den satın alınabilen bulut servislerinin aylık maliyetlerini resmî kaynak fiyatlarıyla karşılaştırın. Tutarlar USD ve vergiler hariçtir.',
      ),
    ).toBeInTheDocument()
    expect(document.getElementById('genel-bakis')).toHaveTextContent(
      'Son doğrulama: 14 Ağustos 2026',
    )

    const sectionIds = [
      'genel-bakis',
      'senaryolar',
      'karsilastirma',
      'ucretsiz-katmanlar',
      'saglayici-ayrintilari',
      'metodoloji',
    ]
    const sections = sectionIds.map((id) => document.getElementById(id))
    expect(sections.every(Boolean)).toBe(true)
    sections.slice(0, -1).forEach((section, index) => {
      expect(section!.compareDocumentPosition(sections[index + 1]!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })

    const navigation = screen.getByRole('navigation', { name: 'Ana navigasyon' })
    expect(within(navigation).getByRole('link', { name: 'Senaryolar' })).toHaveAttribute(
      'href',
      '#senaryolar',
    )
    expect(within(navigation).getByRole('link', { name: 'Karşılaştırma' })).toHaveAttribute(
      'href',
      '#karsilastirma',
    )
    expect(document.querySelector('summary[aria-label="Menüyü aç"]')).toBeInTheDocument()

    const scenarioTabs = screen.getByRole('tablist', { name: 'Kullanım senaryoları' })
    expect(within(scenarioTabs).getAllByRole('tab')).toHaveLength(6)

    const methodology = document.getElementById('metodoloji')!
    expect(methodology).toHaveTextContent('730 saat')
    expect(methodology).toHaveTextContent(/vergiler hariç/i)
    expect(methodology).toHaveTextContent('ECB')
    expect(methodology).toHaveTextContent('30 gün')
    expect(methodology).toHaveTextContent(/garanti değildir/i)
  })

  it('updates a high-traffic scenario and shows a monthly USD ranking', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Kullanım senaryosu'), 'high-traffic')
    const ranking = screen.getByRole('region', { name: 'Sağlayıcı sıralaması' })
    const azure = within(ranking).getByRole('listitem', { name: 'Microsoft Azure' })
    const before = within(azure).getByLabelText('Aylık tahmini tutar').textContent

    const outbound = screen.getByLabelText('Aylık dış trafik')
    await user.clear(outbound)
    await user.type(outbound, '1000')

    const after = within(azure).getByLabelText('Aylık tahmini tutar').textContent
    expect(outbound).toHaveValue(1000)
    expect(before).toMatch(/USD\/ay/)
    expect(after).toMatch(/USD\/ay/)
    expect(after).not.toBe(before)
  })

  it('applies a provider-region toggle to both ranking coverage and detailed offers', async () => {
    const user = userEvent.setup()
    render(<App />)

    const filters = screen.getByRole('region', { name: 'Karşılaştırma filtreleri' })
    const comparison = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const ranking = screen.getByRole('region', { name: 'Sağlayıcı sıralaması' })
    const aws = within(ranking).getByRole('listitem', { name: 'Amazon Web Services' })
    const region = within(filters).getByRole('button', {
      name: 'Amazon Web Services · CloudFront global edge network',
    })

    expect(comparison).toHaveTextContent('Amazon CloudFront Pro flat-rate plan')
    expect(within(aws).getByLabelText('Aylık tahmini tutar')).not.toHaveTextContent('Doğrulanamadı')

    await user.click(region)

    expect(comparison).not.toHaveTextContent('Amazon CloudFront Pro flat-rate plan')
    expect(within(aws).getByLabelText('Aylık tahmini tutar')).toHaveTextContent('Doğrulanamadı')
    expect(aws).toHaveTextContent('Senaryoya eksik: CDN / ağ')
  })

  it('constrains rankings and detailed offers with provider and category filters', async () => {
    const user = userEvent.setup()
    render(<App />)

    const filters = screen.getByRole('region', { name: 'Karşılaştırma filtreleri' })
    const comparison = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const ranking = screen.getByRole('region', { name: 'Sağlayıcı sıralaması' })

    expect(comparison).toHaveTextContent('Azure Virtual Machines Standard B2s Linux')
    expect(comparison).toHaveTextContent('Compute Engine e2-standard-2 VM')

    await user.click(within(filters).getByRole('button', { name: 'Azure' }))
    expect(comparison).not.toHaveTextContent('Azure Virtual Machines Standard B2s Linux')
    expect(ranking).not.toHaveTextContent('Microsoft Azure')

    await user.click(within(filters).getByRole('button', { name: 'Hesaplama' }))
    expect(comparison).not.toHaveTextContent('Compute Engine e2-standard-2 VM')
    expect(comparison).toHaveTextContent('Cloud Storage Standard regional storage')
  })

  it('never applies free-tier savings without an explicit eligibility choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Kullanım senaryosu'), 'api-backend')

    const ranking = screen.getByRole('region', { name: 'Sağlayıcı sıralaması' })
    expect(ranking).toHaveTextContent(/Ücretsiz katman indirimi\s+0,00 USD\/ay/)
    expect(ranking).not.toHaveTextContent(/Ücretsiz katman indirimi\s+[1-9]/)
  })

  it('shows a safe error state when the catalog cannot be validated', () => {
    render(
      <App
        loadCatalogData={() => {
          throw new Error('invalid catalog')
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fiyat kataloğu doğrulanamadı. Kaynak verileri kontrol edin.',
    )
    expect(screen.queryByText(/USD\/ay/)).not.toBeInTheDocument()
  })
})
