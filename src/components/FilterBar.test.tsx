import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { useComparisonState } from '../app/useComparisonState'
import { loadCatalog } from '../data/catalog'
import { FilterBar } from './FilterBar'

function FilterFixture() {
  const catalog = loadCatalog()
  return <FilterBar state={useComparisonState(catalog.scenarios, catalog.providers)} providers={catalog.providers} />
}

async function openFilterPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Filtreler/ }))
}

afterEach(cleanup)

describe('FilterBar', () => {
  it('keeps filter controls behind a collapsed summary with reset actions', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)

    const summary = screen.getByRole('button', { name: /Filtreler/ })
    expect(summary).toHaveAttribute('aria-expanded', 'false')
    expect(summary).toHaveTextContent('Filtreler · 0')
    expect(screen.queryByRole('group', { name: 'Bölgeler' })).not.toBeInTheDocument()

    await user.click(summary)

    expect(summary).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Bölgeler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tümünü temizle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Senaryoya dön' })).toBeInTheDocument()
  })

  it('exposes providers as pressed-state buttons and changes Azure selection', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)
    await openFilterPanel(user)

    const azure = screen.getByRole('button', { name: 'Azure' })
    expect(azure).toHaveAttribute('aria-pressed', 'true')

    await user.click(azure)

    expect(azure).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows every category in a labelled category filter group', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)
    await openFilterPanel(user)

    const categories = screen.getByRole('group', { name: 'Hizmet kategorileri' })
    expect(categories).toHaveTextContent('Hesaplama')
    expect(categories).toHaveTextContent('AI / GPU')
    expect(categories).toHaveTextContent('Nesne depolama')
    expect(categories).toHaveTextContent('Yönetilen veritabanı')
    expect(categories).toHaveTextContent('Sunucusuz')
    expect(categories).toHaveTextContent('CDN / ağ')
    expect(categories).toHaveTextContent('Kubernetes')
  })

  it('offers an off-by-default stale-data toggle', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)
    await openFilterPanel(user)

    const staleData = screen.getByRole('checkbox', { name: '30 günden eski verileri göster' })
    expect(staleData).not.toBeChecked()

    await user.click(staleData)

    expect(staleData).toBeChecked()
  })

  it('lists provider-qualified regions and toggles AWS global independently', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)
    await openFilterPanel(user)

    const regions = screen.getByRole('group', { name: 'Bölgeler' })
    expect(within(regions).getByRole('group', { name: 'Amazon Web Services' })).toBeInTheDocument()
    expect(within(regions).getByRole('group', { name: 'Cloudflare' })).toBeInTheDocument()
    const awsGlobal = within(regions).getByRole('button', {
      name: 'Amazon Web Services · CloudFront global edge network',
    })
    const cloudflareGlobal = within(regions).getByRole('button', {
      name: 'Cloudflare · Global edge network',
    })

    expect(awsGlobal).toHaveAttribute('aria-pressed', 'true')
    expect(cloudflareGlobal).toHaveAttribute('aria-pressed', 'true')

    await user.click(awsGlobal)

    expect(awsGlobal).toHaveAttribute('aria-pressed', 'false')
    expect(cloudflareGlobal).toHaveAttribute('aria-pressed', 'true')
  })

  it('counts deviations and exposes clear and scenario-reset behavior', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)
    await openFilterPanel(user)

    await user.click(screen.getByRole('button', { name: 'Azure' }))
    await user.click(screen.getByRole('button', { name: 'Hesaplama' }))
    await user.click(screen.getByRole('checkbox', { name: 'Yalnızca ücretsiz kotası olan servisler' }))
    await user.click(screen.getByRole('checkbox', { name: '30 günden eski verileri göster' }))

    expect(screen.getByRole('button', { name: /Filtreler/ })).toHaveTextContent('Filtreler · 4')

    await user.click(screen.getByRole('button', { name: 'Tümünü temizle' }))
    expect(screen.getByRole('button', { name: 'Azure' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Hesaplama' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('checkbox', { name: 'Yalnızca ücretsiz kotası olan servisler' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: '30 günden eski verileri göster' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: /Filtreler/ })).toHaveTextContent('Filtreler · 21')

    await user.click(screen.getByRole('button', { name: 'Senaryoya dön' }))
    expect(screen.getByRole('button', { name: /Filtreler/ })).toHaveTextContent('Filtreler · 0')
    expect(screen.getByRole('button', { name: 'Azure' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hesaplama' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('checkbox', { name: '30 günden eski verileri göster' })).not.toBeChecked()
  })
})
