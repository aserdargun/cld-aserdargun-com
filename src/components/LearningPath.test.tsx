import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LearningPath, type LearningPathStep } from './LearningPath'

afterEach(cleanup)

const steps: readonly LearningPathStep[] = [
  { id: 'a', label: 'Adım A', href: '#a' },
  { id: 'b', label: 'Adım B', href: '#b' },
  { id: 'c', label: 'Adım C', href: '#c' },
]

describe('LearningPath', () => {
  it('renders all steps with progress counts', () => {
    render(
      <LearningPath
        steps={steps}
        learnedByStep={{ a: 1, b: 0, c: 2 }}
        totalPerStep={{ a: 2, b: 1, c: 2 }}
        lastVisited={null}
        onVisit={() => {}}
      />,
    )
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('navigates to next/prev and records visit', async () => {
    const user = userEvent.setup()
    const onVisit = vi.fn()
    render(
      <LearningPath
        steps={steps}
        learnedByStep={{}}
        totalPerStep={{}}
        lastVisited={null}
        onVisit={onVisit}
      />,
    )
    await user.click(screen.getByTestId('learning-path-next'))
    expect(screen.getByTestId('learning-path-step-b')).toHaveAttribute('aria-current', 'step')
    await user.click(screen.getByTestId('learning-path-prev'))
    expect(screen.getByTestId('learning-path-step-a')).toHaveAttribute('aria-current', 'step')
  })

  it('disables prev at first and next at last step', () => {
    render(
      <LearningPath
        steps={steps}
        learnedByStep={{}}
        totalPerStep={{}}
        lastVisited="c"
        onVisit={() => {}}
      />,
    )
    expect(screen.getByTestId('learning-path-prev')).not.toBeDisabled()
    expect(screen.getByTestId('learning-path-next')).toBeDisabled()
  })

  it('shows the current step link in the nav', () => {
    render(
      <LearningPath
        steps={steps}
        learnedByStep={{}}
        totalPerStep={{}}
        lastVisited="b"
        onVisit={() => {}}
      />,
    )
    const link = screen.getByTestId('learning-path-current')
    expect(link).toHaveAttribute('href', '#b')
    expect(link).toHaveTextContent('Adım B')
  })

  it('computes overall progress percentage', () => {
    render(
      <LearningPath
        steps={steps}
        learnedByStep={{ a: 1, b: 0, c: 2 }}
        totalPerStep={{ a: 2, b: 1, c: 2 }}
        lastVisited={null}
        onVisit={() => {}}
      />,
    )
    const fill = screen.getByTestId('learning-path-progress-fill')
    // 3/5 = 60%
    expect(fill.getAttribute('style')).toContain('60%')
  })
})
