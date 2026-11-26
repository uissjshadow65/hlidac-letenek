import { expect, test } from '@playwright/test'
import { addItem, enterLocalMode, expectNoHorizontalScroll, goBudget, kc } from './helpers'

test('manifest, ikony a meta značky pro instalaci na iPhone/iPad', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Paříž 27')
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes')
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Paříž 27')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  expect((await request.get(touchIcon!)).status()).toBe(200)

  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await request.get(href!)).json()
  expect(manifest.name).toBe('Paříž 27')
  expect(manifest.short_name).toBe('Paříž 27')
  expect(manifest.display).toBe('standalone')
  expect(manifest.lang).toBe('cs')
  for (const icon of manifest.icons) expect((await request.get(icon.src)).headers()['content-type']).toContain('image/png')
})

test('offline: aplikace se otevře bez internetu a ukládá změny', async ({ page, context }) => {
  await enterLocalMode(page)
  // počkáme, až service worker uloží aplikaci do zařízení
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration()
    return !!reg?.active
  })
  await page.reload()
  await goBudget(page)
  await addItem(page, { name: 'Letenky', amount: '5000', split: true })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('2 500 Kč'))
  await addItem(page, { name: 'Vlak z letiště', amount: '300', category: 'Doprava a letenky' })
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('2 800 Kč'))
  await page.goto('/napady')
  await expect(page.getByRole('heading', { name: 'Nápady a poznámky' })).toBeVisible()
  await context.setOffline(false)
})

test('žádné vodorovné posouvání na žádné obrazovce', async ({ page }) => {
  await enterLocalMode(page)
  await goBudget(page)
  await addItem(page, { name: 'Velmi dlouhý název položky, který se musí hezky zalomit i na malém displeji', amount: '123456,78', split: true })
  for (const path of ['/', '/rozpocet', '/napady', '/nastaveni', '/napady/nova']) {
    await page.goto(path)
    await page.waitForTimeout(150)
    await expectNoHorizontalScroll(page)
  }
})

test('navigace je dostupná na každé obrazovce', async ({ page }, info) => {
  await enterLocalMode(page)
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' })
  for (const name of ['Rozpočet', /^Nápady/, 'Nastavení', 'Přehled']) {
    await nav.getByRole('link', { name }).filter({ visible: true }).click()
    await expect(nav.filter({ visible: true })).toHaveCount(1)
  }
  if (info.project.name === 'iphone') {
    // na telefonu spodní lišta, na iPadu boční panel
    const box = await nav.filter({ visible: true }).boundingBox()
    expect(box!.y + box!.height).toBeGreaterThan(page.viewportSize()!.height - 2)
  }
})
