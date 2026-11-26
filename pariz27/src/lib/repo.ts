/**
 * Lokální změny dat. Každá změna se okamžitě uloží do zařízení (IndexedDB),
 * označí se k odeslání a požádá synchronizaci o odeslání na server.
 */
import type { Table } from 'dexie'
import type { P27DB } from './db'
import { uuid } from './ids'
import type {
  Attachment,
  BudgetItem,
  BudgetItemData,
  Note,
  NoteData,
  TripSettings,
  TripSettingsData,
} from './types'

export const DEFAULT_SETTINGS: TripSettingsData = {
  name: 'Paříž 27',
  start_date: null,
  end_date: null,
  travelers: 2,
  eur_rate: null,
}

export class Repo {
  constructor(
    readonly db: P27DB,
    readonly userId: string,
    private onChange: () => void = () => {},
    /** Režim bez synchronizace – mazání je rovnou trvalé. */
    readonly localOnly = false,
  ) {}

  setOnChange(fn: () => void) {
    this.onChange = fn
  }

  private now() {
    return new Date().toISOString()
  }

  private base(id: string) {
    const now = this.now()
    return { id, user_id: this.userId, version: 0, created_at: now, updated_at: now, deleted_at: null, _dirty: 1 as const, _rev: 1 }
  }

  private async patch<T extends { _rev: number }>(table: Table<T, string>, id: string, patch: Partial<NoInfer<T>>) {
    await this.db.transaction('rw', table, async () => {
      const cur = await table.get(id)
      if (!cur) throw new Error('Záznam nebyl nalezen')
      await table.put({ ...cur, ...patch, _dirty: 1, _rev: cur._rev + 1, updated_at: this.now() })
    })
    this.onChange()
  }

  // ------------------------------------------------------------ nastavení

  async saveSettings(data: Partial<TripSettingsData>) {
    const id = this.userId
    await this.db.transaction('rw', this.db.trip_settings, async () => {
      const cur = await this.db.trip_settings.get(id)
      if (cur) {
        await this.db.trip_settings.put({ ...cur, ...data, _dirty: 1, _rev: cur._rev + 1, updated_at: this.now() })
      } else {
        const row: TripSettings = { ...DEFAULT_SETTINGS, ...data, ...this.base(id) }
        await this.db.trip_settings.put(row)
      }
    })
    this.onChange()
  }

  // ------------------------------------------------------------ rozpočet

  async createItem(data: BudgetItemData): Promise<string> {
    const id = uuid()
    const row: BudgetItem = { ...data, ...this.base(id) }
    await this.db.budget_items.add(row)
    this.onChange()
    return id
  }

  updateItem(id: string, data: Partial<BudgetItemData>) {
    return this.patch(this.db.budget_items, id, data)
  }

  async togglePaid(id: string) {
    const cur = await this.db.budget_items.get(id)
    if (cur) await this.updateItem(id, { paid: !cur.paid })
  }

  async deleteItem(id: string) {
    if (this.localOnly) {
      await this.db.budget_items.delete(id)
      this.onChange()
      return
    }
    return this.patch(this.db.budget_items, id, { deleted_at: this.now() })
  }

  // ------------------------------------------------------------ poznámky

  async createNote(data: Partial<NoteData> = {}): Promise<string> {
    const id = uuid()
    const row: Note = { title: '', body: '', tags: [], links: [], pinned: false, ...data, ...this.base(id) }
    await this.db.notes.add(row)
    this.onChange()
    return id
  }

  updateNote(id: string, data: Partial<NoteData>) {
    return this.patch(this.db.notes, id, data)
  }

  async deleteNote(id: string) {
    const now = this.now()
    await this.db.transaction('rw', this.db.notes, this.db.note_attachments, this.db.photo_blobs, async () => {
      const note = await this.db.notes.get(id)
      if (!note) return
      if (this.localOnly) {
        const ids = await this.db.note_attachments.where('note_id').equals(id).primaryKeys()
        await this.db.note_attachments.bulkDelete(ids)
        await this.db.photo_blobs.bulkDelete(ids)
        await this.db.notes.delete(id)
        return
      }
      if (note.version === 0) await this.db.notes.delete(id)
      else await this.db.notes.put({ ...note, deleted_at: now, _dirty: 1, _rev: note._rev + 1, updated_at: now })
      const atts = await this.db.note_attachments.where('note_id').equals(id).toArray()
      for (const a of atts) {
        if (a.version === 0 && note.version === 0) {
          await this.db.note_attachments.delete(a.id)
          await this.db.photo_blobs.delete(a.id)
        } else {
          await this.db.note_attachments.put({ ...a, deleted_at: now, _dirty: 1, _rev: a._rev + 1 })
        }
      }
    })
    this.onChange()
  }

  async addPhoto(noteId: string, blob: Blob, meta: { width: number | null; height: number | null }): Promise<string> {
    const id = uuid()
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    const row: Attachment = {
      note_id: noteId,
      storage_path: `${this.userId}/${noteId}/${id}.${ext}`,
      mime_type: blob.type || 'image/jpeg',
      width: meta.width,
      height: meta.height,
      size_bytes: blob.size,
      ...this.base(id),
    }
    await this.db.transaction('rw', this.db.note_attachments, this.db.photo_blobs, this.db.notes, async () => {
      await this.db.photo_blobs.put({ id, blob, uploaded: 0 })
      await this.db.note_attachments.add(row)
      // poznámka se posune nahoru v seznamu „naposledy upravené“
      const note = await this.db.notes.get(noteId)
      if (note) await this.db.notes.update(noteId, { updated_at: this.now() })
    })
    this.onChange()
    return id
  }

  async removePhoto(id: string) {
    const cur = await this.db.note_attachments.get(id)
    if (!cur) return
    if (this.localOnly) {
      await this.db.transaction('rw', this.db.note_attachments, this.db.photo_blobs, async () => {
        await this.db.note_attachments.delete(id)
        await this.db.photo_blobs.delete(id)
      })
    } else if (cur.version === 0) {
      // ještě nebyla nahraná – odstraní ji synchronizace (včetně případně nahraného souboru)
      await this.db.note_attachments.put({ ...cur, deleted_at: this.now(), _dirty: 1, _rev: cur._rev + 1 })
    } else {
      await this.patch(this.db.note_attachments, id, { deleted_at: this.now() })
      return
    }
    this.onChange()
  }
}
