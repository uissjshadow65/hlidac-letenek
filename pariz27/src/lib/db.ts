import Dexie, { type Table } from 'dexie'
import type { Attachment, BudgetItem, ConflictRecord, Note, PhotoBlob, TableName, TripSettings } from './types'

export interface MetaRow {
  key: string
  value: unknown
}

/**
 * Lokální databáze v zařízení (IndexedDB). Aplikace čte vždy odsud,
 * takže funguje okamžitě a i bez internetu. Synchronizace ji udržuje
 * ve shodě se Supabase.
 */
export class P27DB extends Dexie {
  trip_settings!: Table<TripSettings, string>
  budget_items!: Table<BudgetItem, string>
  notes!: Table<Note, string>
  note_attachments!: Table<Attachment, string>
  photo_blobs!: Table<PhotoBlob, string>
  conflicts!: Table<ConflictRecord, string>
  meta!: Table<MetaRow, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      trip_settings: 'id, _dirty',
      budget_items: 'id, _dirty, category',
      notes: 'id, _dirty, updated_at',
      note_attachments: 'id, _dirty, note_id',
      photo_blobs: 'id',
      conflicts: 'key',
      meta: 'key',
    })
  }

  table_(name: TableName): Table<TripSettings | BudgetItem | Note | Attachment, string> {
    return this.table(name)
  }
}

export const SYNC_TABLES: readonly TableName[] = ['trip_settings', 'budget_items', 'notes', 'note_attachments']

export function dbNameFor(userId: string | null): string {
  return userId ? `pariz27_${userId}` : 'pariz27_local'
}

export async function countPending(db: P27DB): Promise<number> {
  const counts = await Promise.all(SYNC_TABLES.map((t) => db.table(t).where('_dirty').equals(1).count()))
  return counts.reduce((a, b) => a + b, 0)
}
