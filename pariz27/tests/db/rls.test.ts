/**
 * Testy databázové migrace a zabezpečení (Row Level Security) na skutečném
 * PostgreSQL. Spouštějí se příkazem `npm run test:db`.
 *
 * Potřebují běžící PostgreSQL – připojení se nastaví proměnnou
 * TEST_DATABASE_URL (výchozí postgres://postgres:postgres@localhost:5432/postgres).
 */
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres'
const dbName = `p27_test_${Date.now()}`

let admin: pg.Client
let client: pg.Client

const alice = randomUUID()
const bob = randomUUID()

/** Spustí dotaz jako přihlášený uživatel (stejně jako PostgREST v Supabase). */
async function asUser<T = Record<string, unknown>>(userId: string | null, sql: string, params: unknown[] = []) {
  await client.query('begin')
  try {
    if (userId) {
      await client.query('set local role authenticated')
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: userId, role: 'authenticated' })])
    } else {
      await client.query('set local role anon')
    }
    const res = await client.query(sql, params)
    await client.query('commit')
    return res as pg.QueryResult<T & pg.QueryResultRow>
  } catch (e) {
    await client.query('rollback')
    throw e
  }
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`create database ${dbName}`)
  const url = new URL(adminUrl)
  url.pathname = `/${dbName}`
  client = new pg.Client({ connectionString: url.toString() })
  await client.connect()
  // role jsou v clusteru globální – vytvoříme je jen pokud chybí
  const roles = await client.query(`select rolname from pg_roles where rolname in ('anon','authenticated')`)
  let stub = readFileSync(join(here, 'supabase-stub.sql'), 'utf8')
  if (roles.rowCount === 2) stub = stub.replace(/create role \w+ nologin;/g, '')
  await client.query(stub)
  await client.query(readFileSync(join(here, '../../supabase/migrations/20261126000000_init.sql'), 'utf8'))
  await client.query(`insert into auth.users (id, email) values ($1, 'alice@example.com'), ($2, 'bob@example.com')`, [alice, bob])
})

afterAll(async () => {
  await client?.end()
  await admin?.query(`drop database if exists ${dbName}`)
  await admin?.end()
})

describe('migrace', () => {
  it('vytvoří všechny tabulky se zapnutým RLS', async () => {
    const res = await client.query(
      `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`,
    )
    expect(res.rows).toEqual([
      { relname: 'budget_items', relrowsecurity: true },
      { relname: 'note_attachments', relrowsecurity: true },
      { relname: 'notes', relrowsecurity: true },
      { relname: 'trip_settings', relrowsecurity: true },
    ])
  })

  it('přidá tabulky do realtime publikace', async () => {
    const res = await client.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)
    expect(res.rows.map((r) => r.tablename)).toEqual(['budget_items', 'note_attachments', 'notes', 'trip_settings'])
  })

  it('vytvoří soukromý bucket na fotografie', async () => {
    const res = await client.query(`select public from storage.buckets where id = 'note-photos'`)
    expect(res.rows).toEqual([{ public: false }])
  })
})

describe('rozpočet – vlastnictví dat', () => {
  const itemId = randomUUID()

  it('uživatel vloží vlastní položku, user_id se doplní automaticky', async () => {
    const res = await asUser(
      alice,
      `insert into budget_items (id, name, amount_minor, currency, split, category) values ($1, 'Ubytování', 1200000, 'CZK', true, 'accommodation') returning *`,
      [itemId],
    )
    expect(res.rows[0].user_id).toBe(alice)
    expect(res.rows[0].version).toBe(1)
  })

  it('jiný uživatel položku nevidí', async () => {
    const res = await asUser(bob, `select * from budget_items`)
    expect(res.rowCount).toBe(0)
  })

  it('jiný uživatel položku nemůže změnit ani smazat', async () => {
    const upd = await asUser(bob, `update budget_items set name = 'hack' where id = $1`, [itemId])
    expect(upd.rowCount).toBe(0)
    const del = await asUser(bob, `delete from budget_items where id = $1`, [itemId])
    expect(del.rowCount).toBe(0)
    const own = await asUser(alice, `select name from budget_items where id = $1`, [itemId])
    expect(own.rows[0].name).toBe('Ubytování')
  })

  it('nelze vložit položku jménem jiného uživatele', async () => {
    await expect(
      asUser(bob, `insert into budget_items (id, user_id, name, amount_minor) values ($1, $2, 'X', 100)`, [randomUUID(), alice]),
    ).rejects.toThrow(/row-level security/)
  })

  it('nelze přepsat vlastníka existující položky', async () => {
    await expect(asUser(alice, `update budget_items set user_id = $2 where id = $1`, [itemId, bob])).rejects.toThrow()
  })

  it('nepřihlášený uživatel nemá přístup', async () => {
    await expect(asUser(null, `select * from budget_items`)).rejects.toThrow(/permission denied/)
  })

  it('každá změna zvýší verzi – podmíněná změna podle verze funguje', async () => {
    const ok = await asUser(alice, `update budget_items set paid = true where id = $1 and version = 1 returning version`, [itemId])
    expect(ok.rows[0].version).toBe(2)
    // druhé zařízení se stále odkazuje na verzi 1 → nic se nepřepíše
    const stale = await asUser(alice, `update budget_items set paid = false where id = $1 and version = 1 returning version`, [itemId])
    expect(stale.rowCount).toBe(0)
  })

  it('verzi ani updated_at nelze podvrhnout z klienta', async () => {
    const res = await asUser(
      alice,
      `update budget_items set version = 999, updated_at = '2000-01-01' where id = $1 returning version, updated_at`,
      [itemId],
    )
    expect(res.rows[0].version).toBe(3)
    expect(new Date(res.rows[0].updated_at as string).getFullYear()).toBeGreaterThan(2020)
  })

  it('odmítne nesmyslná data', async () => {
    await expect(asUser(alice, `insert into budget_items (id, name, amount_minor) values ($1, 'X', -5)`, [randomUUID()])).rejects.toThrow()
    await expect(
      asUser(alice, `insert into budget_items (id, name, amount_minor, currency) values ($1, 'X', 5, 'USD')`, [randomUUID()]),
    ).rejects.toThrow()
    await expect(
      asUser(alice, `insert into budget_items (id, name, amount_minor, category) values ($1, 'X', 5, 'kasino')`, [randomUUID()]),
    ).rejects.toThrow()
  })
})

describe('nastavení cesty', () => {
  it('jeden řádek na uživatele s id = id uživatele', async () => {
    const res = await asUser(alice, `insert into trip_settings (id, travelers, eur_rate) values ($1, 2, 25.235) returning *`, [alice])
    expect(res.rows[0].eur_rate).toBe('25.2350')
    await expect(asUser(alice, `insert into trip_settings (id) values ($1)`, [randomUUID()])).rejects.toThrow()
    await expect(asUser(bob, `insert into trip_settings (id) values ($1)`, [alice])).rejects.toThrow()
  })

  it('počet cestujících musí být 1–20 a kurz kladný', async () => {
    await expect(asUser(alice, `update trip_settings set travelers = 0 where id = $1`, [alice])).rejects.toThrow()
    await expect(asUser(alice, `update trip_settings set eur_rate = 0 where id = $1`, [alice])).rejects.toThrow()
  })
})

describe('poznámky a fotografie', () => {
  const noteId = randomUUID()
  const photoId = randomUUID()

  it('fotografii lze připojit jen k vlastní poznámce a do vlastní složky', async () => {
    await asUser(alice, `insert into notes (id, title, tags, links) values ($1, 'Restaurace', '{Restaurace}', '[{"url":"https://example.com"}]')`, [noteId])
    await asUser(alice, `insert into note_attachments (id, note_id, storage_path) values ($1, $2, $3)`, [
      photoId,
      noteId,
      `${alice}/${noteId}/${photoId}.jpg`,
    ])
    // Bob se nemůže připojit k Alicině poznámce
    await expect(
      asUser(bob, `insert into note_attachments (id, note_id, storage_path) values ($1, $2, $3)`, [
        randomUUID(),
        noteId,
        `${bob}/${noteId}/x.jpg`,
      ]),
    ).rejects.toThrow()
    // cesta mimo vlastní složku je zakázaná
    await expect(
      asUser(alice, `insert into note_attachments (id, note_id, storage_path) values ($1, $2, $3)`, [
        randomUUID(),
        noteId,
        `${bob}/${noteId}/x.jpg`,
      ]),
    ).rejects.toThrow()
  })

  it('smazání poznámky označí jako smazané i její fotografie', async () => {
    await asUser(alice, `update notes set deleted_at = now() where id = $1`, [noteId])
    const res = await asUser(alice, `select deleted_at, version from note_attachments where id = $1`, [photoId])
    expect(res.rows[0].deleted_at).not.toBeNull()
    expect(res.rows[0].version).toBe(2)
  })

  it('fyzické smazání poznámky smaže i řádky fotografií', async () => {
    await asUser(alice, `delete from notes where id = $1`, [noteId])
    const res = await asUser(alice, `select * from note_attachments where id = $1`, [photoId])
    expect(res.rowCount).toBe(0)
  })

  it('soubory v úložišti: každý jen ve své složce', async () => {
    await asUser(alice, `insert into storage.objects (bucket_id, name) values ('note-photos', $1)`, [`${alice}/n/p.jpg`])
    await expect(
      asUser(bob, `insert into storage.objects (bucket_id, name) values ('note-photos', $1)`, [`${alice}/n/evil.jpg`]),
    ).rejects.toThrow(/row-level security/)
    const bobSees = await asUser(bob, `select * from storage.objects`)
    expect(bobSees.rowCount).toBe(0)
    const aliceSees = await asUser(alice, `select name from storage.objects`)
    expect(aliceSees.rows.map((r) => r.name)).toEqual([`${alice}/n/p.jpg`])
    const bobDelete = await asUser(bob, `delete from storage.objects`)
    expect(bobDelete.rowCount).toBe(0)
  })
})
