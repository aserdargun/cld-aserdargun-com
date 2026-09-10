import { expect, test } from '@playwright/test'
import { catalogSnapshotDate } from '../src/data/snapshot'

test('every preset produces finite evidence-backed results and accessible note inputs', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${catalogSnapshotDate}T12:00:00Z`))
  await page.setViewportSize({ width: 1440, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const tabs = page.getByRole('tablist', { name: 'Kullanım senaryoları' }).getByRole('tab')
  const summary = page.getByRole('region', { name: 'Karar özeti' })
  for (let index = 0; index < await tabs.count(); index++) {
    await tabs.nth(index).click()
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
    await expect(summary.getByRole('listitem', { name: /doğrulanmış tahmin/i }).first()).toBeVisible()
    await expect(summary).not.toContainText(/NaN|Infinity|∞/u)
  }
  for (const name of ['Kubernetes’a giriş', 'Sunucusuz mimari desenleri', 'GPU ve yapay zeka iş yükleri']) {
    await expect(page.getByRole('textbox', { name: `${name} için kişisel not`, exact: true })).toHaveCount(1)
  }
  expect(errors).toEqual([])
})

test('aged catalog cannot advertise verified ranked prices', async ({ page }) => {
  const expired = new Date(`${catalogSnapshotDate}T12:00:00Z`)
  expired.setUTCDate(expired.getUTCDate() + 31)
  await page.clock.setFixedTime(expired)
  await page.goto('/')
  const summary = page.getByRole('region', { name: 'Karar özeti' })
  await expect(summary.getByRole('listitem', { name: /doğrulanmış tahmin/i })).toHaveCount(0)
  await expect(summary).not.toContainText(/En düşük doğrulanmış tahmin/u)
  await expect(page.getByRole('heading', { name: 'Senaryo hesaplayıcı' })).toBeVisible()
})
