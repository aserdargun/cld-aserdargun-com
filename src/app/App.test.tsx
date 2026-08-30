import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import type { Provider } from '../domain/catalog'
import { App } from './App'

afterEach(cleanup)

async function openOfferExplorer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Tüm teklif ayrıntıları/ }))
}

async function openOfferFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Filtreler/ }))
}

const appProvenanceMutations: Array<{
  label: string
  expectedReason: string
  mutate: (provider: Provider) => void
}> = [
  {
    label: 'used-region source belongs to Azure',
    expectedReason: 'Kullanılan bölgenin resmî kaynak eşleşmesi doğrulanamadı.',
    mutate: (provider) => {
      provider.regions.find((region) => region.id === 'eu-central-1')!.sourceId = 'azure-regions'
    },
  },
  {
    label: 'purchase evidence is empty',
    expectedReason: 'Sağlayıcının satın alma kaynağı doğrulanamadı.',
    mutate: (provider) => {
      provider.purchaseSourceIds = []
    },
  },
]

describe('App', () => {
  it('renders the source-backed page sections in the required order', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Bulut maliyetini senaryona göre karşılaştır',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Türkiye’den erişilebilen servisler için kaynaklı, vergiler hariç liste fiyatı analizi.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('8 sağlayıcı')).toBeInTheDocument()
    expect(screen.getByText('41 teklif')).toBeInTheDocument()
    expect(screen.getByText('65 resmî kaynak')).toBeInTheDocument()
    expect(screen.getByText('Genel liste fiyatı · Vergiler hariç · USD')).toBeInTheDocument()
    expect(document.getElementById('genel-bakis')).toHaveTextContent('Son doğrulama')

    const sectionIds = [
      'genel-bakis',
      'senaryolar',
      'sonuclar',
      'saglayici-karsilastirma',
      'karsilastirma',
      'ogren',
      'ucretsiz-katmanlar',
      'saglayici-ayrintilari',
      'metodoloji',
    ]
    const sections = sectionIds.map((id) => document.getElementById(id))
    expect(sections.every(Boolean)).toBe(true)
    expect(document.getElementById('senaryolar')).toContainElement(
      document.getElementById('sonuclar'),
    )
    const freeTierGuide = screen.getAllByRole('region', { name: 'Ücretsiz kullanım rehberi' })
    expect(freeTierGuide).toHaveLength(1)
    expect(freeTierGuide[0]).toHaveAttribute('id', 'ucretsiz-katmanlar')
    sections.slice(0, -1).forEach((section, index) => {
      expect(
        section!.compareDocumentPosition(sections[index + 1]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    })

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'CLD · Kaynaklı bulut maliyet karşılaştırması',
    )

    const navigation = screen.getByRole('navigation', { name: 'Ana navigasyon' })
    expect(within(navigation).getByRole('link', { name: 'Hesapla' })).toHaveAttribute(
      'href',
      '#senaryolar',
    )
    expect(within(navigation).getByRole('link', { name: 'Sonuçlar' })).toHaveAttribute(
      'href',
      '#sonuclar',
    )
    expect(within(navigation).getByRole('link', { name: 'Teklifler' })).toHaveAttribute(
      'href',
      '#karsilastirma',
    )
    expect(within(navigation).getByRole('link', { name: 'Öğren' })).toHaveAttribute(
      'href',
      '#ogren',
    )
    expect(within(navigation).getByRole('link', { name: 'Ücretsiz kullanım' })).toHaveAttribute(
      'href',
      '#ucretsiz-katmanlar',
    )
    expect(within(navigation).getByRole('link', { name: 'Metodoloji' })).toHaveAttribute(
      'href',
      '#metodoloji',
    )
    expect(screen.getByRole('link', { name: 'Hesaplamaya başla' })).toHaveAttribute(
      'href',
      '#senaryolar',
    )
    expect(screen.getByRole('link', { name: 'Yöntemi ve kaynakları incele' })).toHaveAttribute(
      'href',
      '#metodoloji',
    )
    expect(document.querySelector('summary[aria-label="Menüyü aç"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /temaya geç/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Öğren', level: 2 })).toBeInTheDocument()

    const scenarioTabs = screen.getByRole('tablist', { name: 'Kullanım senaryoları' })
    expect(within(scenarioTabs).getAllByRole('tab')).toHaveLength(6)

    const methodology = document.getElementById('metodoloji')!
    expect(methodology).toHaveTextContent('730 saat')
    expect(methodology).toHaveTextContent(/vergiler hariç/i)
    expect(methodology).toHaveTextContent('ECB')
    expect(methodology).toHaveTextContent('30 gün')
    expect(methodology).toHaveTextContent(/garanti değildir/i)
    expect(screen.getByRole('button', { name: /Tüm teklif ayrıntıları/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('table', { name: 'Servis karşılaştırması' })).not.toBeInTheDocument()
  })

  it('updates a high-traffic scenario and shows a monthly USD ranking', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Kullanım senaryosu'), 'high-traffic')
    const ranking = screen.getByRole('region', { name: 'Karar özeti' })
    const azure = within(ranking).getByRole('listitem', {
      name: 'Microsoft Azure doğrulanmış tahmin',
    })
    const before = within(azure).getByLabelText('Modellenen aylık tutar').textContent

    const outbound = screen.getByLabelText('Aylık dış trafik')
    await user.clear(outbound)
    await user.type(outbound, '1000')

    const after = within(azure).getByLabelText('Modellenen aylık tutar').textContent
    expect(outbound).toHaveValue(1000)
    expect(before).toMatch(/USD\/ay/)
    expect(after).toMatch(/USD\/ay/)
    expect(after).not.toBe(before)
  })

  it('applies a provider-region toggle to both ranking coverage and detailed offers', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openOfferExplorer(user)
    await openOfferFilters(user)

    const filters = screen.getByRole('region', { name: 'Karşılaştırma filtreleri' })
    const comparison = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const ranking = screen.getByRole('region', { name: 'Karar özeti' })
    const aws = within(ranking).getByRole('listitem', {
      name: 'Amazon Web Services doğrulanmış tahmin',
    })
    const region = within(filters).getByRole('button', {
      name: 'Amazon Web Services · CloudFront global edge network',
    })

    expect(comparison).toHaveTextContent('Amazon CloudFront Pro flat-rate plan')
    expect(within(aws).getByLabelText('Modellenen aylık tutar')).not.toHaveTextContent('Doğrulanamadı')

    await user.click(region)

    expect(comparison).not.toHaveTextContent('Amazon CloudFront Pro flat-rate plan')
    await user.click(within(ranking).getByText(/Diğer sonuçlar/))
    const incompleteAws = within(ranking).getByRole('listitem', {
      name: 'Amazon Web Services eksik sonuç',
    })
    expect(incompleteAws).not.toHaveTextContent(/USD\/ay/)
    expect(incompleteAws).toHaveTextContent('Eksik kategoriler: CDN / ağ')
  })

  it('constrains rankings and detailed offers with provider and category filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openOfferExplorer(user)
    await openOfferFilters(user)

    const filters = screen.getByRole('region', { name: 'Karşılaştırma filtreleri' })
    const comparison = screen.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    const ranking = screen.getByRole('region', { name: 'Karar özeti' })

    expect(comparison).toHaveTextContent('Azure Virtual Machines Standard B2s Linux')
    expect(comparison).toHaveTextContent('Compute Engine e2-standard-2 VM')

    await user.click(within(filters).getByRole('button', { name: 'Azure' }))
    expect(comparison).not.toHaveTextContent('Azure Virtual Machines Standard B2s Linux')
    expect(ranking).not.toHaveTextContent('Microsoft Azure')

    await user.click(within(filters).getByRole('button', { name: 'Hesaplama' }))
    expect(comparison).not.toHaveTextContent('Compute Engine e2-standard-2 VM')
    expect(comparison).toHaveTextContent('Cloud Storage Standard regional storage')
  })

  it('keeps filters available when clear-all empties offers and restores the table for the scenario', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openOfferExplorer(user)
    await openOfferFilters(user)

    await user.click(screen.getByRole('button', { name: 'Tümünü temizle' }))

    const emptyStatus = screen.getByRole('heading', {
      name: 'Bu filtrelerle eşleşen teklif yok',
    }).closest('[role="status"]')
    expect(emptyStatus).toHaveTextContent('Bu filtrelerle eşleşen teklif yok')
    expect(screen.getByRole('region', { name: 'Karşılaştırma filtreleri' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Senaryoya dön' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Servis karşılaştırması' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Senaryoya dön' }))

    expect(screen.queryByRole('heading', { name: 'Bu filtrelerle eşleşen teklif yok' })).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Servis karşılaştırması' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Teklif ayrıntılarını kapat' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('never applies free-tier savings without an explicit eligibility choice', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Kullanım senaryosu'), 'api-backend')

    const ranking = screen.getByRole('region', { name: 'Karar özeti' })
    expect(ranking).toHaveTextContent(/Uygulanan ücretsiz katman indirimi\s+0,00 USD\/ay/)
    expect(ranking).not.toHaveTextContent(/Uygulanan ücretsiz katman indirimi\s+[1-9]/)
  })

  it.each(appProvenanceMutations)(
    'excludes a numerically complete AWS estimate when $label',
    async ({ mutate, expectedReason }) => {
      const user = userEvent.setup()
      const catalog = structuredClone(loadCatalog())
      const aws = catalog.providers.find((provider) => provider.id === 'aws')!
      mutate(aws)

      render(
        <App
          loadCatalogData={() => catalog}
          today={new Date('2026-08-29T00:00:00.000Z')}
        />,
      )

      const summary = screen.getByRole('region', { name: 'Karar özeti' })
      expect(within(summary).queryByRole('listitem', {
        name: 'Amazon Web Services doğrulanmış tahmin',
      })).not.toBeInTheDocument()
      await user.click(within(summary).getByText(/Diğer sonuçlar|Eksik sonuçları incele/))
      const excluded = within(summary).getByRole('listitem', {
        name: 'Amazon Web Services eksik sonuç',
      })
      expect(excluded).toHaveTextContent(expectedReason)
      expect(excluded).not.toHaveTextContent(/USD\/ay/)
      expect(excluded).not.toHaveTextContent('Güncel')

      const comparison = screen.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })
      expect(within(comparison).queryByRole('button', { name: 'AWS' })).not.toBeInTheDocument()
      expect(within(comparison).queryByRole('article', {
        name: 'Amazon Web Services',
      })).not.toBeInTheDocument()
    },
  )

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
