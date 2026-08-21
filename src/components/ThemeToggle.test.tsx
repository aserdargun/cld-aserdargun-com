import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

afterEach(cleanup)

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('toggles between light and dark theme and persists the choice', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    const toDark = screen.getByRole('button', { name: 'Karanlık temaya geç' })
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(toDark)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('cld-theme')).toBe('dark')

    const toLight = screen.getByRole('button', { name: 'Aydınlık temaya geç' })
    await user.click(toLight)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('cld-theme')).toBe('light')
  })

  it('starts from a stored dark preference', () => {
    window.localStorage.setItem('cld-theme', 'dark')
    render(<ThemeToggle />)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Aydınlık temaya geç' })).toBeInTheDocument()
  })
})
