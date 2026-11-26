import type { P27DB } from '../db'
import { isCategoryId } from '../categories'
import type { Attachment, BudgetItem, Note, TripSettings } from '../types'

export const BACKUP_FORMAT = 1

export interface BackupFile {
  app: 'pariz27'
  format: number
  exported_at: string
  trip_settings: Record<string, unknown> | null
  budget_items: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  note_attachments: Record<string, unknown>[]
  photos: { id: string; mime_type: string; data: string }[]
}

const strip = <T extends object>(r: T) => {
  const { _dirty, _rev, ...rest } = r as T & { _dirty?: unknown; _rev?: unknown }
  void _dirty
  void _rev
  return rest as Record<string, unknown>
}

async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Všechna data aplikace v jednom JSON souboru (včetně fotografií uložených v zařízení). */
export async function createBackup(db: P27DB, includePhotos = true): Promise<BackupFile> {
  const live = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at)
  const [settings, items, notes, atts] = await Promise.all([
    db.trip_settings.toArray(),
    db.budget_items.toArray(),
    db.notes.toArray(),
    db.note_attachments.toArray(),
  ])
  const liveAtts = live(atts)
  const photos: BackupFile['photos'] = []
  if (includePhotos) {
    for (const a of liveAtts) {
      const pb = await db.photo_blobs.get(a.id)
      if (pb) photos.push({ id: a.id, mime_type: a.mime_type, data: await blobToBase64(pb.blob) })
    }
  }
  return {
    app: 'pariz27',
    format: BACKUP_FORMAT,
    exported_at: new Date().toISOString(),
    trip_settings: settings[0] ? strip(settings[0]) : null,
    budget_items: live(items).map(strip),
    notes: live(notes).map(strip),
    note_attachments: liveAtts.map(strip),
    photos,
  }
}

export interface RestoreResult {
  items: number
  notes: number
  photos: number
}

const str = (v: unknown, max: number, def = '') => (typeof v === 'string' ? v.slice(0, max) : def)
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

/**
 * Obnoví data ze zálohy. Nic nemaže – položky se stejným id přepíše verzí
 * ze zálohy, ostatní doplní. Vše se pak odešle na server.
 */
export async function restoreBackup(db: P27DB, userId: string, raw: unknown): Promise<RestoreResult> {
  const b = raw as Partial<BackupFile>
  if (!b || b.app !== 'pariz27' || typeof b.format !== 'number') throw new Error('Soubor není záloha aplikace Paříž 27.')
  if (b.format > BACKUP_FORMAT) throw new Error('Záloha pochází z novější verze aplikace. Nejdříve aplikaci aktualizujte.')
  const now = new Date().toISOString()
  const result: RestoreResult = { items: 0, notes: 0, photos: 0 }

  await db.transaction('rw', [db.trip_settings, db.budget_items, db.notes, db.note_attachments, db.photo_blobs], async () => {
    const meta = async <T extends { version: number; _rev: number }>(table: { get(id: string): Promise<T | undefined> }, id: string) => {
      const cur = await table.get(id)
      return { version: cur?.version ?? 0, _rev: (cur?._rev ?? 0) + 1, _dirty: 1 as const }
    }
    const base = (r: Record<string, unknown>) => ({
      user_id: userId,
      created_at: str(r.created_at, 40, now),
      updated_at: now,
      deleted_at: null,
    })

    if (b.trip_settings) {
      const r = b.trip_settings
      const travelers = Number(r.travelers)
      const rate = r.eur_rate == null ? null : Number(r.eur_rate)
      const row: TripSettings = {
        id: userId,
        ...base(r),
        ...(await meta(db.trip_settings, userId)),
        name: str(r.name, 120, 'Paříž 27') || 'Paříž 27',
        start_date: typeof r.start_date === 'string' ? r.start_date.slice(0, 10) : null,
        end_date: typeof r.end_date === 'string' ? r.end_date.slice(0, 10) : null,
        travelers: Number.isInteger(travelers) && travelers >= 1 && travelers <= 20 ? travelers : 2,
        eur_rate: rate != null && rate > 0 ? rate : null,
      }
      await db.trip_settings.put(row)
    }

    for (const r of b.budget_items ?? []) {
      if (!isId(r.id)) continue
      const amount = Number(r.amount_minor)
      if (!Number.isSafeInteger(amount) || amount < 0) continue
      const row: BudgetItem = {
        id: r.id,
        ...base(r),
        ...(await meta(db.budget_items, r.id)),
        name: str(r.name, 200, 'Položka') || 'Položka',
        amount_minor: amount,
        currency: r.currency === 'EUR' ? 'EUR' : 'CZK',
        split: r.split === true,
        note: str(r.note, 5000),
        category: isCategoryId(r.category) ? r.category : 'other',
        paid: r.paid === true,
      }
      await db.budget_items.put(row)
      result.items++
    }

    for (const r of b.notes ?? []) {
      if (!isId(r.id)) continue
      const row: Note = {
        id: r.id,
        ...base(r),
        ...(await meta(db.notes, r.id)),
        title: str(r.title, 300),
        body: str(r.body, 100000),
        tags: Array.isArray(r.tags) ? r.tags.filter((x): x is string => typeof x === 'string').slice(0, 30) : [],
        links: Array.isArray(r.links) ? (r.links as Note['links']).filter((l) => l && typeof l.url === 'string') : [],
        pinned: r.pinned === true,
      }
      await db.notes.put(row)
      result.notes++
    }

    const photoData = new Map((b.photos ?? []).map((p) => [p.id, p]))
    for (const r of b.note_attachments ?? []) {
      if (!isId(r.id) || !isId(r.note_id)) continue
      const p = photoData.get(r.id)
      const existing = await db.photo_blobs.get(r.id)
      if (!p && !existing) continue // bez souboru fotografii obnovit nelze
      const mime = str(r.mime_type, 50, 'image/jpeg')
      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
      const cur = await db.note_attachments.get(r.id)
      const row: Attachment = {
        id: r.id,
        ...base(r),
        ...(await meta(db.note_attachments, r.id)),
        note_id: r.note_id,
        storage_path: `${userId}/${r.note_id}/${r.id}.${ext}`,
        mime_type: mime,
        width: typeof r.width === 'number' ? r.width : null,
        height: typeof r.height === 'number' ? r.height : null,
        size_bytes: typeof r.size_bytes === 'number' ? r.size_bytes : null,
      }
      if (cur && cur.storage_path === row.storage_path && cur.version > 0) {
        // fotografie se nemění – stačí ji mít v zařízení
        await db.note_attachments.put({ ...cur, deleted_at: null })
      } else {
        await db.note_attachments.put({ ...row, version: 0 })
      }
      if (p && !existing) await db.photo_blobs.put({ id: r.id, blob: base64ToBlob(p.data, mime), uploaded: 0 })
      result.photos++
    }
  })
  return result
}
