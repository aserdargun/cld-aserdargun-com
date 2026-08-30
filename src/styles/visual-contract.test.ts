/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = {
  global: readFileSync(resolve('src/styles/global.css'), 'utf8'),
  decision: readFileSync(resolve('src/components/DecisionSummary.css'), 'utf8'),
  filter: readFileSync(resolve('src/components/FilterBar.css'), 'utf8'),
  providerCompare: readFileSync(resolve('src/components/ProviderCompare.css'), 'utf8'),
  scenario: readFileSync(resolve('src/components/ScenarioCalculator.css'), 'utf8'),
}

function blockAfter(source: string, prelude: string): string {
  const start = source.indexOf(prelude)
  if (start === -1) {
    throw new Error(`CSS prelude not found: ${prelude}; source starts ${JSON.stringify(source.slice(0, 40))}`)
  }

  const braceInPrelude = prelude.lastIndexOf('{')
  const openBrace = braceInPrelude === -1
    ? source.indexOf('{', start + prelude.length)
    : start + braceInPrelude
  if (openBrace === -1) throw new Error(`CSS block not found: ${prelude}`)

  let depth = 1
  for (let index = openBrace + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(openBrace + 1, index)
  }

  throw new Error(`CSS block is not closed: ${prelude}`)
}

describe('visual source contract', () => {
  it('keeps source links touch-safe while title and icon share the primary row', () => {
    const sourceLink = blockAfter(styles.global, '\n.source-link {')
    const sourceTitle = blockAfter(styles.global, '\n.source-link > span:first-child {')
    const sourceDate = blockAfter(styles.global, '\n.source-link time {')
    const sourceIcon = blockAfter(styles.global, '\n.source-link svg {')
    const providerSourceLink = blockAfter(
      styles.global,
      '\n.provider-details__sources .source-link {',
    )

    expect(sourceLink).toContain('display: inline-grid;')
    expect(sourceLink).toContain('grid-template-columns: minmax(0, 1fr) auto;')
    expect(sourceLink).toContain('"title icon"')
    expect(sourceLink).toContain('"date date"')
    expect(sourceLink).not.toContain('flex-direction: column;')
    expect(sourceLink).toContain('min-block-size: 44px;')
    expect(sourceLink).toContain('min-inline-size: 44px;')
    expect(sourceLink).toContain('max-inline-size: 100%;')
    expect(sourceLink).toContain('overflow-wrap: anywhere;')
    expect(sourceLink).toContain('white-space: normal;')
    expect(sourceTitle).toContain('grid-area: title;')
    expect(sourceTitle).toContain('min-inline-size: 0;')
    expect(sourceDate).toContain('grid-area: date;')
    expect(sourceIcon).toContain('grid-area: icon;')
    expect(providerSourceLink).not.toContain('display: inline-flex;')
    expect(styles.global).not.toContain('.provider-details__sources .source-link time')
    expect(sourceDate).toContain('display: block;')
  })

  it('uses the 13px desktop and 14px mobile helper scale across evidence surfaces', () => {
    const root = blockAfter(styles.global, ':root {')
    const mobile = blockAfter(styles.global, '@media (max-width: 699px)')
    const mobileRoot = mobile.includes(':root {') ? blockAfter(mobile, ':root {') : ''

    expect(root).toContain('--font-helper: 0.8125rem;')
    expect(mobileRoot).toContain('--font-helper: 0.875rem;')

    const helperSelectors = [
      [styles.filter, '.filter-bar__group legend'],
      [styles.filter, '.filter-bar__region-provider > p'],
      [styles.scenario, '.scenario-calculator__fieldset legend'],
      [styles.scenario, '.scenario-calculator__advanced summary'],
      [styles.scenario, '.scenario-calculator__requirements'],
      [styles.scenario, '.scenario-calculator__scope-note'],
      [styles.decision, '.decision-summary__heading span'],
      [styles.decision, '.decision-summary__price-line > :nth-child(n + 2)::before'],
      [styles.providerCompare, '.provider-compare__heading span'],
      [styles.providerCompare, '.provider-compare__basis'],
      [styles.global, '.provider-details h4'],
      [styles.global, '.provider-details__facts li,'],
      [styles.global, '.provider-details__sources .source-link'],
      [styles.global, '.methodology h3'],
      [styles.global, '.methodology__principles p,'],
      [styles.global, '\n.source-link time'],
    ] as const

    helperSelectors.forEach(([source, selector]) => {
      expect(blockAfter(source, selector), selector).toContain(
        'font-size: var(--font-helper);',
      )
    })

    const fixedFontSizes = Object.entries(styles).flatMap(([file, source]) => (
      [...source.matchAll(/font-size:\s*([0-9.]+)(px|rem)\s*;/g)].map((match) => ({
        file,
        declaration: match[0],
        pixels: match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1]),
      }))
    ))
    const undersized = fixedFontSizes.filter(({ pixels }) => pixels < 14)

    expect(undersized).toEqual([])
  })
})
