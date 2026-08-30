import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { loadCatalog } from '../data/catalog'
import type { Provider } from '../domain/catalog'
import { ProviderDetails } from './ProviderDetails'

afterEach(cleanup)

describe('ProviderDetails', () => {
  it('keeps all eight providers discoverable while every evidence body starts collapsed', () => {
    const catalog = loadCatalog()
    render(<ProviderDetails providers={catalog.providers} sources={catalog.sources} />)

    const section = screen.getByRole('region', { name: 'Sağlayıcı ayrıntıları' })
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(8)
    expect(within(section).getAllByRole('button', { name: /ayrıntılarını göster$/ })).toHaveLength(8)
    expect(section.querySelectorAll('.provider-details__body')).toHaveLength(0)

    for (const provider of catalog.providers) {
      expect(within(section).getByRole('heading', { name: provider.name })).toBeInTheDocument()
      const button = within(section).getByRole('button', {
        name: `${provider.name} ayrıntılarını göster`,
      })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-controls', `provider-details-body-${provider.id}`)
      const controlledPanel = document.getElementById(`provider-details-body-${provider.id}`)
      expect(controlledPanel).toBeInTheDocument()
      expect(controlledPanel).toHaveAttribute('hidden')
      expect(screen.queryByText(provider.purchaseNote)).not.toBeInTheDocument()
    }
  })

  it('opens every provider in turn with complete secure evidence and closes the active provider', async () => {
    const user = userEvent.setup()
    const catalog = loadCatalog()
    render(<ProviderDetails providers={catalog.providers} sources={catalog.sources} />)

    let previousButton: HTMLElement | null = null
    let previousPanel: HTMLElement | null = null

    for (const provider of catalog.providers) {
      const button = screen.getByRole('button', {
        name: `${provider.name} ayrıntılarını göster`,
      })
      const panelId = button.getAttribute('aria-controls')
      expect(panelId).toBe(`provider-details-body-${provider.id}`)
      const panel = document.getElementById(panelId!)
      expect(panel).toBeInTheDocument()
      expect(panel).toHaveAttribute('hidden')

      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
      expect(panel).not.toHaveAttribute('hidden')
      expect(document.getElementById(panelId!)).toBe(panel)
      expect(document.querySelectorAll('.provider-details__body')).toHaveLength(1)
      if (previousButton && previousPanel) {
        expect(previousButton).toHaveAttribute('aria-expanded', 'false')
        expect(previousPanel).toHaveAttribute('hidden')
      }

      const row = screen.getByRole('listitem', { name: provider.name })
      expect(within(row).getByText(provider.purchaseNote)).toBeInTheDocument()
      expect(row).toHaveTextContent('Güçlü yönler')
      expect(row).toHaveTextContent(provider.strengths[0]!)
      expect(row).toHaveTextContent('Sınırlamalar')
      expect(row).toHaveTextContent(provider.limitations[0]!)
      expect(row).toHaveTextContent(provider.regions[0]!.name)
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
      expect(officialSite).toHaveAttribute('rel', expect.stringContaining('noreferrer'))

      const sourceIds = [
        ...new Set([
          ...provider.purchaseSourceIds,
          ...provider.regions.map((region) => region.sourceId),
        ]),
      ]
      for (const sourceId of sourceIds) {
        const source = catalog.sources.find((candidate) => candidate.id === sourceId)
        if (!source) throw new Error(`Provider source fixture is missing: ${sourceId}`)
        const sourceLink = within(row).getByText(source.title).closest('a')
        expect(sourceLink).toHaveAttribute('href', source.url)
        expect(sourceLink).toHaveAttribute('target', '_blank')
        expect(sourceLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
        expect(sourceLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
        expect(within(sourceLink!).getByText(source.accessedAt)).toHaveAttribute(
          'datetime',
          source.accessedAt,
        )
        expect(within(sourceLink!).getByText(source.accessedAt).tagName).toBe('TIME')
        expect(sourceLink).toHaveTextContent(source.accessedAt)
      }

      previousButton = button
      previousPanel = panel
    }

    const activeProvider = catalog.providers.at(-1)!
    const activeButton = previousButton!
    const activePanel = previousPanel!
    await user.click(activeButton)
    expect(activeButton).toHaveAttribute('aria-expanded', 'false')
    expect(activePanel).toHaveAttribute('hidden')
    expect(document.getElementById(`provider-details-body-${activeProvider.id}`)).toBe(activePanel)
    expect(document.querySelectorAll('.provider-details__body')).toHaveLength(0)
    expect(screen.queryByText(activeProvider.purchaseNote)).not.toBeInTheDocument()
  })

  it('describes unverified purchase availability as uncertainty, never unavailability', async () => {
    const user = userEvent.setup()
    const catalog = loadCatalog()
    const verifiedProvider = catalog.providers.find((provider) => provider.id === 'azure')
    if (!verifiedProvider) throw new Error('Azure fixture is required')
    const uncertainProvider: Provider = {
      ...verifiedProvider,
      purchaseAvailability: 'unverified',
      purchaseNote: 'Türkiye kullanılabilirliği resmî kaynakta doğrulanamadı.',
    }

    render(<ProviderDetails providers={[uncertainProvider]} sources={catalog.sources} />)
    await user.click(
      screen.getByRole('button', { name: 'Microsoft Azure ayrıntılarını göster' }),
    )

    const row = screen.getByRole('listitem', { name: uncertainProvider.name })
    expect(row).toHaveTextContent('Doğrulanamadı; satın alma uygunluğu garanti edilmez')
    expect(row).not.toHaveTextContent('Satın alınamaz')
  })
})
