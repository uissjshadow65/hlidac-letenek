import type { NoteLink } from './types'

export type LinkKind = 'instagram' | 'tiktok' | 'maps' | 'youtube' | 'web'

/** Doplní https:// a ověří, že jde o platnou webovou adresu. */
export function normalizeUrl(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  // z vloženého textu vytáhneme první odkaz (např. „Podívej https://…“)
  const found = s.match(/https?:\/\/[^\s<>"']+/i)
  if (found) s = found[0]
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    if (!/^[^\s/]+\.[^\s/]{2,}/.test(s)) return null
    s = `https://${s}`
  }
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export function linkKind(url: string): LinkKind {
  let host = ''
  let path = ''
  try {
    const u = new URL(url)
    host = u.hostname.replace(/^www\./, '').toLowerCase()
    path = u.pathname
  } catch {
    return 'web'
  }
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram'
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube'
  if (
    host === 'maps.app.goo.gl' ||
    host === 'maps.apple.com' ||
    host === 'maps.google.com' ||
    host === 'mapy.cz' ||
    host === 'mapy.com' ||
    host.endsWith('.mapy.cz') ||
    (host === 'goo.gl' && path.startsWith('/maps')) ||
    (/^google\.[a-z.]+$/.test(host) && path.startsWith('/maps'))
  ) {
    return 'maps'
  }
  return 'web'
}

export const LINK_KIND_LABEL: Record<LinkKind, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  maps: 'Mapa',
  youtube: 'YouTube',
  web: 'Web',
}

export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export interface LinkPreview {
  title: string | null
  image: string | null
  site: string | null
}

/**
 * Náhled odkazu (název a obrázek) přes vlastní serverovou funkci /api/link-preview.
 * Když náhled nejde získat, vrací null a aplikace zobrazí jen samotný odkaz.
 */
export async function fetchLinkPreview(url: string, accessToken: string | null): Promise<LinkPreview | null> {
  if (!accessToken || (typeof navigator !== 'undefined' && !navigator.onLine)) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 9000)
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: ctrl.signal,
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null
    const data = (await res.json()) as Partial<LinkPreview>
    const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
    const image = clean(data.image, 2000)
    return {
      title: clean(data.title, 300),
      image: image && /^https:\/\//i.test(image) ? image : null,
      site: clean(data.site, 100),
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export function newLink(url: string, id: string): NoteLink {
  return { id, url, title: null, image: null, site: null, fetched_at: null }
}
