import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { countPending, dbNameFor, P27DB } from '../lib/db'
import { DEFAULT_SETTINGS, Repo } from '../lib/repo'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { SyncEngine, type SyncState } from '../lib/sync/engine'
import { createSupabaseAdapter } from '../lib/sync/supabaseAdapter'
import { formatRate } from '../lib/money'
import type { Attachment, BudgetItem, ConflictRecord, Note, TripSettingsData } from '../lib/types'
import { useToast } from './toast'

// ------------------------------------------------------------------ přihlášení

export type AuthMode =
  | { kind: 'loading' }
  | { kind: 'setup' } // Supabase není nastavena
  | { kind: 'signed-out' }
  | { kind: 'recovery' } // uživatel přišel z odkazu pro obnovu hesla
  | { kind: 'ready'; userId: string; email: string | null; local: boolean }

interface AuthApi {
  mode: AuthMode
  enterLocalMode: () => void
  signOut: () => Promise<void>
  finishRecovery: () => void
}

const AuthCtx = createContext<AuthApi | null>(null)

const LAST_USER_KEY = 'pariz27-last-user'
const LOCAL_MODE_KEY = 'pariz27-local-mode'
const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000000'

function readLastUser(): { id: string; email: string | null } | null {
  try {
    const v = localStorage.getItem(LAST_USER_KEY)
    return v ? (JSON.parse(v) as { id: string; email: string | null }) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>({ kind: 'loading' })

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      let local = false
      try {
        local = localStorage.getItem(LOCAL_MODE_KEY) === '1'
      } catch {
        /* soukromé okno */
      }
      setMode(local ? { kind: 'ready', userId: LOCAL_USER_ID, email: null, local: true } : { kind: 'setup' })
      return
    }
    let alive = true
    const ready = (id: string, email: string | null) => {
      try {
        localStorage.setItem(LAST_USER_KEY, JSON.stringify({ id, email }))
      } catch {
        /* ignore */
      }
      setMode((m) =>
        m.kind === 'recovery' || (m.kind === 'ready' && m.userId === id) ? m : { kind: 'ready', userId: id, email, local: false },
      )
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      const s = data.session
      if (s) return ready(s.user.id, s.user.email ?? null)
      // offline se uložené přihlášení nemusí podařit obnovit – data v zařízení ale zpřístupníme
      const last = readLastUser()
      if (last && !navigator.onLine) return ready(last.id, last.email)
      setMode({ kind: 'signed-out' })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') return setMode({ kind: 'recovery' })
      if (event === 'SIGNED_OUT') return setMode({ kind: 'signed-out' })
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        if (event !== 'TOKEN_REFRESHED') ready(session.user.id, session.user.email ?? null)
      }
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const enterLocalMode = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_MODE_KEY, '1')
    } catch {
      /* ignore */
    }
    setMode({ kind: 'ready', userId: LOCAL_USER_ID, email: null, local: true })
  }, [])

  const signOut = useCallback(async () => {
    const m = mode
    if (m.kind === 'ready' && m.local) {
      try {
        localStorage.removeItem(LOCAL_MODE_KEY)
      } catch {
        /* ignore */
      }
      setMode({ kind: 'setup' })
      return
    }
    try {
      localStorage.removeItem(LAST_USER_KEY)
    } catch {
      /* ignore */
    }
    await supabase?.auth.signOut().catch(() => {})
    setMode({ kind: 'signed-out' })
    if (m.kind === 'ready') {
      // data tohoto účtu odstraníme ze zařízení (jsou bezpečně na serveru);
      // až po zavření databáze obrazovkou, která ji používala
      setTimeout(() => void new P27DB(dbNameFor(m.userId)).delete().catch(() => {}), 300)
    }
  }, [mode])

  const finishRecovery = useCallback(() => {
    void supabase?.auth.getSession().then(({ data }) => {
      const s = data.session
      setMode(s ? { kind: 'ready', userId: s.user.id, email: s.user.email ?? null, local: false } : { kind: 'signed-out' })
    })
  }, [])

  const api = useMemo(() => ({ mode, enterLocalMode, signOut, finishRecovery }), [mode, enterLocalMode, signOut, finishRecovery])
  return <AuthCtx.Provider value={api}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthApi {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('AuthProvider chybí')
  return v
}

// ------------------------------------------------------------------ data

interface DataApi {
  db: P27DB
  repo: Repo
  engine: SyncEngine | null
  userId: string
  email: string | null
  local: boolean
  sync: SyncState
  online: boolean
  syncNow: () => void
  getAccessToken: () => Promise<string | null>
}

const DataCtx = createContext<DataApi | null>(null)

export function DataProvider({ userId, email, local, children }: { userId: string; email: string | null; local: boolean; children: ReactNode }) {
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const { db, repo, engine } = useMemo(() => {
    const db = new P27DB(dbNameFor(local ? null : userId))
    const engine = !local && supabase ? new SyncEngine(db, createSupabaseAdapter(supabase, userId)) : null
    const repo = new Repo(db, userId, () => engine?.schedule(), local)
    return { db, repo, engine }
  }, [userId, local])

  const [sync, setSync] = useState<SyncState>(engine?.state ?? { phase: 'idle', lastSyncAt: null, error: null })
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (!engine) return
    const off = engine.on((e) => {
      if (e.type === 'state') setSync(e.state)
      if (e.type === 'rate-changed') {
        const f = (v: number | null) => (v == null ? 'nenastaven' : `${formatRate(v)} Kč`)
        toastRef.current.show(`Kurz EUR/CZK byl změněn na jiném zařízení: ${f(e.from)} → ${f(e.to)}`, { tone: 'warning', durationMs: 7000 })
      }
      if (e.type === 'conflict') {
        toastRef.current.show('Stejný záznam byl změněn na dvou zařízeních. Vyberte, kterou verzi ponechat.', { tone: 'warning', durationMs: 6000 })
      }
    })
    engine.start()
    return () => {
      off()
      engine.stop()
    }
  }, [engine])

  useEffect(() => () => db.close({ disableAutoOpen: false }), [db])

  const api = useMemo<DataApi>(
    () => ({
      db,
      repo,
      engine,
      userId,
      email,
      local,
      sync,
      online,
      syncNow: () => void engine?.sync(),
      getAccessToken: async () => (supabase ? ((await supabase.auth.getSession()).data.session?.access_token ?? null) : null),
    }),
    [db, repo, engine, userId, email, local, sync, online],
  )
  return <DataCtx.Provider value={api}>{children}</DataCtx.Provider>
}

export function useData(): DataApi {
  const v = useContext(DataCtx)
  if (!v) throw new Error('DataProvider chybí')
  return v
}

// ------------------------------------------------------------------ dotazy

export type ResolvedSettings = TripSettingsData & { exists: boolean }

export function useSettings(): ResolvedSettings | undefined {
  const { db, userId } = useData()
  return useLiveQuery(async () => {
    const s = await db.trip_settings.get(userId)
    if (!s || s.deleted_at) return { ...DEFAULT_SETTINGS, exists: false }
    return {
      name: s.name || DEFAULT_SETTINGS.name,
      start_date: s.start_date,
      end_date: s.end_date,
      travelers: s.travelers || 2,
      eur_rate: s.eur_rate,
      exists: true,
    }
  }, [db, userId])
}

export function useBudgetItems(): BudgetItem[] | undefined {
  const { db } = useData()
  return useLiveQuery(async () => {
    const rows = await db.budget_items.toArray()
    return rows.filter((r) => !r.deleted_at).sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [db])
}

export function useNotes(): Note[] | undefined {
  const { db } = useData()
  return useLiveQuery(async () => {
    const rows = await db.notes.toArray()
    return rows.filter((r) => !r.deleted_at).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [db])
}

export function useNote(id: string | undefined): Note | null | undefined {
  const { db } = useData()
  return useLiveQuery(async () => {
    if (!id) return null
    const n = await db.notes.get(id)
    return n && !n.deleted_at ? n : null
  }, [db, id])
}

export function useAttachments(noteId?: string): Attachment[] | undefined {
  const { db } = useData()
  return useLiveQuery(async () => {
    const rows = noteId ? await db.note_attachments.where('note_id').equals(noteId).toArray() : await db.note_attachments.toArray()
    return rows.filter((r) => !r.deleted_at).sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [db, noteId])
}

export function usePendingCount(): number {
  const { db } = useData()
  return useLiveQuery(() => countPending(db), [db]) ?? 0
}

export function useConflicts(): ConflictRecord[] {
  const { db } = useData()
  return useLiveQuery(() => db.conflicts.toArray(), [db]) ?? []
}

/** URL fotografie z lokální databáze (funguje i offline). */
export function usePhotoUrl(attachmentId: string | undefined): string | null | undefined {
  const { db } = useData()
  const blob = useLiveQuery(async () => (attachmentId ? ((await db.photo_blobs.get(attachmentId))?.blob ?? null) : null), [db, attachmentId])
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    if (blob === undefined) return
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return blob === undefined ? undefined : url
}
