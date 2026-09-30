import { expect, test } from '@playwright/test'
import { catalogSnapshotDate } from '../src/data/snapshot'

test('every preset produces finite evidence-backed results and accessible note inputs', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(`${catalogSnapshotDate}T12:00:00Z`))
  await page.setViewportSize({ width: 1440, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?lang=tr')
  const tabs = page.getByRole('tablist', { name: 'Kullanım senaryoları' }).getByRole('tab')
  const summary = page.getByRole('region', { name: 'Karar özeti' })
  for (let index = 0; index < (await tabs.count()); index++) {
    await tabs.nth(index).click()
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
    await expect(
      summary.getByRole('listitem', { name: /doğrulanmış tahmin/i }).first(),
    ).toBeVisible()
    await expect(summary).not.toContainText(/NaN|Infinity|∞/u)
  }
  for (const name of [
    'Kubernetes’a giriş',
    'Sunucusuz mimari desenleri',
    'GPU ve yapay zeka iş yükleri',
  ]) {
    await expect(
      page.getByRole('textbox', { name: `${name} için kişisel not`, exact: true }),
    ).toHaveCount(1)
  }
  expect(errors).toEqual([])
})

test('aged catalog cannot advertise verified ranked prices', async ({ page }) => {
  const expired = new Date(`${catalogSnapshotDate}T12:00:00Z`)
  expired.setUTCDate(expired.getUTCDate() + 31)
  await page.clock.setFixedTime(expired)
  await page.goto('/?lang=tr')
  const summary = page.getByRole('region', { name: 'Karar özeti' })
  await expect(summary.getByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveCount(0)
  await expect(summary).not.toContainText(/En düşük doğrulanmış tahmin/u)
  await expect(page.getByRole('heading', { name: 'Senaryo hesaplayıcı' })).toBeVisible()
})

test('current-date notices and portfolio context stay visible on desktop and mobile', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text())
  })
  await page.clock.setFixedTime(new Date('2026-09-21T12:00:00Z'))
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?lang=tr')
    // main.tsx sets one document title for both languages; the Turkish body copy is
    // asserted below, so the title expectation follows the application contract.
    await expect(page).toHaveTitle('CLD — Cloud Provider Cost Comparison')
    await expect(
      page.getByText('Güncel ve kaynaklı ECB EUR/USD kuru yok.', { exact: false }),
    ).toBeVisible()
    const lastNotice = await page.locator('.catalog-notice').last().boundingBox()
    const workspace = await page.locator('.scenario-workspace').boundingBox()
    expect(workspace!.y).toBeGreaterThanOrEqual(lastNotice!.y + lastNotice!.height)
    await expect(page.getByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveCount(0)
    const system = page.getByRole('region', { name: 'aserdargun.com öğrenme sistemi' })
    await system.scrollIntoViewIfNeeded()
    await expect(
      system.getByRole('link', { name: 'DCL · Ortak CLD / LCL laboratuvarı' }),
    ).toHaveAttribute('href', 'https://dcl.aserdargun.com/?lang=tr')
    await expect(system).toContainText('ortak karar laboratuvarıdır')
    await expect(system.getByRole('link')).toHaveCount(5)
    await page.getByText('Eğitim açıklamalarının resmî kaynakları', { exact: true }).click()
    await expect(page.getByRole('link', { name: /AWS · Spot kesinti bildirimleri/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
  expect(errors).toEqual([])
})
