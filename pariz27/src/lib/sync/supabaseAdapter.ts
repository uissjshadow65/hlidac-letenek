import type { SupabaseClient } from '@supabase/supabase-js'
import { PHOTO_BUCKET } from '../supabase'
import type { TableName } from '../types'
import { AuthError, NetworkError, type AnyServerRow, type RemoteAdapter } from './remote'

interface PgError {
  message: string
  code?: string
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Rozliší výpadek spojení, neplatné přihlášení a ostatní chyby. */
function fail(error: PgError, status?: number): never {
  const msg = error.message ?? ''
  if (isOffline() || status === 0 || /failed to fetch|networkerror|load failed|fetch failed|network request failed/i.test(msg)) {
    throw new NetworkError()
  }
  if (status === 401 || error.code === 'PGRST301' || error.code === 'PGRST303' || /jwt/i.test(msg)) {
    throw new AuthError()
  }
  throw new Error(msg || 'Neznámá chyba serveru')
}

function storageFail(error: { message: string; name?: string; statusCode?: string | number }): never {
  if (isOffline() || error.name === 'StorageUnknownError' || /fetch|network/i.test(error.message)) throw new NetworkError()
  if (String(error.statusCode) === '401' || String(error.statusCode) === '403') throw new AuthError()
  throw new Error(error.message)
}

export function createSupabaseAdapter(client: SupabaseClient, userId: string): RemoteAdapter {
  return {
    userId,

    async pull(table: TableName, since, offset, limit) {
      let q = client.from(table).select('*').order('updated_at', { ascending: true }).order('id', { ascending: true })
      if (since) q = q.gte('updated_at', since)
      const { data, error, status } = await q.range(offset, offset + limit - 1)
      if (error) fail(error, status)
      return (data ?? []) as AnyServerRow[]
    },

    async insert(table, row) {
      const { data, error, status } = await client.from(table).insert(row).select().single()
      if (error) {
        if (error.code === '23505') return 'duplicate'
        fail(error, status)
      }
      return data as AnyServerRow
    },

    async update(table, id, expectedVersion, patch) {
      const { data, error, status } = await client.from(table).update(patch).eq('id', id).eq('version', expectedVersion).select()
      if (error) fail(error, status)
      return ((data ?? [])[0] as AnyServerRow | undefined) ?? null
    },

    async fetchOne(table, id) {
      const { data, error, status } = await client.from(table).select('*').eq('id', id).maybeSingle()
      if (error) fail(error, status)
      return (data as AnyServerRow | null) ?? null
    },

    async upload(path, blob, contentType) {
      const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType, upsert: true, cacheControl: '31536000' })
      if (error) storageFail(error)
    },

    async download(path) {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).download(path)
      if (error) storageFail(error)
      return data
    },

    async remove(paths) {
      if (!paths.length) return
      const { error } = await client.storage.from(PHOTO_BUCKET).remove(paths)
      if (error) storageFail(error)
    },

    async listFolder(prefix) {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).list(prefix, { limit: 1000 })
      if (error) storageFail(error)
      return (data ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`)
    },

    subscribe(onChange) {
      const channel = client.channel(`p27-${userId}`)
      for (const table of ['trip_settings', 'budget_items', 'notes', 'note_attachments'] as const) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => onChange())
      }
      channel.subscribe((status) => {
        // po (znovu)připojení stáhneme, co jsme mezitím mohli zmeškat
        if (status === 'SUBSCRIBED') onChange()
      })
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
