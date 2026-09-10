import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashcardDeck } from './FlashcardDeck'
import type { FlashcardStatus } from '../app/useLearningState'

afterEach(cleanup)

describe('FlashcardDeck', () => {
  it('shows the first glossary term and reveals its definition', async () => {
    const user = userEvent.setup()
    render(
      <FlashcardDeck
        statuses={{}}
        onStatusChange={() => {}}
        onReset={() => {}}
      />,
    )
    const reveal = screen.getByTestId('flashcard-reveal')
    await user.click(reveal)
    expect(screen.getAllByText(/Tanım/)[0]).toBeInTheDocument()
  })

  it('marks "Biliyorum" and advances to the next card', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FlashcardDeck
        statuses={{}}
        onStatusChange={onChange}
        onReset={() => {}}
      />,
    )
    await user.click(screen.getByTestId('flashcard-reveal'))
    await user.click(screen.getByTestId('flashcard-mark-known'))
    expect(onChange).toHaveBeenCalled()
    const [termId, status] = onChange.mock.calls[0] as [string, FlashcardStatus]
    expect(status).toBe('known')
    expect(typeof termId).toBe('string')
  })

  it('switches to "Tekrar kuyruğu" filter and shows empty state when no repeats', async () => {
    const user = userEvent.setup()
    render(
      <FlashcardDeck
        statuses={{}}
        onStatusChange={() => {}}
        onReset={() => {}}
      />,
    )
    await user.click(screen.getByTestId('flashcard-filter-repeat'))
    expect(screen.getByText(/Tekrar kuyruğu boş/)).toBeInTheDocument()
  })

  it('resets when the reset button is clicked', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(
      <FlashcardDeck
        statuses={{}}
        onStatusChange={() => {}}
        onReset={onReset}
      />,
    )
    await user.click(screen.getByTestId('flashcard-reset'))
    expect(onReset).toHaveBeenCalled()
  })

  it('shows known and repeat counts in the stats', () => {
    render(
      <FlashcardDeck
        statuses={{ vCPU: 'known', RAM: 'repeat' }}
        onStatusChange={() => {}}
        onReset={() => {}}
      />,
    )
    const stats = screen.getByRole('status')
    expect(within(stats).getByText((_, node) => node?.textContent === '1 / 12 biliyorum')).toBeInTheDocument()
    expect(within(stats).getByText((_, node) => node?.textContent === '1 tekrar')).toBeInTheDocument()
  })
})

it('advances in all cards mode and allows leaving an empty repeat queue', async () => {
  const user = userEvent.setup()
  render(<FlashcardDeck statuses={{}} onStatusChange={() => {}} onReset={() => {}} />)
  const first = screen.getByRole('heading', { level: 4 }).textContent
  await user.click(screen.getByTestId('flashcard-reveal'))
  await user.click(screen.getByTestId('flashcard-mark-known'))
  expect(screen.getByRole('heading', { level: 4 }).textContent).not.toBe(first)
  await user.click(screen.getByTestId('flashcard-filter-repeat'))
  expect(screen.getByText(/Tekrar kuyruğu boş/)).toBeInTheDocument()
  await user.click(screen.getByTestId('flashcard-filter-all'))
  expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(first!)
})
