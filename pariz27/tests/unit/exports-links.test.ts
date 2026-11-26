import 'fake-indexeddb/auto'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decodeEntities, isPublicAddress, parseHtmlPreview, validateTargetUrl, oembedEndpoint } from '../../api/_lib/preview'
import { budgetToCsv } from '../../src/lib/export/csv'
import { createBackup, restoreBackup } from '../../src/lib/export/backup'
import { linkKind, normalizeUrl } from '../../src/lib/links'
import { P27DB } from '../../src/lib/db'
import { Repo } from '../../src/lib/repo'
import { parseServerTime, normalizeRow } from '../../src/lib/sync/engine'
import type { BudgetItemData } from '../../src/lib/types'

describe('odkazy', () => {
  it('doplní https a vytáhne odkaz z vloženého textu', () => {
    expect(normalizeUrl('instagram.com/p/abc')).toBe('https://instagram.com/p/abc')
    expect(normalizeUrl('Mrkni sem: https://www.tiktok.com/@a/video/1 super')).toBe('https://www.tiktok.com/@a/video/1')
    expect(normalizeUrl('není odkaz')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('ftp://example.com')).toBeNull()
  })
  it('rozpozná typ odkazu', () => {
    expect(linkKind('https://www.instagram.com/p/x')).toBe('instagram')
    expect(linkKind('https://vm.tiktok.com/x')).toBe('tiktok')
    expect(linkKind('https://maps.app.goo.gl/abc')).toBe('maps')
    expect(linkKind('https://www.google.com/maps/place/Louvre')).toBe('maps')
    expect(linkKind('https://mapy.cz/s/abc')).toBe('maps')
    expect(linkKind('https://youtu.be/x')).toBe('youtube')
    expect(linkKind('https://www.louvre.fr')).toBe('web')
  })
})

describe('náhled odkazu – bezpečnost (SSRF)', () => {
  it('blokuje vnitřní adresy', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1'])
      expect(isPublicAddress(ip), ip).toBe(false)
    for (const ip of ['8.8.8.8', '151.101.1.140', '2a00:1450:4001:80b::200e']) expect(isPublicAddress(ip), ip).toBe(true)
  })
  it('povolí jen http/https na standardních portech', () => {
    expect(validateTargetUrl('https://www.louvre.fr/')).not.toBeNull()
    expect(validateTargetUrl('http://localhost/')).toBeNull()
    expect(validateTargetUrl('http://127.0.0.1/')).toBeNull()
    expect(validateTargetUrl('http://[::1]/')).toBeNull()
    expect(validateTargetUrl('https://example.com:8080/')).toBeNull()
    expect(validateTargetUrl('https://user:pw@example.com/')).toBeNull()
    expect(validateTargetUrl('file:///etc/passwd')).toBeNull()
    expect(validateTargetUrl('http://metadata.google.internal/')).toBeNull()
  })
  it('používá oEmbed pro TikTok a YouTube', () => {
    expect(oembedEndpoint(new URL('https://www.tiktok.com/@x/video/1'))).toMatch(/^https:\/\/www\.tiktok\.com\/oembed\?url=/)
    expect(oembedEndpoint(new URL('https://www.louvre.fr'))).toBeNull()
  })
})

describe('náhled odkazu – čtení HTML', () => {
  it('přečte Open Graph', () => {
    const html = `<html><head><title>Záložní</title>
      <meta content="Le Jules Verne &amp; výhled" property="og:title">
      <meta property='og:image' content='/img/cover.jpg'>
      <meta property="og:site_name" content="Restaurant">
      </head></html>`
    expect(parseHtmlPreview(html, 'https://example.com/a/b')).toEqual({
      title: 'Le Jules Verne & výhled',
      image: 'https://example.com/img/cover.jpg',
      site: 'Restaurant',
    })
  })
  it('bez Open Graph použije <title> a obrázek jen přes https', () => {
    expect(parseHtmlPreview('<title> Musée\n d&#39;Orsay </title><meta name="twitter:image" content="http://x.com/a.png">', 'https://x.com')).toEqual({
      title: "Musée d'Orsay",
      image: 'https://x.com/a.png',
      site: null,
    })
    expect(decodeEntities('&#x10D;&lt;&quot;')).toBe('č<"')
  })
})

describe('CSV export', () => {
  const item = (p: Partial<BudgetItemData>): BudgetItemData => ({
    name: 'X', amount_minor: 0, currency: 'CZK', split: false, note: '', category: 'other', paid: false, ...p,
  })
  it('obsahuje původní ceny, příznak ceny za 2 osoby, cenu na osobu a součet', () => {
    const csv = budgetToCsv(
      [
        item({ name: 'Ubytování', amount_minor: 1_200_000, split: true, category: 'accommodation' }),
        item({ name: 'Večeře', amount_minor: 9_000, currency: 'EUR', split: true, category: 'food', paid: true }),
        item({ name: '=HYPERLINK("x")', amount_minor: 100 }),
      ],
      { travelers: 2, eur_rate: 25 },
    )
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe('Kategorie;Název;Zadaná cena;Měna;Cena za 2 osoby;Cena na osobu (původní měna);Kurz EUR/CZK;Do mého rozpočtu (Kč);Zaplaceno;Poznámka')
    expect(lines).toContain('Ubytování;Ubytování;12000,00;CZK;Ano;6000,00;;6000,00;Ne;')
    expect(lines).toContain('Jídlo a restaurace;Večeře;90,00;EUR;Ano;45,00;25;1125,00;Ano;')
    expect(lines).toContain(`Ostatní;"'=HYPERLINK(""x"")";1,00;CZK;Ne;1,00;;1,00;Ne;`)
    expect(lines).toContain('Celkem na osobu (Kč);;;;;;;7126,00')
    expect(lines).toContain('Zaplaceno (Kč);;;;;;;1125,00')
    expect(lines).toContain('Zbývá zaplatit (Kč);;;;;;;6001,00')
  })
  it('bez kurzu nevypíše zavádějící součet', () => {
    const csv = budgetToCsv([item({ amount_minor: 100, currency: 'EUR' })], { travelers: 2, eur_rate: null })
    expect(csv).toContain('Celkem na osobu (Kč);;;;;;;Nelze spočítat – chybí kurz EUR/CZK')
  })
})

describe('záloha JSON', () => {
  it('záloha a obnova na jiném zařízení / účtu', async () => {
    const userA = randomUUID()
    const a = new P27DB(`bk_${randomUUID()}`)
    const repo = new Repo(a, userA)
    await repo.saveSettings({ eur_rate: 25.2, travelers: 2, name: 'Paříž 27' })
    await repo.createItem({ name: 'Ubytování', amount_minor: 1_200_000, currency: 'CZK', split: true, note: 'centrum', category: 'accommodation', paid: false })
    const delId = await repo.createItem({ name: 'Smazaná', amount_minor: 1, currency: 'CZK', split: false, note: '', category: 'other', paid: false })
    await repo.deleteItem(delId)
    const noteId = await repo.createNote({ title: 'Louvre', tags: ['Památky'] })
    await repo.addPhoto(noteId, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), { width: 1, height: 1 })

    const backup = JSON.parse(JSON.stringify(await createBackup(a)))
    expect(backup.budget_items).toHaveLength(1)
    expect(backup.photos).toHaveLength(1)

    const userB = randomUUID()
    const b = new P27DB(`bk_${randomUUID()}`)
    const r = await restoreBackup(b, userB, backup)
    expect(r).toEqual({ items: 1, notes: 1, photos: 1 })
    const settings = await b.trip_settings.get(userB)
    expect(settings).toMatchObject({ eur_rate: 25.2, user_id: userB, _dirty: 1, version: 0 })
    const att = (await b.note_attachments.toArray())[0]
    expect(att.storage_path.startsWith(`${userB}/${noteId}/`)).toBe(true)
    expect((await b.photo_blobs.get(att.id))!.blob.size).toBe(3)
    await expect(restoreBackup(b, userB, { app: 'jiná' })).rejects.toThrow(/není záloha/)
  })
})

describe('časy ze serveru', () => {
  it('přečte mikrosekundy i časové pásmo', () => {
    expect(parseServerTime('2026-11-26T20:33:49.123456+00:00')).toBe(Date.parse('2026-11-26T20:33:49.123Z'))
    expect(normalizeRow('budget_items', { id: 'x', amount_minor: '1200', version: '3', updated_at: '2026-11-26T20:33:49.5+01:00' })).toMatchObject({
      amount_minor: 1200,
      version: 3,
      updated_at: '2026-11-26T19:33:49.500Z',
    })
  })
})
