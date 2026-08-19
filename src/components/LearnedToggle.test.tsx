import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LearnedToggle } from './LearnedToggle'

afterEach(cleanup)

describe('LearnedToggle', () => {
  it('renders the unlearned state by default', () => {
    render(<LearnedToggle id="x" learned={false} onToggle={() => {}} />)
    const button = screen.getByTestId('learned-toggle-x')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveTextContent('Öğrendim')
  })

  it('renders the learned state and toggles on click', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<LearnedToggle id="y" learned={true} onToggle={onToggle} />)
    const button = screen.getByTestId('learned-toggle-y')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveTextContent('Öğrenildi')
    await user.click(button)
    expect(onToggle).toHaveBeenCalledWith('y')
  })
})
