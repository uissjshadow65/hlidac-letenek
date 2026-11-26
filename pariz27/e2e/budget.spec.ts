import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { addItem, disableWebShare, enterLocalMode, goBudget, itemCard, kc } from './helpers'

test.beforeEach(async ({ page }) => {
  await disableWebShare(page)
  await enterLocalMode(page)
  await goBudget(page)
})

test('příklad ze zadání: 6 000 + 2 500 + 800 = 9 300 Kč na osobu', async ({ page }) => {
  await addItem(page, { name: 'Ubytování', amount: '12000', split: true, category: 'Ubytování', note: 'Apartmán v centru Paříže.' })
  await addItem(page, { name: 'Letenky', amount: '5 000', split: true, category: 'Doprava a letenky' })
  await addItem(page, { name: 'Vstupné', amount: '800', category: 'Památky a vstupné' })

  await expect(page.getByTestId('total-per-person')).toHaveText(kc('9 300 Kč'))
  await expect(page.getByTestId('group-total')).toHaveText(kc('18 600 Kč'))

  const ubyt = itemCard(page, 'Ubytování')
  await expect(ubyt.getByTestId('item-original')).toHaveText(kc('12 000 Kč'))
  await expect(ubyt.getByTestId('item-per-person')).toHaveText(kc('6 000 Kč'))
  await expect(ubyt).toContainText('Cena za 2 osoby')
  await expect(ubyt).toContainText('Apartmán v centru Paříže.')
  await expect(ubyt).toContainText('Nezaplaceno')
  await expect(itemCard(page, 'Letenky').getByTestId('item-per-person')).toHaveText(kc('2 500 Kč'))
  await expect(itemCard(page, 'Vstupné').getByTestId('item-per-person')).toHaveText(kc('800 Kč'))
  await expect(itemCard(page, 'Vstupné')).not.toContainText('Cena za 2 osoby')

  // součty kategorií
  await expect(page.getByTestId('cat-total-accommodation')).toHaveText(kc('6 000 Kč'))
  await expect(page.getByTestId('cat-total-transport')).toHaveText(kc('2 500 Kč'))
  await expect(page.getByTestId('cat-total-sights')).toHaveText(kc('800 Kč'))

  // přehled (dashboard) ukazuje stejné číslo
  await page.getByRole('link', { name: 'Přehled', exact: true }).first().click()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('9 300 Kč'))
  await expect(page.getByTestId('stat-items')).toHaveText('3')

  // data přežijí zavření a znovuotevření aplikace
  await page.reload()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('9 300 Kč'))
})

test('úprava, přepínač ceny za 2 osoby a mazání s potvrzením', async ({ page }) => {
  await addItem(page, { name: 'Ubytování', amount: '12000', split: true, category: 'Ubytování' })
  await addItem(page, { name: 'Vstupné', amount: '800', category: 'Památky a vstupné' })
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('6 800 Kč'))

  // úprava ceny
  await itemCard(page, 'Ubytování').getByRole('button', { name: 'Upravit Ubytování' }).click()
  const dialog = page.getByRole('dialog', { name: 'Upravit položku' })
  await dialog.getByLabel('Cena', { exact: true }).fill('14000')
  await expect(dialog.getByText('Do mého rozpočtu', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Uložit změny' }).click()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('7 800 Kč'))

  // vypnutí „cena za 2 osoby“ → započítá se celá částka
  await itemCard(page, 'Ubytování').getByRole('button', { name: 'Upravit Ubytování' }).click()
  await dialog.getByRole('switch', { name: /Cena je za 2 osoby/ }).uncheck()
  await dialog.getByRole('button', { name: 'Uložit změny' }).click()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('14 800 Kč'))

  // mazání – nejdřív zrušit, pak potvrdit
  await itemCard(page, 'Vstupné').getByRole('button', { name: 'Akce pro Vstupné' }).click()
  await page.getByRole('menuitem', { name: 'Smazat' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Smazat položku?' })
  await confirm.getByRole('button', { name: 'Zrušit' }).click()
  await expect(itemCard(page, 'Vstupné')).toBeVisible()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('14 800 Kč'))

  await itemCard(page, 'Vstupné').getByRole('button', { name: 'Akce pro Vstupné' }).click()
  await page.getByRole('menuitem', { name: 'Smazat' }).click()
  await confirm.getByRole('button', { name: 'Smazat' }).click()
  await expect(itemCard(page, 'Vstupné')).toHaveCount(0)
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('14 000 Kč'))
})

test('zaplacení nemění celkovou cenu, mění zaplaceno / zbývá; filtry', async ({ page }) => {
  await addItem(page, { name: 'Ubytování', amount: '12000', split: true, category: 'Ubytování' })
  await addItem(page, { name: 'Letenky', amount: '5000', split: true, category: 'Doprava a letenky' })
  await expect(page.getByTestId('paid-total').first()).toHaveText(kc('0 Kč'))
  await expect(page.getByTestId('remaining-total').first()).toHaveText(kc('8 500 Kč'))

  await page.getByRole('button', { name: 'Označit „Ubytování“ jako zaplacené' }).click()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('8 500 Kč'))
  await expect(page.getByTestId('paid-total').first()).toHaveText(kc('6 000 Kč'))
  await expect(page.getByTestId('remaining-total').first()).toHaveText(kc('2 500 Kč'))
  await expect(itemCard(page, 'Ubytování')).toContainText('Zaplaceno')

  // filtr stavu platby
  await page.getByRole('radio', { name: /^Zaplaceno/ }).click()
  await expect(page.getByTestId('budget-item')).toHaveCount(1)
  await expect(itemCard(page, 'Ubytování')).toBeVisible()
  await page.getByRole('radio', { name: /^Nezaplaceno/ }).click()
  await expect(page.getByTestId('budget-item')).toHaveCount(1)
  await expect(itemCard(page, 'Letenky')).toBeVisible()
  await page.getByRole('radio', { name: 'Vše', exact: true }).click()

  // filtr kategorie
  await page.getByRole('group', { name: 'Filtr kategorií' }).getByRole('button', { name: 'Doprava' }).click()
  await expect(page.getByTestId('budget-item')).toHaveCount(1)
  await expect(itemCard(page, 'Letenky')).toBeVisible()
  await page.getByRole('group', { name: 'Filtr kategorií' }).getByRole('button', { name: 'Vše' }).click()
  await expect(page.getByTestId('budget-item')).toHaveCount(2)

  // sbalení kategorie
  await page.getByRole('button', { name: /^Ubytování 1 položka/ }).click()
  await expect(itemCard(page, 'Ubytování')).toBeHidden()
})

test('měny: bez kurzu žádný zavádějící součet, kurz přepočítá rozpočet', async ({ page }) => {
  await addItem(page, { name: 'Vstupné', amount: '800', category: 'Památky a vstupné' })
  await addItem(page, { name: 'Večeře', amount: '90', currency: 'EUR', split: true, category: 'Jídlo a restaurace' })

  await expect(page.getByTestId('total-per-person')).toHaveText('—')
  await expect(page.getByText('Celkovou částku nelze spočítat')).toBeVisible()
  await expect(page.getByText(/Nastavte směnný kurz EUR\/CZK/)).toBeVisible()
  await expect(itemCard(page, 'Večeře').getByTestId('item-original')).toHaveText(kc('90 €'))
  await expect(itemCard(page, 'Večeře')).toContainText('chybí kurz')

  // nastavení kurzu
  await page.getByRole('link', { name: 'Nastavení', exact: true }).first().click()
  await page.getByLabel('Směnný kurz EUR/CZK').fill('25,20')
  await page.getByRole('button', { name: 'Uložit změny' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Změnit směnný kurz?' })
  await expect(confirm).toContainText('nenastaveno')
  await confirm.getByRole('button', { name: 'Změnit kurz' }).click()

  await goBudget(page)
  // 800 + 90 € / 2 × 25,20 = 800 + 1 134 = 1 934 Kč
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('1 934 Kč'))
  await expect(itemCard(page, 'Večeře').getByTestId('item-per-person')).toHaveText(kc('1 134 Kč'))
  await expect(itemCard(page, 'Večeře')).toContainText('45 € na osobu')

  // změna kurzu
  await page.getByRole('link', { name: 'Nastavení', exact: true }).first().click()
  await page.getByLabel('Směnný kurz EUR/CZK').fill('24.5')
  await page.getByRole('button', { name: 'Uložit změny' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Změnit kurz' }).click()
  await goBudget(page)
  // 800 + 45 × 24,5 = 800 + 1 102,50
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('1 902,50 Kč'))

  // změna měny položky z EUR na CZK
  await itemCard(page, 'Večeře').getByRole('button', { name: 'Upravit Večeře' }).click()
  const dialog = page.getByRole('dialog', { name: 'Upravit položku' })
  await dialog.getByRole('radio', { name: 'CZK' }).click()
  await dialog.getByLabel('Cena', { exact: true }).fill('2400')
  await dialog.getByRole('button', { name: 'Uložit změny' }).click()
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('2 000 Kč'))
})

test('počet cestujících se promítne do dělení ceny', async ({ page }) => {
  await addItem(page, { name: 'Ubytování', amount: '12000', split: true, category: 'Ubytování' })
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('6 000 Kč'))
  await page.getByRole('link', { name: 'Nastavení', exact: true }).first().click()
  await page.getByRole('button', { name: 'Více cestujících' }).click()
  await expect(page.getByTestId('travelers')).toHaveText('3')
  await page.getByRole('button', { name: 'Uložit změny' }).click()
  await page.getByRole('alertdialog', { name: 'Změnit počet cestujících?' }).getByRole('button', { name: 'Změnit' }).click()
  await goBudget(page)
  await expect(page.getByTestId('total-per-person')).toHaveText(kc('4 000 Kč'))
  await expect(itemCard(page, 'Ubytování')).toContainText('Cena za 3 osoby')
})

test('export do CSV a PDF', async ({ page }) => {
  await addItem(page, { name: 'Ubytování', amount: '12000', split: true, category: 'Ubytování', note: 'Apartmán; centrum' })
  await addItem(page, { name: 'Vstupné', amount: '800', category: 'Památky a vstupné', paid: true })

  await page.getByRole('button', { name: 'Export rozpočtu' }).click()
  const csvDl = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export do CSV' }).click()
  const csv = await csvDl
  expect(csv.suggestedFilename()).toMatch(/^pariz27-rozpocet-\d{4}-\d{2}-\d{2}\.csv$/)
  const text = readFileSync(await csv.path(), 'utf8')
  expect(text.charCodeAt(0)).toBe(0xfeff)
  expect(text).toContain('Ubytování;Ubytování;12000,00;CZK;Ano;6000,00;;6000,00;Ne;"Apartmán; centrum"')
  expect(text).toContain('Památky a vstupné;Vstupné;800,00;CZK;Ne;800,00;;800,00;Ano;')
  expect(text).toMatch(/Celkem na osobu \(Kč\);;;;;;;6800,00/)
  expect(text).toMatch(/Zaplaceno \(Kč\);;;;;;;800,00/)
  expect(text).toMatch(/Zbývá zaplatit \(Kč\);;;;;;;6000,00/)

  await page.getByRole('button', { name: 'Export rozpočtu' }).click()
  const pdfDl = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export do PDF' }).click()
  const pdf = await pdfDl
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/)
  const bytes = readFileSync(await pdf.path())
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(10_000)
})
