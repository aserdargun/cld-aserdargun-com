import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('introduces the Turkish cloud comparison product', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /bulut maliyetlerini karşılaştır/i }),
    ).toBeInTheDocument()
  })
})
