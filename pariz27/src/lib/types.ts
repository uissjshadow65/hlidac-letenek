export type Currency = 'CZK' | 'EUR'

export type CategoryId = 'transport' | 'accommodation' | 'food' | 'activities' | 'sights' | 'other'

/** Pole, která má každý synchronizovaný záznam (shodně se serverem). */
export interface SyncedFields {
  id: string
  user_id: string
  /** Verze na serveru; 0 = záznam ještě nikdy nebyl na serveru. */
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Lokální metadata – na server se neposílají. */
export interface LocalMeta {
  /** 1 = obsahuje změny, které ještě nejsou na serveru. */
  _dirty: 0 | 1
  /** Počítadlo lokálních změn – chrání před ztrátou změny provedené během odesílání. */
  _rev: number
}

export interface TripSettingsData {
  name: string
  start_date: string | null
  end_date: string | null
  travelers: number
  eur_rate: number | null
}

export interface BudgetItemData {
  name: string
  /** Částka v haléřích (CZK) nebo centech (EUR). */
  amount_minor: number
  currency: Currency
  /** true = zadaná cena je za všechny cestující a dělí se jejich počtem. */
  split: boolean
  note: string
  category: CategoryId
  paid: boolean
}

export interface NoteLink {
  id: string
  url: string
  title: string | null
  image: string | null
  site: string | null
  fetched_at: string | null
}

export interface NoteData {
  title: string
  body: string
  tags: string[]
  links: NoteLink[]
  pinned: boolean
}

export interface AttachmentData {
  note_id: string
  storage_path: string
  mime_type: string
  width: number | null
  height: number | null
  size_bytes: number | null
}

export type TripSettings = TripSettingsData & SyncedFields & LocalMeta
export type BudgetItem = BudgetItemData & SyncedFields & LocalMeta
export type Note = NoteData & SyncedFields & LocalMeta
export type Attachment = AttachmentData & SyncedFields & LocalMeta

export type TableName = 'trip_settings' | 'budget_items' | 'notes' | 'note_attachments'

export interface TableRowMap {
  trip_settings: TripSettings
  budget_items: BudgetItem
  notes: Note
  note_attachments: Attachment
}

/** Řádek tak, jak ho vrací server (bez lokálních metadat). */
export type ServerRow<T extends TableName = TableName> = Omit<TableRowMap[T], keyof LocalMeta>

export interface PhotoBlob {
  id: string
  blob: Blob
  /** 1 = soubor už je nahraný v úložišti. */
  uploaded: 0 | 1
}

export interface ConflictRecord {
  key: string
  table: TableName
  id: string
  local: Record<string, unknown>
  server: Record<string, unknown> | null
  detected_at: string
}

export const DATA_FIELDS: { [K in TableName]: readonly string[] } = {
  trip_settings: ['name', 'start_date', 'end_date', 'travelers', 'eur_rate'],
  budget_items: ['name', 'amount_minor', 'currency', 'split', 'note', 'category', 'paid'],
  notes: ['title', 'body', 'tags', 'links', 'pinned'],
  note_attachments: ['note_id', 'storage_path', 'mime_type', 'width', 'height', 'size_bytes'],
}
