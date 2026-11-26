/**
 * Testy synchronizace mezi dvěma zařízeními (iPhone a iPad) přes paměťový server.
 */
import 'fake-indexeddb/auto'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { summarize } from '../../src/lib/budget'
import { countPending, P27DB } from '../../src/lib/db'
import { DEFAULT_SETTINGS, Repo } from '../../src/lib/repo'
import { SyncEngine, type SyncEvent } from '../../src/lib/sync/engine'
import type { BudgetItemData } from '../../src/lib/types'
import { MemoryServer, type MemoryRemote } from '../helpers/memoryRemote'

interface Device {
  db: P27DB
  remote: MemoryRemote
  engine: SyncEngine
  repo: Repo
  events: SyncEvent[]
  online: boolean
}

const opened: P27DB[] = []

function device(server: MemoryServer, userId: string, name = randomUUID()): Device {
  const db = new P27DB(`test_${name}`)
  opened.push(db)
  const remote = server.client(userId)
  const d = { db, remote, online: true } as Device
  d.engine = new SyncEngine(db, remote, { isOnline: () => d.online })
  d.repo = new Repo(db, userId)
  d.events = []
  d.engine.on((e) => d.events.push(e))
  return d
}

function setOnline(d: Device, v: boolean) {
  d.online = v
  d.remote.online = v
}

async function liveItems(d: Device) {
  return (await d.db.budget_items.toArray()).filter((i) => !i.deleted_at)
}

async function total(d: Device) {
  const s = (await d.db.trip_settings.get(d.repo.userId)) ?? DEFAULT_SETTINGS
  return summarize(await liveItems(d), s).total
}

const item = (p: Partial<BudgetItemData>): BudgetItemData => ({
  name: 'Položka',
  amount_minor: 0,
  currency: 'CZK',
  split: false,
  note: '',
  category: 'other',
  paid: false,
  ...p,
})

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close()
    await db.delete()
  }
})

describe('synchronizace dvou zařízení', () => {
  it('položky z iPhonu se objeví na iPadu se stejným součtem', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)

    await phone.repo.createItem(item({ name: 'Ubytování', amount_minor: 1_200_000, split: true, category: 'accommodation' }))
    await phone.repo.createItem(item({ name: 'Letenky', amount_minor: 500_000, split: true, category: 'transport' }))
    await phone.repo.createItem(item({ name: 'Vstupné', amount_minor: 80_000, category: 'sights' }))
    expect(await countPending(phone.db)).toBe(3)

    await phone.engine.sync()
    expect(await countPending(phone.db)).toBe(0)
    expect(phone.engine.state.phase).toBe('idle')

    await pad.engine.sync()
    expect((await liveItems(pad)).map((i) => i.name).sort()).toEqual(['Letenky', 'Ubytování', 'Vstupné'])
    expect(await total(pad)).toBe(930_000)
    expect(await total(phone)).toBe(930_000)
  })

  it('úprava a smazání se přenese na druhé zařízení', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)
    const id = await phone.repo.createItem(item({ name: 'Restaurace', amount_minor: 200_000 }))
    const id2 = await phone.repo.createItem(item({ name: 'Muzeum', amount_minor: 50_000 }))
    await phone.engine.sync()
    await pad.engine.sync()

    await pad.repo.updateItem(id, { amount_minor: 300_000, paid: true })
    await pad.repo.deleteItem(id2)
    await pad.engine.sync()
    await phone.engine.sync()

    const items = await liveItems(phone)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ amount_minor: 300_000, paid: true, _dirty: 0, version: 2 })
    // tombstone se po potvrzení odstraní i lokálně
    expect(await pad.db.budget_items.get(id2)).toBeUndefined()
    expect(await phone.db.budget_items.get(id2)).toBeUndefined()
  })

  it('data různých uživatelů se nemíchají', async () => {
    const server = new MemoryServer()
    const a = device(server, randomUUID())
    const b = device(server, randomUUID())
    await a.repo.createItem(item({ name: 'Tajné', amount_minor: 100 }))
    await a.engine.sync()
    await b.engine.sync()
    expect(await b.db.budget_items.count()).toBe(0)
  })
})

describe('offline režim', () => {
  it('změny bez internetu čekají a po připojení se odešlou', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)

    setOnline(phone, false)
    await phone.repo.createItem(item({ name: 'Vlak z letiště', amount_minor: 30_000, category: 'transport' }))
    await phone.engine.sync()
    expect(phone.engine.state.phase).toBe('offline')
    expect(await countPending(phone.db)).toBe(1)
    expect(server.tables.budget_items.size).toBe(0)

    setOnline(phone, true)
    await phone.engine.sync()
    expect(phone.engine.state.phase).toBe('idle')
    expect(await countPending(phone.db)).toBe(0)

    await pad.engine.sync()
    expect((await liveItems(pad))[0].name).toBe('Vlak z letiště')
  })

  it('výpadek uprostřed synchronizace nic neztratí', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const id = await phone.repo.createItem(item({ name: 'Letenky', amount_minor: 500_000 }))
    // server položku uloží, ale odpověď se ztratí
    phone.remote.loseNextResponse = true
    await phone.engine.sync()
    expect(phone.engine.state.phase).toBe('offline')
    expect(server.tables.budget_items.size).toBe(1)
    expect(await countPending(phone.db)).toBe(1)

    // další pokus zjistí, že položka už na serveru je se stejným obsahem
    await phone.engine.sync()
    expect(await countPending(phone.db)).toBe(0)
    expect(await phone.db.conflicts.count()).toBe(0)
    expect((await phone.db.budget_items.get(id))!.version).toBe(1)
  })

  it('data přežijí zavření aplikace (nové otevření databáze)', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const name = randomUUID()
    const phone = device(server, user, name)
    setOnline(phone, false)
    await phone.repo.createItem(item({ name: 'Ubytování', amount_minor: 1_200_000, split: true }))
    phone.db.close()

    const reopened = new P27DB(`test_${name}`)
    opened.push(reopened)
    const rows = await reopened.budget_items.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]._dirty).toBe(1) // stále čeká na odeslání
    const engine = new SyncEngine(reopened, server.client(user), { isOnline: () => true })
    await engine.sync()
    expect(server.tables.budget_items.size).toBe(1)
  })
})

describe('konflikty', () => {
  async function setupConflict() {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)
    const id = await phone.repo.createItem(item({ name: 'Ubytování', amount_minor: 1_000_000 }))
    await phone.engine.sync()
    await pad.engine.sync()

    // obě zařízení offline upraví stejnou položku
    setOnline(phone, false)
    setOnline(pad, false)
    await phone.repo.updateItem(id, { amount_minor: 1_100_000 })
    await pad.repo.updateItem(id, { amount_minor: 1_200_000 })
    setOnline(phone, true)
    setOnline(pad, true)
    await phone.engine.sync()
    await pad.engine.sync()
    return { server, phone, pad, id }
  }

  it('souběžná úprava nic tiše nepřepíše – vznikne konflikt', async () => {
    const { server, pad, id } = await setupConflict()
    expect(server.tables.budget_items.get(id)!.amount_minor).toBe(1_100_000)
    // iPad si ponechal svou verzi a ohlásil konflikt
    expect((await pad.db.budget_items.get(id))!.amount_minor).toBe(1_200_000)
    const conflicts = await pad.db.conflicts.toArray()
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].local.amount_minor).toBe(1_200_000)
    expect(conflicts[0].server!.amount_minor).toBe(1_100_000)
    expect(pad.events.some((e) => e.type === 'conflict')).toBe(true)
  })

  it('vyřešení „ponechat moji verzi“ přepíše server', async () => {
    const { server, phone, pad, id } = await setupConflict()
    await pad.engine.resolveKeepLocal(`budget_items:${id}`)
    await pad.engine.sync()
    expect(server.tables.budget_items.get(id)!.amount_minor).toBe(1_200_000)
    expect(await pad.db.conflicts.count()).toBe(0)
    await phone.engine.sync()
    expect((await phone.db.budget_items.get(id))!.amount_minor).toBe(1_200_000)
  })

  it('vyřešení „použít verzi z druhého zařízení“ zahodí lokální změnu', async () => {
    const { server, pad, id } = await setupConflict()
    await pad.engine.resolveKeepServer(`budget_items:${id}`)
    await pad.engine.sync()
    expect((await pad.db.budget_items.get(id))!).toMatchObject({ amount_minor: 1_100_000, _dirty: 0 })
    expect(server.tables.budget_items.get(id)!.amount_minor).toBe(1_100_000)
  })

  it('úprava na jednom a smazání na druhém zařízení → konflikt, ne tichá ztráta', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)
    const id = await phone.repo.createItem(item({ name: 'Louvre', amount_minor: 40_000 }))
    await phone.engine.sync()
    await pad.engine.sync()
    await phone.repo.deleteItem(id)
    await phone.engine.sync()
    await pad.repo.updateItem(id, { note: 'Koupit online' })
    await pad.engine.sync()
    const c = await pad.db.conflicts.toArray()
    expect(c).toHaveLength(1)
    expect(c[0].server!.deleted_at).toBeTruthy()
    // obnovení: ponechat moji verzi
    await pad.engine.resolveKeepLocal(c[0].key)
    await pad.engine.sync()
    expect(server.tables.budget_items.get(id)!.deleted_at).toBeNull()
    await phone.engine.sync()
    expect((await phone.db.budget_items.get(id))!.note).toBe('Koupit online')
  })

  it('změna provedená během odesílání se neztratí', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const id = await phone.repo.createItem(item({ name: 'A', amount_minor: 100 }))
    const origInsert = phone.remote.insert.bind(phone.remote)
    phone.remote.insert = async (t, row) => {
      const res = await origInsert(t, row)
      // uživatel mezitím položku upraví
      await phone.repo.updateItem(id, { name: 'B' })
      return res
    }
    await phone.engine.sync()
    phone.remote.insert = origInsert
    await phone.engine.sync()
    expect(server.tables.budget_items.get(id)!.name).toBe('B')
    expect(await countPending(phone.db)).toBe(0)
  })
})

describe('nastavení a kurz', () => {
  it('změna kurzu na druhém zařízení vyvolá upozornění', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)
    await phone.repo.saveSettings({ eur_rate: 25.2 })
    await phone.engine.sync()
    await pad.engine.sync()
    expect((await pad.db.trip_settings.get(user))!.eur_rate).toBe(25.2)

    await phone.repo.saveSettings({ eur_rate: 24.9, travelers: 3 })
    await phone.engine.sync()
    pad.events.length = 0
    await pad.engine.sync()
    expect(pad.events).toContainEqual({ type: 'rate-changed', from: 25.2, to: 24.9 })
    expect((await pad.db.trip_settings.get(user))!.travelers).toBe(3)
  })

  it('nastavení vytvořené na dvou zařízeních zároveň → konflikt místo přepsání', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)
    await phone.repo.saveSettings({ eur_rate: 25 })
    await pad.repo.saveSettings({ eur_rate: 26 })
    await phone.engine.sync()
    await pad.engine.sync()
    expect(await pad.db.conflicts.count()).toBe(1)
    expect(server.tables.trip_settings.get(user)!.eur_rate).toBe(25)
  })
})

describe('poznámky a fotografie', () => {
  it('fotografie se nahraje, druhé zařízení ji stáhne a smazání poznámky odstraní i soubory', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const pad = device(server, user)

    const noteId = await phone.repo.createNote({ title: 'Restaurace s výhledem', tags: ['Restaurace'] })
    await phone.repo.updateNote(noteId, {
      links: [{ id: 'l1', url: 'https://www.instagram.com/p/abc/', title: null, image: null, site: 'Instagram', fetched_at: null }],
    })
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], { type: 'image/jpeg' })
    const photoId = await phone.repo.addPhoto(noteId, photo, { width: 10, height: 10 })
    await phone.engine.sync()

    const path = `${user}/${noteId}/${photoId}.jpg`
    expect(server.files.has(path)).toBe(true)
    expect(server.tables.note_attachments.get(photoId)!.storage_path).toBe(path)

    await pad.engine.sync()
    expect((await pad.db.notes.get(noteId))!.links[0].url).toBe('https://www.instagram.com/p/abc/')
    const blob = await pad.db.photo_blobs.get(photoId)
    expect(blob).toBeTruthy()
    expect(blob!.blob.size).toBe(6)

    await pad.repo.deleteNote(noteId)
    await pad.engine.sync()
    expect(server.files.size).toBe(0)
    expect(server.tables.notes.get(noteId)!.deleted_at).toBeTruthy()
    expect(server.tables.note_attachments.get(photoId)!.deleted_at).toBeTruthy()
    expect(await pad.db.photo_blobs.count()).toBe(0)

    await phone.engine.sync()
    expect(await phone.db.notes.get(noteId)).toBeUndefined()
    expect(await phone.db.note_attachments.get(photoId)).toBeUndefined()
    expect(await phone.db.photo_blobs.count()).toBe(0)
  })

  it('smazání samotné fotografie odstraní soubor ze serveru', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    const noteId = await phone.repo.createNote({ title: 'Galerie' })
    const p1 = await phone.repo.addPhoto(noteId, new Blob(['a'], { type: 'image/jpeg' }), { width: 1, height: 1 })
    const p2 = await phone.repo.addPhoto(noteId, new Blob(['b'], { type: 'image/jpeg' }), { width: 1, height: 1 })
    await phone.engine.sync()
    expect(server.files.size).toBe(2)
    await phone.repo.removePhoto(p1)
    await phone.engine.sync()
    expect(server.files.size).toBe(1)
    expect(server.tables.note_attachments.get(p1)!.deleted_at).toBeTruthy()
    expect(server.tables.note_attachments.get(p2)!.deleted_at).toBeNull()
  })

  it('fotografie přidaná a hned smazaná offline se na server vůbec nedostane', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    setOnline(phone, false)
    const noteId = await phone.repo.createNote({ title: 'Nákupy' })
    const p = await phone.repo.addPhoto(noteId, new Blob(['x'], { type: 'image/jpeg' }), { width: 1, height: 1 })
    await phone.repo.removePhoto(p)
    setOnline(phone, true)
    await phone.engine.sync()
    expect(server.files.size).toBe(0)
    expect(server.tables.note_attachments.size).toBe(0)
    expect(server.tables.notes.size).toBe(1)
    expect(await countPending(phone.db)).toBe(0)
  })

  it('realtime upozornění spustí stažení', async () => {
    const server = new MemoryServer()
    const user = randomUUID()
    const phone = device(server, user)
    let notified = 0
    const unsub = phone.remote.subscribe(() => notified++)
    const pad = device(server, user)
    await pad.repo.createNote({ title: 'Nápad' })
    await pad.engine.sync()
    unsub()
    expect(notified).toBeGreaterThan(0)
  })
})
