/**
 * Pomocné funkce pro náhled odkazu – čisté funkce bez síťového přístupu,
 * aby šly snadno testovat.
 */
import { isIP } from 'node:net'

/** true = adresa je veřejná (ne localhost, vnitřní síť, metadata cloudu…). */
export function isPublicAddress(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) return isPublicV4(ip)
  if (v === 6) {
    const s = ip.toLowerCase()
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicV4(mapped[1])
    if (s === '::' || s === '::1') return false
    if (/^f[cd]/.test(s)) return false // fc00::/7 – unikátní lokální
    if (/^fe[89ab]/.test(s)) return false // fe80::/10 – link-local
    if (/^ff/.test(s)) return false // multicast
    if (s.startsWith('64:ff9b:') || s.startsWith('2001:db8') || s.startsWith('100::')) return false
    return true
  }
  return false
}

function isPublicV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && b === 168) return false
  if (a === 192 && b === 0) return false
  if (a === 198 && (b === 18 || b === 19)) return false
  if (a >= 224) return false
  return true
}

/** Povolené jsou jen http/https na standardních portech, bez přihlašovacích údajů v adrese. */
export function validateTargetUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (u.username || u.password) return null
  if (u.port && u.port !== '80' && u.port !== '443') return null
  const host = u.hostname.toLowerCase()
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null
  const bare = host.replace(/^\[|\]$/g, '')
  if (isIP(bare) && !isPublicAddress(bare)) return null
  return u
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const m = tag.match(re)
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null
}

export interface ParsedPreview {
  title: string | null
  image: string | null
  site: string | null
}

/** Vytáhne z HTML název, obrázek a název webu (Open Graph / Twitter / <title>). */
export function parseHtmlPreview(html: string, baseUrl: string): ParsedPreview {
  const head = html.slice(0, 600_000)
  const meta = new Map<string, string>()
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? attr(tag, 'itemprop'))?.toLowerCase()
    const content = attr(tag, 'content')
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content).trim())
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const title =
    meta.get('og:title') ?? meta.get('twitter:title') ?? (titleTag ? decodeEntities(titleTag).replace(/\s+/g, ' ').trim() : null)
  const rawImage = meta.get('og:image:secure_url') ?? meta.get('og:image') ?? meta.get('twitter:image') ?? meta.get('twitter:image:src') ?? meta.get('image')
  let image: string | null = null
  if (rawImage) {
    try {
      const u = new URL(rawImage, baseUrl)
      if (u.protocol === 'http:') u.protocol = 'https:'
      image = u.protocol === 'https:' ? u.toString() : null
    } catch {
      image = null
    }
  }
  return {
    title: title ? title.slice(0, 300) : null,
    image,
    site: (meta.get('og:site_name') ?? null)?.slice(0, 100) ?? null,
  }
}

export function charsetFrom(contentType: string | null, head: string): string {
  const fromHeader = contentType?.match(/charset=([^;]+)/i)?.[1]
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  const cs = (fromHeader ?? fromMeta ?? 'utf-8').trim().toLowerCase()
  try {
    new TextDecoder(cs)
    return cs
  } catch {
    return 'utf-8'
  }
}

/** Služby s oficiálním oEmbed rozhraním (spolehlivější než HTML). */
export function oembedEndpoint(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return `https://www.tiktok.com/oembed?url=${encodeURIComponent(u.toString())}`
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be')
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u.toString())}`
  return null
}
