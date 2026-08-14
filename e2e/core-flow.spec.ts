import { expect, test } from '@playwright/test'

test('high-traffic scenario recomputes major-provider ranking and exposes sources', async ({ page }) => {
  const consoleProblems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push(message.text())
    }
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await expect(page).toHaveTitle('CLD — Bulut maliyetlerini karşılaştır')
  await expect(page.getByRole('heading', { name: 'Bulut maliyetlerini karşılaştır' })).toBeVisible()
  await expect(page.locator('vite-error-overlay, nextjs-portal')).toHaveCount(0)

  const scenarios = page.getByRole('region', { name: 'Senaryolar' })
  await scenarios.getByRole('tab', { name: 'Yüksek trafik' }).click()
  await expect(scenarios.getByLabel('Kullanım senaryosu')).toHaveValue('high-traffic')
  await expect(scenarios.getByRole('note', { name: 'Modelleme kapsamı' })).toContainText(
    'seçili CDN çıkış trafiğini kapsar',
  )

  const ranking = page.getByRole('region', { name: 'Sağlayıcı sıralaması' })
  const azureRanking = ranking.getByRole('listitem', { name: 'Microsoft Azure', exact: true })
  const azureMonthlyTotal = azureRanking.getByRole('status', { name: 'Modellenen aylık tutar' })
  const presetMonthlyTotal = await azureMonthlyTotal.innerText()
  expect(presetMonthlyTotal).toMatch(/^\d[\d.,]* USD\/ay$/)

  await scenarios.getByLabel('Aylık dış trafik').fill('1000')
  await scenarios.getByRole('button', { name: 'Hesaplamayı güncelle' }).click()
  await expect(scenarios.getByLabel('Aylık dış trafik')).toHaveValue('1000')
  await expect(azureMonthlyTotal).not.toHaveText(presetMonthlyTotal)
  await expect(azureMonthlyTotal).toHaveText(/^\d[\d.,]* USD\/ay$/)

  const filters = page.getByRole('region', { name: 'Karşılaştırma filtreleri' })
  const comparison = page.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
  const outOfScopeStorage = comparison.getByRole('row', {
    name: /DigitalOcean Spaces base subscription/,
  })
  await expect(outOfScopeStorage.getByRole('cell').nth(4)).toHaveText('Senaryo kapsamı dışında')
  await expect(outOfScopeStorage).toContainText('$5.00/ay')
  const awsRanking = ranking.getByRole('listitem', { name: 'Amazon Web Services', exact: true })
  const awsGlobal = filters.getByRole('button', {
    name: 'Amazon Web Services · CloudFront global edge network',
  })
  await expect(comparison).toContainText('Amazon CloudFront Pro flat-rate plan')
  await awsGlobal.click()
  await expect(awsGlobal).toHaveAttribute('aria-pressed', 'false')
  await expect(comparison).not.toContainText('Amazon CloudFront Pro flat-rate plan')
  await expect(awsRanking.getByRole('status', { name: 'Modellenen aylık tutar' })).toHaveText(
    'Doğrulanamadı',
  )
  await awsGlobal.click()
  await expect(comparison).toContainText('Amazon CloudFront Pro flat-rate plan')

  for (const provider of ['Hetzner', 'Oracle', 'Cloudflare', 'DigitalOcean', 'Vultr']) {
    await filters.getByRole('button', { name: provider, exact: true }).click()
  }
  for (const provider of ['Azure', 'GCP', 'AWS']) {
    await expect(filters.getByRole('button', { name: provider, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  for (const provider of ['Hetzner', 'Oracle', 'Cloudflare', 'DigitalOcean', 'Vultr']) {
    await expect(filters.getByRole('button', { name: provider, exact: true })).toHaveAttribute('aria-pressed', 'false')
  }

  await expect(ranking.getByRole('listitem')).toHaveCount(3)
  await ranking.locator('summary').first().click()
  await expect(ranking.locator('details').first()).toHaveAttribute('open', '')
  await expect(ranking).toContainText('Kalem')

  const source = comparison
    .getByRole('link')
    .first()
  await expect(source).toHaveAttribute('href', /^https:\/\//)
  await expect(source).toHaveAttribute('target', '_blank')
  await expect(source).toHaveAttribute('rel', /\bnoopener\b/)
  await expect(source.locator('time')).toHaveAttribute('datetime', /^2026-\d{2}-\d{2}$/)

  await expect.poll(() => consoleProblems).toEqual([])
})

test('mobile navigation closes and comparison tables own their horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const menu = page.getByRole('group').filter({ has: page.getByLabel('Menüyü aç') })
  await page.getByLabel('Menüyü aç').click()
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobil navigasyon' })
  await expect(mobileNavigation).toBeVisible()
  await mobileNavigation.getByRole('link', { name: 'Karşılaştırma', exact: true }).click()

  await expect(page).toHaveURL(/#karsilastirma$/)
  await expect(mobileNavigation).toBeHidden()
  await expect(menu).not.toHaveAttribute('open', '')

  const documentWidths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(documentWidths.scrollWidth).toBe(documentWidths.clientWidth)

  const mobileRanking = page.getByRole('region', { name: 'Sağlayıcı sıralaması' })
  const rankingOverflow = await mobileRanking.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }))
  expect(rankingOverflow.overflowY).toBe('visible')
  expect(rankingOverflow.scrollHeight).toBe(rankingOverflow.clientHeight)

  const disclosureHitbox = await mobileRanking.locator('summary').first().evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  })
  expect(disclosureHitbox.width).toBeGreaterThanOrEqual(44)
  expect(disclosureHitbox.height).toBeGreaterThanOrEqual(44)

  for (const actionName of ['Varsayılan değerlere sıfırla', 'Hesaplamayı güncelle']) {
    const actionHeight = await page
      .getByRole('button', { name: actionName })
      .evaluate((element) => element.getBoundingClientRect().height)
    expect(actionHeight).toBeGreaterThanOrEqual(44)
  }

  const tableRegion = page.getByRole('region', { name: 'Servis karşılaştırma tablosu' })
  const tableLayout = await tableRegion.evaluate((element) => {
    const table = element.querySelector('table')
    const providerHeader = table?.querySelector('th:first-child')
    if (!table || !providerHeader) throw new Error('Comparison table structure is missing')
    element.scrollLeft = 300
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
      tableDisplay: getComputedStyle(table).display,
      providerPosition: getComputedStyle(providerHeader).position,
    }
  })
  expect(tableLayout.scrollWidth).toBeGreaterThan(tableLayout.clientWidth)
  expect(tableLayout.scrollLeft).toBeGreaterThan(0)
  expect(tableLayout.tableDisplay).toBe('table')
  expect(tableLayout.providerPosition).toBe('sticky')

  const freeTierSection = page.getByRole('region', { name: 'Ücretsiz kullanım imkânları' })
  await expect(freeTierSection.getByRole('button', { name: 'Azure', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(freeTierSection.getByRole('button', { name: 'GCP', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(freeTierSection.getByRole('button', { name: 'AWS', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(freeTierSection.getByRole('button', { name: 'Oracle', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(freeTierSection).not.toContainText('Amazon Web Services')
  await expect(freeTierSection).not.toContainText('Oracle Cloud Infrastructure')

  await freeTierSection.getByRole('button', { name: 'AWS', exact: true }).click()
  await freeTierSection.getByRole('button', { name: 'Oracle', exact: true }).click()
  await expect(freeTierSection).toContainText('Amazon Web Services')
  await expect(freeTierSection).toContainText('Oracle Cloud Infrastructure')

  const freeTierRegion = page.getByRole('region', { name: 'Ücretsiz katmanlar tablosu' })
  const freeTierLayout = await freeTierRegion.evaluate((element) => {
    const table = element.querySelector('table')
    const providerHeader = table?.querySelector('th:first-child')
    if (!table || !providerHeader) throw new Error('Free-tier table structure is missing')
    element.scrollLeft = 300
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
      tableDisplay: getComputedStyle(table).display,
      providerPosition: getComputedStyle(providerHeader).position,
    }
  })
  expect(freeTierLayout.scrollWidth).toBeGreaterThan(freeTierLayout.clientWidth)
  expect(freeTierLayout.scrollLeft).toBeGreaterThan(0)
  expect(freeTierLayout.tableDisplay).toBe('table')
  expect(freeTierLayout.providerPosition).toBe('sticky')
})
