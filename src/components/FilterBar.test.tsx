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

afterEach(cleanup)

describe('FilterBar', () => {
  it('exposes providers as pressed-state buttons and changes Azure selection', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)

    const azure = screen.getByRole('button', { name: 'Azure' })
    expect(azure).toHaveAttribute('aria-pressed', 'true')

    await user.click(azure)

    expect(azure).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows every category in a labelled category filter group', () => {
    render(<FilterFixture />)

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

    const staleData = screen.getByRole('checkbox', { name: 'Eski verileri dahil et' })
    expect(staleData).not.toBeChecked()

    await user.click(staleData)

    expect(staleData).toBeChecked()
  })

  it('lists provider-qualified regions and toggles AWS global independently', async () => {
    const user = userEvent.setup()
    render(<FilterFixture />)

    const regions = screen.getByRole('group', { name: 'Bölgeler' })
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
})
