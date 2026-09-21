import { expect, test } from '@playwright/test'
import { catalogSnapshotDate } from '../src/data/snapshot'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${catalogSnapshotDate}T12:00:00Z`))
})

test('English entry translates the calculator, evidence, providers and all in-page targets', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?lang=en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('CLD - Cloud Provider Cost Comparison')
  await expect(
    page.getByRole('heading', { name: 'Compare cloud costs for your scenario' }),
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Small web application' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'High-traffic application' }).click()
  await page.getByLabel('Monthly outbound traffic', { exact: true }).fill('1000')
  await page.getByRole('button', { name: 'Update calculation' }).click()
  await expect(page.locator('.scenario-calculator').getByRole('status')).toContainText(
    'Calculation updated.',
  )
  await expect(page.getByRole('region', { name: 'Decision summary', exact: true })).toContainText(
    'USD/month',
  )
  await page.getByRole('button', { name: /All offer details/ }).click()
  await expect(page.getByRole('table', { name: 'Service comparison', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show Microsoft Azure details' }).click()
  await expect(page.getByRole('button', { name: 'Hide Microsoft Azure details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(
    page.getByRole('link', { name: 'Microsoft Azure official website' }),
  ).toHaveAttribute('href', /^https:/)
  await expect(page.getByRole('link', { name: 'LCL · Local deployment' })).toHaveAttribute(
    'href',
    'https://lcl.aserdargun.com/en/',
  )
  const missingTargets = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute('href')!.slice(1))
        .filter((id) => !document.getElementById(decodeURIComponent(id))),
    )
  expect(missingTargets).toEqual([])
  expect(await page.locator('body').innerText()).not.toMatch(/[ğışİ]/u)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(errors).toEqual([])
})

test('English glossary, flashcards and quiz retain their behavior', async ({ page }) => {
  await page.goto('/?lang=en')
  await page.getByLabel('Search the glossary').fill('outbound')
  await expect(page.getByTestId('glossary-list')).toContainText('Egress (outbound traffic)')
  await expect(page.getByTestId('glossary-list')).not.toContainText('Autoscaling')
  await page.getByLabel('Search the glossary').fill('')
  await page.getByTestId('glossary-mode-flashcard').click()
  await page.getByTestId('flashcard-reveal').click()
  await page.getByTestId('flashcard-mark-known').click()
  await expect(page.locator('.flashcard__stats')).toContainText('1 / 12 known')
  for (const answer of [
    'q-iaas-c',
    'q-egress-b',
    'q-reserved-c',
    'q-serverless-b',
    'q-region-b',
    'q-gpu-b',
    'q-free-tier-b',
  ]) {
    await page.getByTestId(answer).check()
  }
  await page.getByTestId('quiz-submit').click()
  await expect(page.getByTestId('quiz-score')).toContainText('7 / 7 correct')
  await expect(page.locator('.quiz__explanation')).toHaveCount(7)
  expect(await page.locator('#bilgi-testi').innerText()).not.toMatch(/[ğışİ]/u)
})

test('language switch keeps notes, learned marks and the in-page destination', async ({ page }) => {
  await page.goto('/?lang=en&from=portfolio#bulut-bilesenleri')
  await page.getByTestId('notes-bulut-bilesenleri').fill('My own cloud notes')
  const learned = page.getByTestId('learned-toggle-concept:iaas')
  await page.getByTestId('learned-toggle-term:Egress (Çıkış trafiği)').click()
  await learned.click()
  await expect(learned).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('navigation', { name: 'Language', exact: true })
    .getByRole('link', { name: 'TR', exact: true })
    .click()
  await expect(page).toHaveURL(/lang=tr&from=portfolio#bulut-bilesenleri$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(
    page.getByRole('heading', { name: 'Bulut maliyetini senaryona göre karşılaştır' }),
  ).toBeVisible()
  await expect(page.getByTestId('notes-bulut-bilesenleri')).toHaveValue('My own cloud notes')
  await expect(learned).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('learned-toggle-term:Egress (Çıkış trafiği)')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page
    .getByRole('navigation', { name: 'Dil', exact: true })
    .getByRole('link', { name: 'EN', exact: true })
    .click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByTestId('notes-bulut-bilesenleri')).toHaveValue('My own cloud notes')
  await expect(learned).toHaveAttribute('aria-pressed', 'true')
})

for (const width of [390, 768]) {
  test(`English controls and content fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/?lang=en')
    await expect(page.getByRole('navigation', { name: 'Language', exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Compare cloud costs for your scenario' }),
    ).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    for (const link of await page.locator('.language-switch a').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
  })
}
