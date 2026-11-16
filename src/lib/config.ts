import type { ApiConfig } from './api'

export type SiteConfig = { api: ApiConfig | null; error: string | null }

export async function loadConfig(): Promise<SiteConfig> {
  let url = import.meta.env.VITE_SUPABASE_URL || ''
  let key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url && !key) {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw Error('Configuration request failed.')
      const runtime = await response.json()
      url = runtime.supabaseUrl || ''; key = runtime.supabasePublishableKey || ''
    } catch { return { api: null, error: 'The site configuration could not be loaded. Reload before editing.' } }
  }
  if (!url && !key) return { api: null, error: null }
  try {
    const parsed = new URL(url)
    const local = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) throw Error('Use an HTTPS Supabase URL.')
    if (!key || key.startsWith('sb_secret_')) throw Error('Use a public publishable or anon key, never a secret key.')
    if (key.startsWith('eyJ') && JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') throw Error('Only a public anon key may be used in the frontend.')
    return { api: { url: url.replace(/\/$/, ''), key }, error: null }
  } catch (error) { return { api: null, error: error instanceof Error ? error.message : 'The shared-storage configuration is incomplete.' } }
}
