import { expect, test } from '@playwright/test'
import { enterLocalMode, PNG_1PX } from './helpers'

test.beforeEach(async ({ page }) => {
  await enterLocalMode(page)
  await page.getByRole('link', { name: /^Nápady/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Nápady a poznámky', level: 1 })).toBeVisible()
})

async function newNote(page: import('@playwright/test').Page, title: string, body: string) {
  await page.getByRole('button', { name: 'Nový nápad' }).first().click()
  await page.getByLabel('Nadpis').fill(title)
  await page.getByLabel('Text poznámky').fill(body)
}

test('poznámka s textem, fotkami, odkazem a štítkem; uložení a obnovení', async ({ page }) => {
  await newNote(page, 'Restaurace s výhledem na Eiffelovu věž', 'Les Ombres – rezervovat 3 týdny dopředu.')
  await expect(page.getByText('Uloženo')).toBeVisible()

  // fotografie z galerie (dvě najednou)
  await page.getByTestId('photo-input').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: PNG_1PX },
    { name: 'b.png', mimeType: 'image/png', buffer: PNG_1PX },
  ])
  await expect(page.getByRole('button', { name: /Zobrazit fotografii/ })).toHaveCount(2)

  // odkaz – klikací, otevírá se mimo aplikaci
  await page.getByLabel('Nový odkaz').fill('instagram.com/p/C0abc123/')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()
  const link = page.getByRole('link', { name: /instagram\.com/ })
  await expect(link).toHaveAttribute('href', 'https://instagram.com/p/C0abc123/')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toContainText('Instagram')

  // neplatný odkaz
  await page.getByLabel('Nový odkaz').fill('není odkaz')
  await page.getByRole('button', { name: 'Přidat', exact: true }).click()
  await expect(page.getByText('Tohle nevypadá jako webová adresa.')).toBeVisible()
  await page.getByLabel('Nový odkaz').fill('')

  // štítky – přednastavený i vlastní
  await page.getByRole('button', { name: 'Restaurace', exact: true }).click()
  await page.getByRole('button', { name: 'Vlastní' }).click()
  await page.getByLabel('Nový štítek').fill('Romantika')
  await page.getByLabel('Nový štítek').press('Enter')
  await expect(page.getByRole('button', { name: 'Romantika', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // smazání jedné fotky
  await page.getByRole('button', { name: 'Odebrat fotografii' }).first().click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Smazat' }).click()
  await expect(page.getByRole('button', { name: /Zobrazit fotografii/ })).toHaveCount(1)

  await page.getByRole('button', { name: 'Hotovo' }).click()
  const card = page.getByTestId('note-card')
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Restaurace s výhledem na Eiffelovu věž')
  await expect(card).toContainText('Restaurace')
  await expect(card).toContainText('1 odkaz')
  await expect(card.locator('img')).toHaveCount(1)

  // po zavření a znovuotevření je vše na místě (včetně fotky)
  await page.reload()
  await expect(page.getByTestId('note-card')).toContainText('Les Ombres')
  await expect(page.getByTestId('note-card').locator('img')).toHaveCount(1)
  await page.getByRole('link', { name: /Otevřít Restaurace/ }).click()
  await expect(page.getByLabel('Nadpis')).toHaveValue('Restaurace s výhledem na Eiffelovu věž')
  await expect(page.getByLabel('Text poznámky')).toHaveValue('Les Ombres – rezervovat 3 týdny dopředu.')
  await expect(page.getByRole('button', { name: /Zobrazit fotografii/ })).toHaveCount(1)
})

test('vyhledávání, filtr štítků, připnutí a smazání', async ({ page }) => {
  await newNote(page, 'Louvre ve středu večer', 'Otevřeno do 21:45, méně lidí.')
  await page.getByRole('button', { name: 'Památky', exact: true }).click()
  await page.getByRole('button', { name: 'Hotovo' }).click()
  await newNote(page, 'Croissant v Du Pain et des Idées', 'Pistáciový šnek!')
  await page.getByRole('button', { name: 'Restaurace', exact: true }).click()
  await page.getByRole('button', { name: 'Hotovo' }).click()
  await expect(page.getByTestId('note-card')).toHaveCount(2)

  // vyhledávání v textu bez ohledu na diakritiku
  await page.getByLabel('Hledat v nápadech').fill('pistaciovy')
  await expect(page.getByTestId('note-card')).toHaveCount(1)
  await expect(page.getByTestId('note-card')).toContainText('Croissant')
  await page.getByLabel('Hledat v nápadech').fill('louvre')
  await expect(page.getByTestId('note-card')).toHaveCount(1)
  await page.getByLabel('Vymazat hledání').click()

  // filtr štítků
  await page.getByRole('group', { name: 'Filtr štítků' }).getByRole('button', { name: 'Památky' }).click()
  await expect(page.getByTestId('note-card')).toHaveCount(1)
  await expect(page.getByTestId('note-card')).toContainText('Louvre')
  await page.getByRole('group', { name: 'Filtr štítků' }).getByRole('button', { name: 'Vše' }).click()

  // připnutí – připnutá poznámka je v sekci Připnuté
  await page.getByTestId('note-card').filter({ hasText: 'Louvre' }).getByRole('button', { name: 'Připnout poznámku' }).click()
  await expect(page.getByRole('heading', { name: 'Připnuté' })).toBeVisible()
  await expect(page.getByTestId('note-card').first()).toContainText('Louvre')

  // smazání s potvrzením
  await page.getByRole('link', { name: /Otevřít Croissant/ }).click()
  await page.getByRole('button', { name: 'Další akce s poznámkou' }).click()
  await page.getByRole('menuitem', { name: 'Smazat poznámku' }).click()
  await page.getByRole('alertdialog', { name: 'Smazat poznámku?' }).getByRole('button', { name: 'Smazat' }).click()
  await expect(page.getByRole('heading', { name: 'Nápady a poznámky', level: 1 })).toBeVisible()
  await expect(page.getByTestId('note-card')).toHaveCount(1)
})

test('prázdná poznámka se neuloží', async ({ page }) => {
  await page.getByRole('button', { name: 'Nový nápad' }).first().click()
  await page.getByRole('button', { name: 'Hotovo' }).click()
  await expect(page.getByText('Zapište první nápad')).toBeVisible()
})
