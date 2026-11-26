/**
 * SYNCHRONIZACE
 * =============
 * Aplikace pracuje vždy s lokální databází (IndexedDB). Každá lokální změna
 * označí záznam jako „dirty“. Synchronizace pak:
 *
 *  1. ODESLÁNÍ – pro každý změněný záznam pošle na server změnu podmíněnou
 *     verzí, kterou zařízení naposledy vidělo. Když mezitím záznam změnilo
 *     jiné zařízení, server změnu nepřijme a vznikne KONFLIKT – nic se
 *     nepřepíše a uživatel sám rozhodne, kterou verzi ponechat.
 *  2. STAŽENÍ – stáhne záznamy změněné od posledního stažení. Záznamy
 *     s neodeslanými lokálními změnami se nepřepisují.
 *
 * Smazání je „tombstone“ (deleted_at), takže se dostane i na druhé zařízení.
 */
import { countPending, SYNC_TABLES, type P27DB } from '../db'
import { stableStringify } from '../ids'
import { DATA_FIELDS, type Attachment, type ConflictRecord, type TableName } from '../types'
import { AuthError, NetworkError, type AnyServerRow, type RemoteAdapter } from './remote'

export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  phase: SyncPhase
  lastSyncAt: string | null
  error: string | null
}

export type SyncEvent =
  | { type: 'state'; state: SyncState }
  | { type: 'rate-changed'; from: number | null; to: number | null }
  | { type: 'conflict'; count: number }

type LocalRow = Record<string, unknown> & {
  id: string
  version: number
  _dirty: 0 | 1
  _rev: number
  deleted_at: string | null
}

/** Překryv při stahování – chrání před záznamy, které se na serveru potvrdily o chvilku později. */
const PULL_OVERLAP_MS = 60_000
const PAGE = 500

export interface EngineOptions {
  /** Je zařízení online? (v prohlížeči navigator.onLine) */
  isOnline?: () => boolean
  now?: () => Date
}

export class SyncEngine {
  private running: Promise<void> | null = null
  private again = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<(e: SyncEvent) => void>()
  private cleanup: (() => void)[] = []
  private isOnline: () => boolean
  private now: () => Date
  state: SyncState = { phase: 'idle', lastSyncAt: null, error: null }

  constructor(
    readonly db: P27DB,
    readonly remote: RemoteAdapter,
    opts: EngineOptions = {},
  ) {
    this.isOnline = opts.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine))
    this.now = opts.now ?? (() => new Date())
  }

  // ---------------------------------------------------------------- události

  on(fn: (e: SyncEvent) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(e: SyncEvent) {
    for (const fn of this.listeners) fn(e)
  }

  private setState(p: Partial<SyncState>) {
    this.state = { ...this.state, ...p }
    this.emit({ type: 'state', state: this.state })
  }

  // ---------------------------------------------------------- životní cyklus

  /** Spustí automatickou synchronizaci (v prohlížeči). */
  start() {
    const kick = () => this.schedule(0)
    const onVisible = () => {
      if (document.visibilityState === 'visible') kick()
    }
    const onOffline = () => this.setState({ phase: 'offline' })
    window.addEventListener('online', kick)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', kick)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') this.schedule(0)
    }, 60_000)
    const unsub = this.remote.subscribe?.(() => this.schedule(300))
    this.cleanup.push(
      () => window.removeEventListener('online', kick),
      () => window.removeEventListener('offline', onOffline),
      () => document.removeEventListener('visibilitychange', onVisible),
      () => window.removeEventListener('focus', kick),
      () => clearInterval(interval),
      () => unsub?.(),
    )
    if (!this.isOnline()) this.setState({ phase: 'offline' })
    this.schedule(0)
  }

  stop() {
    for (const c of this.cleanup.splice(0)) c()
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.listeners.clear()
  }

  /** Naplánuje synchronizaci (více změn těsně po sobě se odešle najednou). */
  schedule(delayMs = 400) {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.sync()
    }, delayMs)
  }

  // ------------------------------------------------------------ synchronizace

  sync(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = (async () => {
      do {
        this.again = false
        if (!this.isOnline()) {
          this.setState({ phase: 'offline' })
          return
        }
        this.setState({ phase: 'syncing', error: null })
        try {
          await this.pushAll()
          const pulled = await this.pullAll()
          // stažení mohlo uvolnit čekající záznamy (např. po vyřešení konfliktu)
          if (pulled > 0 && (await countPending(this.db)) > 0) await this.pushAll()
          await this.prefetchPhotos()
          this.setState({ phase: 'idle', lastSyncAt: this.now().toISOString(), error: null })
        } catch (e) {
          if (e instanceof NetworkError) this.setState({ phase: 'offline', error: null })
          else if (e instanceof AuthError) this.setState({ phase: 'error', error: e.message })
          else this.setState({ phase: 'error', error: e instanceof Error ? e.message : String(e) })
          return
        }
      } while (this.again)
    })().finally(() => {
      this.running = null
    })
    return this.running
  }

  // ------------------------------------------------------------------ odeslání

  private async pushAll() {
    const conflictKeys = new Set((await this.db.conflicts.toArray()).map((c) => c.key))
    for (const table of SYNC_TABLES) {
      const dirty = (await this.db.table(table).where('_dirty').equals(1).toArray()) as LocalRow[]
      for (const rec of dirty) {
        if (conflictKeys.has(`${table}:${rec.id}`)) continue
        await this.pushOne(table, rec)
      }
    }
  }

  private payload(table: TableName, rec: LocalRow): Record<string, unknown> {
    const out: Record<string, unknown> = { deleted_at: rec.deleted_at ?? null }
    for (const f of DATA_FIELDS[table]) out[f] = rec[f] ?? null
    return out
  }

  private sameContent(table: TableName, a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    for (const f of [...DATA_FIELDS[table], 'deleted_at']) {
      const x = f === 'deleted_at' ? !!a[f] : a[f]
      const y = f === 'deleted_at' ? !!b[f] : b[f]
      if (stableStringify(x ?? null) !== stableStringify(y ?? null)) return false
    }
    return true
  }

  private async pushOne(table: TableName, rec: LocalRow) {
    const body = this.payload(table, rec)

    if (rec.version === 0) {
      if (rec.deleted_at) {
        // na serveru nikdy nebyl – stačí smazat lokálně
        if (table === 'note_attachments') await this.remote.remove([String(rec.storage_path)]).catch(() => {})
        await this.removeLocal(table, rec.id, rec._rev)
        return
      }
      if (table === 'note_attachments') {
        const ok = await this.ensureUploaded(rec as unknown as Attachment)
        if (!ok) return
      }
      const res = await this.remote.insert(table, { id: rec.id, user_id: this.remote.userId, ...body })
      if (res !== 'duplicate') return this.markSynced(table, rec, res)
      const server = await this.remote.fetchOne(table, rec.id)
      return this.handleMismatch(table, rec, body, server)
    }

    if (rec.deleted_at && table === 'note_attachments') {
      await this.remote.remove([String(rec.storage_path)])
    }
    if (rec.deleted_at && table === 'notes') {
      // odstraní všechny fotografie poznámky z úložiště (i ty, které toto zařízení nezná)
      const files = await this.remote.listFolder(`${this.remote.userId}/${rec.id}`)
      if (files.length) await this.remote.remove(files)
    }
    const res = await this.remote.update(table, rec.id, rec.version, body)
    if (res) return this.markSynced(table, rec, res)
    const server = await this.remote.fetchOne(table, rec.id)
    return this.handleMismatch(table, rec, body, server)
  }

  private async ensureUploaded(att: Attachment): Promise<boolean> {
    const pb = await this.db.photo_blobs.get(att.id)
    if (!pb) {
      // fotografie se v zařízení nenašla – záznam bez souboru nemá smysl
      await this.db.note_attachments.delete(att.id)
      return false
    }
    if (!pb.uploaded) {
      await this.remote.upload(att.storage_path, pb.blob, att.mime_type)
      await this.db.photo_blobs.update(att.id, { uploaded: 1 })
    }
    return true
  }

  /** Server změnu nepřijal (verze nesouhlasí) – rozhodne, co dál. */
  private async handleMismatch(table: TableName, rec: LocalRow, body: Record<string, unknown>, server: AnyServerRow | null) {
    if (!server) {
      if (rec.deleted_at) return this.removeLocal(table, rec.id, rec._rev)
      // řádek na serveru zmizel – vložíme ho znovu
      await this.db.table(table).update(rec.id, { version: 0 })
      this.again = true
      return
    }
    if (server.deleted_at && rec.deleted_at) return this.removeLocal(table, rec.id, rec._rev)
    if (this.sameContent(table, body, server)) return this.markSynced(table, rec, server)

    if (table === 'note_attachments') {
      // fotografie se nemění, jen mažou – vyřešíme automaticky
      if (server.deleted_at) return this.removeLocal(table, rec.id, null)
      await this.db.note_attachments.update(rec.id, { version: server.version })
      this.again = true
      return
    }

    const conflict: ConflictRecord = {
      key: `${table}:${rec.id}`,
      table,
      id: rec.id,
      local: body,
      server: server as Record<string, unknown>,
      detected_at: this.now().toISOString(),
    }
    await this.db.conflicts.put(conflict)
    this.emit({ type: 'conflict', count: await this.db.conflicts.count() })
  }

  private async markSynced(table: TableName, sent: LocalRow, row: AnyServerRow) {
    const t = this.db.table(table)
    await this.db.transaction('rw', t, this.db.photo_blobs, async () => {
      const cur = (await t.get(sent.id)) as LocalRow | undefined
      if (!cur) return
      if (cur._rev === sent._rev) {
        if (row.deleted_at) {
          await t.delete(sent.id)
          if (table === 'note_attachments') await this.db.photo_blobs.delete(sent.id)
        } else {
          await t.put({ ...normalizeRow(table, row), _dirty: 0, _rev: cur._rev })
        }
      } else {
        // během odesílání přibyla další lokální změna – ponecháme ji k odeslání
        await t.update(sent.id, { version: row.version })
      }
    })
  }

  private async removeLocal(table: TableName, id: string, rev: number | null) {
    const t = this.db.table(table)
    await this.db.transaction('rw', t, this.db.photo_blobs, async () => {
      const cur = (await t.get(id)) as LocalRow | undefined
      if (cur && rev != null && cur._rev !== rev) return
      await t.delete(id)
      if (table === 'note_attachments') await this.db.photo_blobs.delete(id)
    })
  }

  // ------------------------------------------------------------------ stažení

  private async pullAll(): Promise<number> {
    let total = 0
    for (const table of SYNC_TABLES) total += await this.pullTable(table)
    return total
  }

  private async pullTable(table: TableName): Promise<number> {
    const key = `cursor:${table}`
    const cursor = (await this.db.meta.get(key))?.value as string | undefined
    const since = cursor ? new Date(parseServerTime(cursor) - PULL_OVERLAP_MS).toISOString() : null
    let offset = 0
    let maxUpdated = cursor ?? null
    let applied = 0
    for (;;) {
      const rows = await this.remote.pull(table, since, offset, PAGE)
      for (const row of rows) {
        if (await this.applyServerRow(table, row)) applied++
        if (!maxUpdated || parseServerTime(row.updated_at) > parseServerTime(maxUpdated)) maxUpdated = row.updated_at
      }
      if (rows.length < PAGE) break
      offset += rows.length
    }
    if (maxUpdated && maxUpdated !== cursor) await this.db.meta.put({ key, value: maxUpdated })
    return applied
  }

  /** Použije řádek ze serveru. Vrací true, pokud se lokální data změnila. */
  private async applyServerRow(table: TableName, row: AnyServerRow): Promise<boolean> {
    const t = this.db.table(table)
    let rateChange: { from: number | null; to: number | null } | null = null
    const changed = await this.db.transaction('rw', t, this.db.photo_blobs, this.db.conflicts, async () => {
      const cur = (await t.get(row.id)) as LocalRow | undefined
      if (cur && cur._dirty) return false // neodeslané lokální změny mají přednost; případný konflikt odhalí odeslání
      if (row.deleted_at) {
        if (!cur) return false
        await t.delete(row.id)
        if (table === 'note_attachments') await this.db.photo_blobs.delete(row.id)
        return true
      }
      if (cur && cur.version >= row.version) return false
      const norm = normalizeRow(table, row)
      if (table === 'trip_settings' && cur && cur.eur_rate !== norm.eur_rate) {
        rateChange = { from: (cur.eur_rate as number | null) ?? null, to: (norm.eur_rate as number | null) ?? null }
      }
      await t.put({ ...norm, _dirty: 0, _rev: cur?._rev ?? 0 })
      return true
    })
    if (rateChange) this.emit({ type: 'rate-changed', ...(rateChange as { from: number | null; to: number | null }) })
    return changed
  }

  /** Stáhne do zařízení fotografie, které tu ještě nejsou (aby byly k dispozici i offline). */
  private async prefetchPhotos() {
    const atts = await this.db.note_attachments.toArray()
    for (const a of atts) {
      if (a.deleted_at || a.version === 0) continue
      if (await this.db.photo_blobs.get(a.id)) continue
      try {
        const blob = await this.remote.download(a.storage_path)
        if (await this.db.note_attachments.get(a.id)) await this.db.photo_blobs.put({ id: a.id, blob, uploaded: 1 })
      } catch (e) {
        if (e instanceof NetworkError) throw e
        // soubor může chybět (např. smazán z jiného zařízení) – zkusí se příště
      }
    }
  }

  // ------------------------------------------------------------------ konflikty

  /** Ponechá verzi z tohoto zařízení a přepíše jí verzi na serveru. */
  async resolveKeepLocal(key: string) {
    const c = await this.db.conflicts.get(key)
    if (!c) return
    const t = this.db.table(c.table)
    await this.db.transaction('rw', t, this.db.conflicts, async () => {
      const cur = (await t.get(c.id)) as LocalRow | undefined
      const serverVersion = c.server ? Number(c.server.version) : 0
      if (cur) await t.put({ ...cur, version: serverVersion, _dirty: 1, _rev: cur._rev + 1 })
      await this.db.conflicts.delete(key)
    })
    this.schedule(0)
  }

  /** Ponechá verzi ze serveru (z druhého zařízení) a zahodí lokální změnu. */
  async resolveKeepServer(key: string) {
    const c = await this.db.conflicts.get(key)
    if (!c) return
    const t = this.db.table(c.table)
    await this.db.transaction('rw', t, this.db.conflicts, async () => {
      const cur = (await t.get(c.id)) as LocalRow | undefined
      if (!c.server || c.server.deleted_at) await t.delete(c.id)
      else await t.put({ ...normalizeRow(c.table, c.server as AnyServerRow), _dirty: 0, _rev: (cur?._rev ?? 0) + 1 })
      await this.db.conflicts.delete(key)
    })
    this.schedule(0)
  }
}

/**
 * Čas ze serveru (např. „2026-11-26T20:33:49.123456+00:00“) na milisekundy.
 * Mikrosekundy zkrátíme – některé verze Safari je neumí přečíst.
 */
export function parseServerTime(v: string): number {
  return new Date(v.replace(/(\.\d{3})\d+/, '$1').replace(' ', 'T')).getTime()
}

function isoTime(v: unknown): unknown {
  if (typeof v !== 'string') return v
  const t = parseServerTime(v)
  return Number.isFinite(t) ? new Date(t).toISOString() : v
}

/** Sjednotí typy z PostgREST (numeric/bigint mohou přijít jako text, časy s mikrosekundami). */
export function normalizeRow(table: TableName, row: Record<string, unknown>): Record<string, unknown> & { id: string } {
  const r = { ...row } as Record<string, unknown> & { id: string }
  for (const k of ['created_at', 'updated_at', 'deleted_at']) if (r[k] != null) r[k] = isoTime(r[k])
  if (table === 'budget_items') r.amount_minor = Number(r.amount_minor)
  if (table === 'trip_settings') {
    r.eur_rate = r.eur_rate == null ? null : Number(r.eur_rate)
    r.travelers = Number(r.travelers)
  }
  if (table === 'notes') {
    r.tags = Array.isArray(r.tags) ? r.tags : []
    r.links = Array.isArray(r.links) ? r.links : []
  }
  r.version = Number(r.version)
  return r
}
