import { describe, expect, it, vi } from 'vitest'
import source from '../data/default-ceremony.json'
import { CeremonyApi } from './api'
import { validateDocument } from './ceremony'

describe('shared ceremony API', () => {
  it('calls native browser fetch with the window receiver', async () => {
    const fetcher = function (this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation')
      return Promise.resolve(new Response(JSON.stringify([{ document: source, revision: 1, updated_at: null }])))
    }
    const api = new CeremonyApi({ url: 'https://example.supabase.co', key: 'sb_publishable_test' }, fetcher)
    expect((await api.read()).revision).toBe(1)
  })
  it('reads versioned data using the public key header', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ document: source, revision: 2, updated_at: '2026-11-16T00:00:00Z' }])))
    const api = new CeremonyApi({ url: 'https://example.supabase.co', key: 'sb_publishable_test' }, fetcher)
    expect((await api.read()).revision).toBe(2)
    expect(fetcher.mock.calls[0][1].headers.apikey).toBe('sb_publishable_test')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })
  it('never replaces failed remote authentication with local login', async () => {
    const api = new CeremonyApi({ url: 'https://example.supabase.co', key: 'sb_publishable_test' }, vi.fn().mockResolvedValue(new Response('false')))
    await expect(api.login({ username: 'admin', password: 'admin' })).rejects.toThrow(/username or password/i)
  })
  it('sends the base revision and surfaces concurrent edit conflicts', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'CONTENT_CONFLICT' }), { status: 409 }))
    const api = new CeremonyApi({ url: 'https://example.supabase.co', key: 'sb_publishable_test' }, fetcher)
    await expect(api.publish(validateDocument(source), { username: 'admin', password: 'admin' }, 3)).rejects.toMatchObject({ code: 'conflict' })
    expect(JSON.parse(fetcher.mock.calls[0][1].body).p_expected_revision).toBe(3)
  })
  it('rejects an empty database instead of inventing a successful save', async () => {
    const api = new CeremonyApi({ url: 'https://example.supabase.co', key: 'sb_publishable_test' }, vi.fn().mockResolvedValue(new Response('[]')))
    await expect(api.read()).rejects.toThrow(/setup/i)
    await expect(api.publish(validateDocument(source), { username: 'admin', password: 'admin' }, 0)).rejects.toThrow()
  })
})
