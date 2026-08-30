import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { Offer } from '../domain/catalog'
import { OfferExplorer } from './OfferExplorer'

const offer = { id: 'offer-1' } as Offer

afterEach(cleanup)

describe('OfferExplorer', () => {
  it('mounts offer filters and the table only while details are open', async () => {
    const user = userEvent.setup()
    render(
      <OfferExplorer
        offers={[offer]}
        filterBar={<div role="region" aria-label="Test filtreleri" />}
        comparisonTable={<table aria-label="Test teklif tablosu" />}
      />,
    )

    const toggle = screen.getByRole('button', { name: 'Tüm teklif ayrıntıları · 1' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Test filtreleri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Test teklif tablosu' })).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Teklif ayrıntılarını kapat' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('region', { name: 'Test filtreleri' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Test teklif tablosu' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Teklif ayrıntılarını kapat' }))

    expect(screen.queryByRole('region', { name: 'Test filtreleri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Test teklif tablosu' })).not.toBeInTheDocument()
  })

  it('keeps filter controls mounted beside the actionable empty state', async () => {
    const user = userEvent.setup()
    render(
      <OfferExplorer
        offers={[]}
        filterBar={<div role="region" aria-label="Test filtreleri" />}
        comparisonTable={<table aria-label="Test teklif tablosu" />}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Tüm teklif ayrıntıları · 0' }))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Bu filtrelerle eşleşen teklif yok')
    expect(status).toHaveTextContent('Filtreleri temizleyin veya senaryo kapsamına dönün.')
    expect(screen.getByRole('region', { name: 'Test filtreleri' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Test teklif tablosu' })).not.toBeInTheDocument()
  })
})
