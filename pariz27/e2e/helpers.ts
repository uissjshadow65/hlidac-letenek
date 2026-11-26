import { expect, type Page } from '@playwright/test'

/** Částka s libovolnými mezerami (aplikace používá nedělitelné mezery). */
export const kc = (text: string) => new RegExp(`^\\s*${text.replace(/ /g, '\\s')}\\s*$`)

export async function enterLocalMode(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /jen v tomto zařízení/i }).click()
  await expect(page.getByTestId('total-per-person')).toBeVisible()
}

export async function goBudget(page: Page) {
  await page.getByRole('link', { name: 'Rozpočet', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Rozpočet', level: 1 })).toBeVisible()
}

export interface NewItem {
  name: string
  amount: string
  split?: boolean
  category?: string
  currency?: 'CZK' | 'EUR'
  note?: string
  paid?: boolean
}

export async function addItem(page: Page, item: NewItem) {
  await page.getByRole('button', { name: 'Přidat položku' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nová položka' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Název položky').fill(item.name)
  await dialog.getByLabel('Cena', { exact: true }).fill(item.amount)
  if (item.currency === 'EUR') await dialog.getByRole('radio', { name: 'EUR' }).click()
  if (item.split) await dialog.getByRole('switch', { name: /Cena je za/ }).check()
  if (item.category) await dialog.getByRole('radio', { name: item.category, exact: true }).click()
  if (item.paid) await dialog.getByRole('switch', { name: /Zaplaceno/ }).check()
  if (item.note) await dialog.getByLabel('Poznámka').fill(item.note)
  await dialog.getByRole('button', { name: 'Přidat do rozpočtu' }).click()
  await expect(dialog).toBeHidden()
}

export function itemCard(page: Page, name: string) {
  return page.getByTestId('budget-item').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

export async function totalText(page: Page) {
  return (await page.getByTestId('total-per-person').first().innerText()).replace(/\s/g, ' ')
}

/** Na iPhonu/iPadu by export otevřel nabídku Sdílet – v testu chceme klasické stažení. */
export async function disableWebShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

// 1×1 px PNG
export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
