import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Education } from './Education'

afterEach(cleanup)

describe('Education', () => {
  it('renders all top-level sub-section anchors and tab links', () => {
    render(<Education />)
    const nav = screen.getByLabelText('Eğitim alt başlıkları')
    expect(within(nav).getByText('Hızlı başlangıç')).toBeInTheDocument()
    expect(within(nav).getByText('Bulut bileşenleri')).toBeInTheDocument()
    expect(within(nav).getByText('Servis kategorileri')).toBeInTheDocument()
    expect(within(nav).getByText('Fiyatlandırma')).toBeInTheDocument()
    expect(within(nav).getByText('Bölge ve gecikme')).toBeInTheDocument()
    expect(within(nav).getByText('Sağlayıcı kartları')).toBeInTheDocument()
    expect(within(nav).getByText('Sözlük')).toBeInTheDocument()
    expect(within(nav).getByText('Bilgi testi')).toBeInTheDocument()
  })

  it('lists all pricing models with savings hints', () => {
    render(<Education />)
    expect(screen.getAllByText('İsteğe bağlı (On-demand)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rezerve / Taahhütlü (Reserved)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Spot (Açık artırma / kalan kapasite)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ücretsiz katman (Free tier)').length).toBeGreaterThan(0)
  })

  it('switches the active service category tab and updates the detail', async () => {
    const user = userEvent.setup()
    render(<Education />)
    const tab = screen.getByRole('tab', { name: /Nesne Depolama/i })
    expect(tab).toHaveAttribute('aria-selected', 'false')
    await user.click(tab)
    expect(tab).toHaveAttribute('aria-selected', 'true')
    const detail = screen.getByRole('tabpanel')
    expect(detail).toHaveTextContent('Nesne Depolama')
    expect(detail).toHaveTextContent('Benzetme')
  })

  it('filters glossary entries by search term', async () => {
    const user = userEvent.setup()
    render(<Education />)
    const search = screen.getByTestId('glossary-search')
    const glossarySection = screen.getByRole('article', { name: /Sözlük/ })
    expect(within(glossarySection).getByText('Egress (Çıkış trafiği)')).toBeInTheDocument()
    await user.type(search, 'egress')
    expect(within(glossarySection).getByText('Egress (Çıkış trafiği)')).toBeInTheDocument()
    expect(within(glossarySection).queryByText('vCPU')).not.toBeInTheDocument()
    await user.clear(search)
    expect(within(glossarySection).getByText('vCPU')).toBeInTheDocument()
  })

  it('disables submit until all quiz questions are answered, then shows a score', async () => {
    const user = userEvent.setup()
    render(<Education />)
    const submit = screen.getByTestId('quiz-submit')
    expect(submit).toBeDisabled()

    const questions = screen.getAllByRole('radiogroup')
    expect(questions).toHaveLength(7)
    for (const group of questions) {
      const firstOption = within(group).getAllByRole('radio')[0]
      if (firstOption) await user.click(firstOption)
    }
    expect(submit).not.toBeDisabled()
    await user.click(submit)

    const score = screen.getByTestId('quiz-score')
    expect(score).toHaveTextContent('/ 7 doğru')
  })

  it('highlights wrong and correct options after submission', async () => {
    const user = userEvent.setup()
    render(<Education />)
    const groups = screen.getAllByRole('radiogroup')
    for (const group of groups) {
      const firstOption = within(group).getAllByRole('radio')[0]
      if (firstOption) await user.click(firstOption)
    }
    await user.click(screen.getByTestId('quiz-submit'))
    const correctBadge = document.querySelector('.quiz__option.is-correct')
    expect(correctBadge).not.toBeNull()
    const explanations = screen.getAllByText(/Yukarı çıktıkça|sağlayıcı sadece|Taahhüt süresi|yürütme süresi|Fiziksel uzaklığa|küçük örneklerde|kredi bitse bile/)
    expect(explanations.length).toBeGreaterThan(0)
  })

  it('resets the quiz state when "Yeniden dene" is clicked', async () => {
    const user = userEvent.setup()
    render(<Education />)
    for (const group of screen.getAllByRole('radiogroup')) {
      const firstOption = within(group).getAllByRole('radio')[0]
      if (firstOption) await user.click(firstOption)
    }
    await user.click(screen.getByTestId('quiz-submit'))
    expect(screen.getByTestId('quiz-score')).toBeInTheDocument()

    await user.click(screen.getByTestId('quiz-reset'))
    expect(screen.queryByTestId('quiz-score')).not.toBeInTheDocument()
    expect(screen.getByTestId('quiz-submit')).toBeDisabled()
  })

  it('shows the responsibility pyramid SVG with 4 layers', () => {
    const { container } = render(<Education />)
    const pyramid = container.querySelector('[aria-label="Bulut sorumluluk payı piramidi"]')
    expect(pyramid).not.toBeNull()
    const rects = pyramid?.querySelectorAll('rect') ?? []
    // 4 layers × 2 rectangles per layer = 8
    expect(rects.length).toBe(8)
  })

  it('lists every provider snapshot in the providers section', () => {
    render(<Education />)
    expect(screen.getByText('Microsoft Azure')).toBeInTheDocument()
    expect(screen.getByText('Google Cloud')).toBeInTheDocument()
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument()
    expect(screen.getByText('Hetzner')).toBeInTheDocument()
    expect(screen.getByText('Oracle Cloud')).toBeInTheDocument()
    expect(screen.getByText('Cloudflare')).toBeInTheDocument()
    expect(screen.getByText('DigitalOcean')).toBeInTheDocument()
    expect(screen.getByText('Vultr')).toBeInTheDocument()
  })
})

it('includes deep dives in the overall progress and supports category arrow navigation', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  render(<Education />)
  expect(screen.getByTestId('education-overall-progress')).toHaveTextContent('0 /')
  const deepDive = document.querySelector<HTMLButtonElement>('[data-testid^="learned-toggle-deep-dive:"]')!
  await user.click(deepDive)
  expect(screen.getByTestId('education-overall-progress')).toHaveTextContent('1 /')
  const tabs = screen.getByRole('tablist', { name: 'Servis kategorisi seç' })
  within(tabs).getAllByRole('tab')[0]!.focus()
  await user.keyboard('{ArrowRight}')
  expect(within(tabs).getAllByRole('tab')[1]).toHaveFocus()
  expect(within(tabs).getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
  localStorage.clear()
})
