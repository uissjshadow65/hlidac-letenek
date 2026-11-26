/**
 * GET /api/link-preview?url=…
 * Vrátí {title, image, site} pro náhled odkazu v poznámce.
 *
 * Bezpečnost:
 *  - funguje jen pro přihlášené uživatele aplikace (ověří se token Supabase),
 *  - povolí jen veřejné adresy http/https (ochrana proti SSRF – žádný
 *    localhost, vnitřní síť ani metadata cloudu, a to i po přesměrování),
 *  - časový limit a omezení velikosti stahovaných dat.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { lookup } from 'node:dns/promises'
import { charsetFrom, isPublicAddress, oembedEndpoint, parseHtmlPreview, validateTargetUrl } from './_lib/preview.js'

const TIMEOUT_MS = 6000
const MAX_BYTES = 1_000_000
const MAX_REDIRECTS = 4
const UA = 'Mozilla/5.0 (compatible; Pariz27-LinkPreview/1.0)'

async function isAllowedHost(u: URL): Promise<boolean> {
  try {
    const addrs = await lookup(u.hostname.replace(/^\[|\]$/g, ''), { all: true, verbatim: true })
    return addrs.length > 0 && addrs.every((a) => isPublicAddress(a.address))
  } catch {
    return false
  }
}

async function verifyUser(authHeader: string | undefined): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key || !authHeader?.startsWith('Bearer ')) return false
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: key, Authorization: authHeader },
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Stáhne stránku s ručním sledováním přesměrování – každý cíl se znovu ověří. */
async function safeFetch(start: URL, accept: string): Promise<{ res: Response; url: URL } | null> {
  let url = start
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    if (!(await isAllowedHost(url))) return null
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'cs,en;q=0.8' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return null
      const next = validateTargetUrl(new URL(loc, url).toString())
      if (!next) return null
      url = next
      continue
    }
    return { res, url }
  }
  return null
}

async function readLimited(res: Response): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    size += value.length
    if (size >= MAX_BYTES) {
      await reader.cancel()
      break
    }
  }
  const out = new Uint8Array(Math.min(size, MAX_BYTES))
  let off = 0
  for (const c of chunks) {
    const part = c.subarray(0, Math.min(c.length, out.length - off))
    out.set(part, off)
    off += part.length
    if (off >= out.length) break
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })
  const raw = typeof req.query.url === 'string' ? req.query.url : ''
  const target = validateTargetUrl(raw)
  if (!target) return res.status(400).json({ error: 'url' })
  if (!(await verifyUser(req.headers.authorization))) return res.status(401).json({ error: 'auth' })

  try {
    const oembed = oembedEndpoint(target)
    if (oembed) {
      const r = await safeFetch(new URL(oembed), 'application/json')
      if (r?.res.ok) {
        const data = JSON.parse(new TextDecoder().decode(await readLimited(r.res))) as Record<string, unknown>
        const image = typeof data.thumbnail_url === 'string' && data.thumbnail_url.startsWith('https://') ? data.thumbnail_url : null
        res.setHeader('Cache-Control', 'private, max-age=86400')
        return res.status(200).json({
          title: typeof data.title === 'string' ? data.title.slice(0, 300) : null,
          image,
          site: typeof data.provider_name === 'string' ? data.provider_name : null,
        })
      }
    }

    const r = await safeFetch(target, 'text/html,application/xhtml+xml')
    if (!r || !r.res.ok) return res.status(200).json({ title: null, image: null, site: null })
    const type = r.res.headers.get('content-type')
    if (type && !/html|xml/i.test(type)) return res.status(200).json({ title: null, image: null, site: null })
    const bytes = await readLimited(r.res)
    const asciiHead = new TextDecoder('latin1').decode(bytes.subarray(0, 4096))
    const html = new TextDecoder(charsetFrom(type, asciiHead)).decode(bytes)
    res.setHeader('Cache-Control', 'private, max-age=86400')
    return res.status(200).json(parseHtmlPreview(html, r.url.toString()))
  } catch {
    return res.status(200).json({ title: null, image: null, site: null })
  }
}
