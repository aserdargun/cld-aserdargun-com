import { expect, test, type Page } from '@playwright/test'

import { catalogSnapshotDate } from '../src/data/snapshot'

test.beforeEach(async ({ page }) => {
  // Price freshness is tested separately; UI fixtures use the catalog's own date.
  await page.clock.setFixedTime(new Date(`${catalogSnapshotDate}T12:00:00Z`))
})

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(message.text())
    }
  })
  return problems
}

async function expectNoDocumentOverflow(page: Page) {
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(clientWidth)
}

test('desktop decision-first flow recomputes a scenario and reaches official offer evidence', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page)

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await expect(page).toHaveTitle(/^CLD - /u)
  await expect(page.getByRole('heading', {
    name: 'Bulut maliyetini senaryona göre karşılaştır',
  })).toBeVisible()
  await expect(page.locator('vite-error-overlay, nextjs-portal')).toHaveCount(0)

  const sectionIds = [
    'genel-bakis',
    'senaryolar',
    'sonuclar',
    'saglayici-karsilastirma',
    'karsilastirma',
    'ogren',
    'ucretsiz-katmanlar',
    'saglayici-ayrintilari',
    'metodoloji',
  ]
  expect(await page.evaluate((ids) => ids.every((id, index) => {
    const current = document.getElementById(id)
    const previous = index === 0 ? null : document.getElementById(ids[index - 1]!)
    return current !== null && (
      previous === null || Boolean(previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING)
    )
  }), sectionIds)).toBe(true)

  const scenarios = page.getByRole('region', { name: 'Senaryolar' })
  const decisionSummary = page.getByRole('region', { name: 'Karar özeti' })
  await expect(decisionSummary).toBeVisible()
  const firstDecisionResult = decisionSummary
    .getByRole('listitem', { name: /doğrulanmış tahmin/i })
    .first()
  await expect(firstDecisionResult).toContainText('Kullanılan bölgeler')
  await expect(firstDecisionResult).toContainText('Vergiler hariç genel liste fiyatı')
  await expect(firstDecisionResult).toContainText('Özgün para birimi: USD')
  await expect(page.getByRole('table', { name: 'Servis karşılaştırması' })).toHaveCount(0)

  const smallWebTab = scenarios.getByRole('tab', { name: 'Küçük web uygulaması' })
  await smallWebTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(scenarios.getByRole('tab', { name: 'API arka ucu' })).toBeFocused()
  await expect(scenarios.getByRole('tab', { name: 'API arka ucu' })).toHaveAttribute('aria-selected', 'true')

  const awsComparison = page.getByRole('article', { name: 'Amazon Web Services' })
  await expect(awsComparison).toContainText('Europe (Frankfurt) · DE')
  await expect(awsComparison).not.toContainText('CloudFront global edge network')
  await expect(awsComparison.getByText('13 Ağustos 2026')).toHaveAttribute(
    'datetime',
    '2026-08-13',
  )

  await page.getByRole('tab', { name: 'Yüksek trafikli uygulama' }).click()
  await page.getByLabel('Aylık dış trafik').fill('1000')
  await page.getByRole('button', { name: 'Hesaplamayı güncelle' }).click()

  await expect(page.getByLabel('Aylık dış trafik')).toHaveValue('1000')
  await expect(decisionSummary).toContainText(/USD\/ay/)
  await expect(page.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })).toBeVisible()

  await page.getByRole('button', { name: /Tüm teklif ayrıntıları/ }).click()
  await expect(page.getByRole('table', { name: 'Servis karşılaştırması' })).toBeVisible()
  const firstEvidence = page
    .getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    .locator('details.comparison-table__evidence')
    .first()
  await firstEvidence.locator('summary[aria-label="Teklif kanıtını göster"]').click()
  await expect(firstEvidence).toHaveAttribute('open', '')

  const firstSource = page
    .getByRole('region', { name: 'Servis karşılaştırma tablosu' })
    .getByRole('link')
    .first()
  await expect(firstSource).toHaveAttribute('href', /^https:\/\//)
  await expect(firstSource).toHaveAttribute('target', '_blank')
  await expect(firstSource).toHaveAttribute('rel', /\bnoopener\b/)

  const filterSummary = page.getByRole('button', { name: /Filtreler/ })
  await filterSummary.click()
  const freeOnly = page.getByRole('checkbox', { name: 'Yalnızca ücretsiz kotası olan servisler' })
  const includeStale = page.getByRole('checkbox', { name: '30 günden eski verileri göster' })
  await freeOnly.check()
  await includeStale.check()
  await expect(filterSummary).toContainText('Filtreler · 2')
  await page.getByRole('button', { name: 'Tümünü temizle' }).click()
  await expect(freeOnly).not.toBeChecked()
  await expect(includeStale).not.toBeChecked()
  await expect(filterSummary).toContainText('Filtreler · 20')

  await expect(page.getByRole('heading', { name: 'Öğren', level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: /temaya geç/ })).toBeVisible()

  await expectNoDocumentOverflow(page)
  await expect.poll(() => consoleProblems).toEqual([])
})

test('mobile flow uses a visible scenario select, stacked inputs, and table-owned overflow', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', {
    name: 'Bulut maliyetini senaryona göre karşılaştır',
  })).toBeVisible()
  await expect(page.locator('vite-error-overlay, nextjs-portal')).toHaveCount(0)

  const mobileMenu = page.locator('.site-header__mobile-menu')
  await mobileMenu.locator('summary[aria-label="Menüyü aç"]').click()
  await expect(mobileMenu.getByRole('link', { name: 'Öğren' })).toHaveAttribute('href', '#ogren')
  await mobileMenu.getByRole('link', { name: 'Öğren' }).click()
  await expect(mobileMenu).not.toHaveAttribute('open', '')

  const scenarioSelect = page.getByLabel('Kullanım senaryosu')
  await expect(scenarioSelect).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Kullanım senaryoları' })).toBeHidden()

  const primaryFields = page.locator('.scenario-calculator__fieldset .scenario-calculator__field')
  const primaryFieldBoxes = await primaryFields.evaluateAll((elements) => elements
    .filter((element) => {
      const bounds = element.getBoundingClientRect()
      return getComputedStyle(element).display !== 'none' && bounds.width > 0 && bounds.height > 0
    })
    .map((element) => {
      const bounds = element.getBoundingClientRect()
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
    }))
  expect(primaryFieldBoxes.length).toBeGreaterThan(1)
  for (const [index, field] of primaryFieldBoxes.entries()) {
    const firstField = primaryFieldBoxes[0]!
    expect(Math.abs(field.x - firstField.x), `primary field ${index + 1} x position`).toBeLessThanOrEqual(1)
    expect(Math.abs(field.width - firstField.width), `primary field ${index + 1} width`).toBeLessThanOrEqual(1)
    if (index > 0) {
      const previousField = primaryFieldBoxes[index - 1]!
      expect(field.y, `primary field ${index + 1} vertical position`)
        .toBeGreaterThanOrEqual(previousField.y + previousField.height)
    }
  }

  const decisionSummary = page.getByRole('region', { name: 'Karar özeti' })
  await expect(page.locator('.scenario-workspace__grid > .scenario-calculator + #sonuclar'))
    .toBeVisible()
  await expect(decisionSummary.getByRole('listitem', { name: /doğrulanmış tahmin/i }).first()).toBeVisible()
  await expect(decisionSummary.getByText('Kullanılan bölgeler').first()).toBeVisible()
  await expect(decisionSummary.getByText('Fiyat tabanı').first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Servis karşılaştırması' })).toHaveCount(0)

  const providerDetailsButton = page.getByRole('button', {
    name: 'Microsoft Azure ayrıntılarını göster',
  })
  await providerDetailsButton.click()
  await expect(page.getByRole('button', { name: 'Microsoft Azure ayrıntılarını gizle' }))
    .toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('link', { name: 'Microsoft Azure resmî sitesi' })).toHaveAttribute('href', /^https:\/\//)
  const azureProviderRow = page.getByRole('listitem', { name: 'Microsoft Azure' })
  const visibleSourceDate = azureProviderRow.locator('.provider-details__sources .source-link time').first()
  await expect(visibleSourceDate).toBeVisible()
  await expect(visibleSourceDate).toHaveAttribute('datetime', '2026-08-13')
  const providerSourceLinkHeight = await visibleSourceDate.locator('..').evaluate(
    (element) => element.getBoundingClientRect().height,
  )
  expect(providerSourceLinkHeight).toBeGreaterThanOrEqual(44)

  await expectNoDocumentOverflow(page)

  await page.getByRole('button', { name: /Tüm teklif ayrıntıları/ }).click()
  const tableRegion = page.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
  await expect(page.getByText('Tabloyu yatay kaydırın; sağlayıcı sütunu sabit kalır.')).toBeVisible()
  const tableLayout = await tableRegion.evaluate((element) => {
    const table = element.querySelector('table')
    const columnHeader = table?.querySelector('thead th:first-child')
    const firstBodyHeader = table?.querySelector('tbody th:first-child')
    if (!table || !columnHeader || !firstBodyHeader) {
      throw new Error('Comparison table structure is missing')
    }
    const scrollLeftBefore = element.scrollLeft
    const bodyHeaderLeftBefore = firstBodyHeader.getBoundingClientRect().left
    element.scrollLeft = 300
    const bodyHeaderLeftAfter = firstBodyHeader.getBoundingClientRect().left
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeftBefore,
      scrollLeftAfter: element.scrollLeft,
      tableDisplay: getComputedStyle(table).display,
      columnHeaderPosition: getComputedStyle(columnHeader).position,
      bodyHeaderPosition: getComputedStyle(firstBodyHeader).position,
      bodyHeaderLeftBefore,
      bodyHeaderLeftAfter,
    }
  })
  expect(tableLayout.scrollWidth).toBeGreaterThan(tableLayout.clientWidth)
  expect(tableLayout.scrollLeftAfter).toBeGreaterThan(tableLayout.scrollLeftBefore)
  expect(tableLayout.tableDisplay).toBe('table')
  expect(tableLayout.columnHeaderPosition).toBe('sticky')
  expect(tableLayout.bodyHeaderPosition).toBe('sticky')
  expect(Math.abs(tableLayout.bodyHeaderLeftAfter - tableLayout.bodyHeaderLeftBefore))
    .toBeLessThanOrEqual(2)

  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(tableRegion).toBeFocused()
  const focusStyle = await tableRegion.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle }
  })
  expect(focusStyle.width).toBeGreaterThanOrEqual(3)
  expect(focusStyle.style).not.toBe('none')

  await expectNoDocumentOverflow(page)
  await expect.poll(() => consoleProblems).toEqual([])
})

test('tablet trust, calculator, decision, and provider surfaces fit with 44px primary controls', async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page)

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')

  await expect(page.getByRole('heading', {
    name: 'Bulut maliyetini senaryona göre karşılaştır',
  })).toBeVisible()
  await expect(page.locator('vite-error-overlay, nextjs-portal')).toHaveCount(0)
  await expect(page.locator('.hero__trust')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Senaryolar' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Karar özeti' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sağlayıcıları karşılaştır' })).toBeVisible()

  for (const selector of [
    '.hero__trust',
    '.scenario-calculator__panel',
    '#sonuclar',
    '#saglayici-karsilastirma',
  ]) {
    const layout = await page.locator(selector).evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      right: element.getBoundingClientRect().right,
    }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    expect(layout.right).toBeLessThanOrEqual(768)
  }

  const primaryControls = page.locator([
    'a.button',
    '.scenario-calculator__actions button',
    '.provider-compare__selector button',
    '.offer-explorer .page-section__heading > button',
  ].join(', '))
  const controlHeights = await primaryControls.evaluateAll((elements) => elements
    .filter((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0
    })
    .map((element) => ({
      text: element.textContent?.trim() ?? '',
      height: element.getBoundingClientRect().height,
    })))
  expect(controlHeights.length).toBeGreaterThan(0)
  for (const control of controlHeights) {
    expect(control.height, control.text).toBeGreaterThanOrEqual(44)
  }

  const primaryCta = page.getByRole('link', { name: 'Hesaplamaya başla' })
  await primaryCta.focus()
  await expect(primaryCta).toBeFocused()
  const focusStyle = await primaryCta.evaluate((element) => {
    const style = getComputedStyle(element)
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle }
  })
  expect(focusStyle.width).toBeGreaterThanOrEqual(3)
  expect(focusStyle.style).not.toBe('none')

  await expectNoDocumentOverflow(page)
  await expect.poll(() => consoleProblems).toEqual([])
})

test('learning recovers invalid storage, advances cards, preserves notes and counts deep dives', async ({ page }) => {
  const problems = collectConsoleProblems(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    if (!localStorage.getItem('cld:learning:v1')) localStorage.setItem('cld:learning:v1', 'null')
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const progress = page.getByTestId('education-overall-progress')
  await expect(progress).toContainText('0 /')
  await page.locator('[data-testid^="learned-toggle-deep-dive:"]').first().click()
  await expect(progress).toContainText('1 /')
  const note = page.getByTestId('notes-bulut-bilesenleri')
  await note.fill('Veri ve erişim sorumluluğum devam eder.')
  await page.getByTestId('glossary-mode-flashcard').click()
  const deck = page.getByTestId('flashcard-deck')
  const first = await deck.getByRole('heading').textContent()
  await page.getByTestId('flashcard-reveal').click()
  await page.getByTestId('flashcard-mark-known').click()
  await expect(deck.getByRole('heading')).not.toHaveText(first!)
  await page.getByTestId('flashcard-filter-repeat').click()
  await expect(deck).toContainText('Tekrar kuyruğu boş')
  await page.getByTestId('flashcard-filter-all').click()
  await expect(deck.getByRole('heading')).toHaveText(first!)
  await expectNoDocumentOverflow(page)
  await page.reload()
  await expect(note).toHaveValue('Veri ve erişim sorumluluğum devam eder.')
  await expect(progress).toContainText('1 /')
  expect(problems).toEqual([])
})

test('advanced input remains usable and stale catalog never produces a current winner', async ({ page }) => {
  const problems = collectConsoleProblems(page)
  await page.goto('/')
  await page.getByText('Gelişmiş kullanım ayarları', { exact: true }).click()
  const input = page.getByRole('spinbutton', { name: 'Aylık GPU kullanımı' })
  await input.fill('')
  await input.pressSequentially('125')
  await expect(input).toBeVisible()
  await expect(input).toHaveValue('125')
  await page.getByRole('button', { name: 'Varsayılan değerlere sıfırla' }).click()
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00Z'))
  await page.reload()
  await expect(page.locator('.catalog-notice')).toContainText('30 günden eski')
  await expect(page.getByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(problems).toEqual([])
})
