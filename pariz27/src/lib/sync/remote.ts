import type { ServerRow, TableName } from '../types'

/** Chyba spojení – zařízení je offline nebo server není dostupný. Změny počkají. */
export class NetworkError extends Error {
  constructor(message = 'Bez připojení k internetu') {
    super(message)
    this.name = 'NetworkError'
  }
}

/** Přihlášení vypršelo nebo není platné. */
export class AuthError extends Error {
  constructor(message = 'Přihlášení vypršelo') {
    super(message)
    this.name = 'AuthError'
  }
}

export type AnyServerRow = ServerRow & Record<string, unknown>

/**
 * Rozhraní ke vzdálenému úložišti. V aplikaci ho implementuje Supabase,
 * v testech paměťová napodobenina se stejným chováním (verze, RLS).
 */
export interface RemoteAdapter {
  readonly userId: string
  /** Řádky změněné od daného času (včetně), seřazené podle updated_at. */
  pull(table: TableName, since: string | null, offset: number, limit: number): Promise<AnyServerRow[]>
  /** Vloží nový řádek. 'duplicate' = řádek s tímto id už existuje. */
  insert(table: TableName, row: Record<string, unknown>): Promise<AnyServerRow | 'duplicate'>
  /** Změní řádek jen pokud má na serveru očekávanou verzi. null = verze nesouhlasí. */
  update(table: TableName, id: string, expectedVersion: number, patch: Record<string, unknown>): Promise<AnyServerRow | null>
  fetchOne(table: TableName, id: string): Promise<AnyServerRow | null>
  upload(path: string, blob: Blob, contentType: string): Promise<void>
  download(path: string): Promise<Blob>
  remove(paths: string[]): Promise<void>
  listFolder(prefix: string): Promise<string[]>
  /** Upozornění na změny z jiného zařízení. Vrací funkci pro odhlášení odběru. */
  subscribe?(onChange: () => void): () => void
}
