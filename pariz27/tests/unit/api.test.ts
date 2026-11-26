import { describe, expect, it } from 'vitest'
import handler from '../../api/link-preview'

function call(query: Record<string, string>, headers: Record<string, string> = {}, method = 'GET') {
  const out: { status?: number; body?: unknown; headers: Record<string, string> } = { headers: {} }
  const res = {
    setHeader: (k: string, v: string) => ((out.headers[k] = v), res),
    status: (s: number) => ((out.status = s), res),
    json: (b: unknown) => ((out.body = b), res),
  }
  return (handler as unknown as (req: unknown, res: unknown) => Promise<unknown>)({ method, query, headers }, res).then(() => out)
}

describe('/api/link-preview', () => {
  it('odmítne neplatnou nebo vnitřní adresu', async () => {
    expect((await call({ url: 'http://169.254.169.254/latest' })).status).toBe(400)
    expect((await call({ url: 'file:///etc/passwd' })).status).toBe(400)
  })
  it('bez přihlášení nic nestáhne', async () => {
    const r = await call({ url: 'https://example.com' })
    expect(r.status).toBe(401)
    expect(r.headers['Cache-Control']).toBe('private, no-store')
  })
  it('jen metoda GET', async () => {
    expect((await call({ url: 'https://example.com' }, {}, 'POST')).status).toBe(405)
  })
})
