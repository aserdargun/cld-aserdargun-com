import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import type { Provider } from '../domain/catalog'
import { ProviderDetails } from './ProviderDetails'

afterEach(cleanup)

describe('ProviderDetails', () => {
  it('shows the sourced purchase and region facts for all eight providers', () => {
    const catalog = loadCatalog()
    render(<ProviderDetails providers={catalog.providers} sources={catalog.sources} />)

    const section = screen.getByRole('region', { name: 'Sağlayıcı ayrıntıları' })
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(8)

    for (const provider of catalog.providers) {
      const row = within(section).getByRole('listitem', { name: provider.name })
      const firstStrength = provider.strengths[0]
      const firstLimitation = provider.limitations[0]
      const firstRegion = provider.regions[0]
      if (!firstStrength || !firstLimitation || !firstRegion) {
        throw new Error(`Provider detail fixture is incomplete: ${provider.id}`)
      }
      expect(within(row).getByRole('heading', { name: provider.name })).toBeInTheDocument()
      expect(row).toHaveTextContent('Güçlü yönler')
      expect(row).toHaveTextContent(firstStrength)
      expect(row).toHaveTextContent('Sınırlamalar')
      expect(row).toHaveTextContent(firstLimitation)
      expect(row).toHaveTextContent(firstRegion.name)
      expect(row).toHaveTextContent(provider.purchaseNote)
      expect(within(row).getByText('13 Ağustos 2026')).toHaveAttribute(
        'datetime',
        provider.verifiedAt,
      )

      const officialSite = within(row).getByRole('link', {
        name: `${provider.name} resmî sitesi`,
      })
      expect(officialSite).toHaveAttribute('href', provider.officialSite)
      expect(officialSite).toHaveAttribute('target', '_blank')
      expect(officialSite).toHaveAttribute('rel', expect.stringContaining('noopener'))

      for (const sourceId of [
        ...provider.purchaseSourceIds,
        ...provider.regions.map((region) => region.sourceId),
      ]) {
        const source = catalog.sources.find((candidate) => candidate.id === sourceId)
        expect(source).toBeDefined()
        expect(within(row).getByRole('link', { name: new RegExp(source!.title, 'i') })).toHaveAttribute(
          'href',
          source!.url,
        )
      }
    }
  })

  it('describes unverified purchase availability as uncertainty, never unavailability', () => {
    const catalog = loadCatalog()
    const verifiedProvider = catalog.providers.find((provider) => provider.id === 'azure')
    if (!verifiedProvider) throw new Error('Azure fixture is required')
    const uncertainProvider: Provider = {
      ...verifiedProvider,
      purchaseAvailability: 'unverified',
      purchaseNote: 'Türkiye kullanılabilirliği resmî kaynakta doğrulanamadı.',
    }

    render(<ProviderDetails providers={[uncertainProvider]} sources={catalog.sources} />)

    const row = screen.getByRole('listitem', { name: uncertainProvider.name })
    expect(row).toHaveTextContent('Doğrulanamadı; satın alma uygunluğu garanti edilmez')
    expect(row).not.toHaveTextContent('Satın alınamaz')
  })
})
