/**
 * Paměťový „server“ pro testy synchronizace. Chová se jako Supabase
 * s naší migrací: verze se zvyšuje při každé změně, updated_at nastavuje
 * server, data jsou oddělená podle uživatele.
 */
import type { TableName } from '../../src/lib/types'
import { NetworkError, type AnyServerRow, type RemoteAdapter } from '../../src/lib/sync/remote'

export class MemoryServer {
  tables: Record<TableName, Map<string, AnyServerRow>> = {
    trip_settings: new Map(),
    budget_items: new Map(),
    notes: new Map(),
    note_attachments: new Map(),
  }
  files = new Map<string, Blob>()
  private clock = Date.parse('2026-11-26T10:00:00Z')
  private subscribers = new Set<() => void>()

  tick(): string {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }

  notify() {
    for (const s of this.subscribers) s()
  }

  client(userId: string): MemoryRemote {
    return new MemoryRemote(this, userId)
  }

  subscribe(fn: () => void) {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }
}

export class MemoryRemote implements RemoteAdapter {
  online = true
  /** Simulace ztracené odpovědi: server změnu provede, ale klient se to nedozví. */
  loseNextResponse = false
  calls: string[] = []

  constructor(
    private server: MemoryServer,
    readonly userId: string,
  ) {}

  private guard(name: string) {
    this.calls.push(name)
    if (!this.online) throw new NetworkError()
  }

  private lose() {
    if (this.loseNextResponse) {
      this.loseNextResponse = false
      throw new NetworkError('odpověď se ztratila')
    }
  }

  async pull(table: TableName, since: string | null, offset: number, limit: number) {
    this.guard('pull')
    return [...this.server.tables[table].values()]
      .filter((r) => r.user_id === this.userId && (!since || r.updated_at >= since))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
      .slice(offset, offset + limit)
      .map((r) => structuredClone(r))
  }

  async insert(table: TableName, row: Record<string, unknown>) {
    this.guard('insert')
    const t = this.server.tables[table]
    if (row.user_id !== this.userId) throw new Error('RLS: cizí user_id')
    if (t.has(row.id as string)) return 'duplicate' as const
    if (table === 'note_attachments') {
      const note = this.server.tables.notes.get(row.note_id as string)
      if (!note || note.user_id !== this.userId) throw new Error('RLS: cizí poznámka')
    }
    const now = this.server.tick()
    const stored = { ...structuredClone(row), version: 1, created_at: now, updated_at: now } as AnyServerRow
    t.set(stored.id, stored)
    this.server.notify()
    this.lose()
    return structuredClone(stored)
  }

  async update(table: TableName, id: string, expectedVersion: number, patch: Record<string, unknown>) {
    this.guard('update')
    const t = this.server.tables[table]
    const cur = t.get(id)
    if (!cur || cur.user_id !== this.userId || cur.version !== expectedVersion) return null
    const now = this.server.tick()
    const next = { ...cur, ...structuredClone(patch), version: cur.version + 1, updated_at: now } as AnyServerRow
    t.set(id, next)
    // trigger: smazání poznámky smaže i její fotografie
    if (table === 'notes' && next.deleted_at && !cur.deleted_at) {
      for (const a of this.server.tables.note_attachments.values()) {
        if (a.note_id === id && !a.deleted_at) {
          this.server.tables.note_attachments.set(a.id, { ...a, deleted_at: next.deleted_at, version: a.version + 1, updated_at: this.server.tick() })
        }
      }
    }
    this.server.notify()
    this.lose()
    return structuredClone(next)
  }

  async fetchOne(table: TableName, id: string) {
    this.guard('fetchOne')
    const r = this.server.tables[table].get(id)
    return r && r.user_id === this.userId ? structuredClone(r) : null
  }

  async upload(path: string, blob: Blob) {
    this.guard('upload')
    if (!path.startsWith(`${this.userId}/`)) throw new Error('Storage RLS')
    this.server.files.set(path, blob)
  }

  async download(path: string) {
    this.guard('download')
    const b = this.server.files.get(path)
    if (!b || !path.startsWith(`${this.userId}/`)) throw new Error('Not found')
    return b
  }

  async remove(paths: string[]) {
    this.guard('remove')
    for (const p of paths) if (p.startsWith(`${this.userId}/`)) this.server.files.delete(p)
  }

  async listFolder(prefix: string) {
    this.guard('list')
    return [...this.server.files.keys()].filter((k) => k.startsWith(`${prefix}/`))
  }

  subscribe(fn: () => void) {
    return this.server.subscribe(fn)
  }
}
