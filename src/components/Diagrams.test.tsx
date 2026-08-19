import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CategoryIcon,
  LatencyMap,
  ResponsibilityPyramid,
  SavingsBar,
} from './Diagrams'
import { conceptLayers, pricingModels } from '../data/education'

afterEach(cleanup)

describe('Diagrams', () => {
  it('renders the responsibility pyramid with one rectangle per layer pair', () => {
    const { container } = render(<ResponsibilityPyramid layers={conceptLayers} />)
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(conceptLayers.length * 2)
  })

  it('clamps the savings bar to the 0-100 range', () => {
    const { getByTestId } = render(
      <>
        <SavingsBar savings={-30} label="negatif" />
        <SavingsBar savings={150} label="fazla" />
        <SavingsBar savings={40} label="orta" />
      </>,
    )
    expect(getByTestId('savings-bar-negatif').getAttribute('style')).toContain('width: 0%')
    expect(getByTestId('savings-bar-fazla').getAttribute('style')).toContain('width: 100%')
    expect(getByTestId('savings-bar-orta').getAttribute('style')).toContain('width: 40%')
  })

  it('renders the latency map bars proportional to ms', () => {
    const { container } = render(
      <LatencyMap
        regions={[
          { id: 'a', label: 'A', ms: 10 },
          { id: 'b', label: 'B', ms: 100 },
        ]}
      />,
    )
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(2)
    const widths = Array.from(rects).map((rect) => Number(rect.getAttribute('width')))
    expect(widths[1]).toBeGreaterThan(widths[0] ?? 0)
  })

  it('renders every category icon without throwing', () => {
    const categories = ['compute', 'object-storage', 'managed-database', 'serverless', 'cdn-network', 'kubernetes', 'gpu-ai']
    for (const category of categories) {
      const { container } = render(<CategoryIcon categoryId={category} title={category} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeNull()
    }
  })

  it('falls back to a generic icon for unknown categories', () => {
    const { container } = render(<CategoryIcon categoryId="unknown" title="unknown" />)
    expect(container.querySelector('rect')).not.toBeNull()
  })

  it('produces savings hints within the supported 0-100 range', () => {
    for (const model of pricingModels) {
      expect(model.savingsHint).toBeGreaterThanOrEqual(0)
      expect(model.savingsHint).toBeLessThanOrEqual(100)
    }
  })
})
