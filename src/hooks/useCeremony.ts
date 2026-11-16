import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CeremonyApi, type Credentials } from '../lib/api'
import { DEFAULT_PUBLISHED, type CeremonyDocument, type PublishedCeremony } from '../lib/ceremony'
import { browserStorage, readPublished, storageKey, writePublished } from '../lib/storage'
import type { SiteConfig } from '../lib/config'

export function useCeremony(config: SiteConfig) {
  const api = useMemo(() => config.api ? new CeremonyApi(config.api) : null, [config.api])
  const scope = config.api ? `shared:${config.api.url}` : 'preview'
  const [published, setPublished] = useState<PublishedCeremony>(() => readPublished(browserStorage(), scope) || DEFAULT_PUBLISHED)
  const [status, setStatus] = useState<'loading' | 'online' | 'offline' | 'preview'>(api ? 'loading' : 'preview')
  const [error, setError] = useState<string | null>(null)
  const current = useRef(published)
  const loading = useRef(false)
  const mounted = useRef(true)

  const accept = useCallback((next: PublishedCeremony) => {
    if (!mounted.current || next.revision < current.current.revision) return
    current.current = next
    setPublished(next)
    writePublished(browserStorage(), next, scope)
  }, [scope])

  const refresh = useCallback(async () => {
    if (!api || loading.current) return
    loading.current = true
    try {
      const next = await api.read()
      if (mounted.current) { accept(next); setStatus('online'); setError(null) }
    } catch (error) {
      if (mounted.current) { setStatus('offline'); setError(error instanceof Error ? error.message : 'Unable to refresh the ceremony.') }
    } finally { loading.current = false }
  }, [api, accept])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const visibleRefresh = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(visibleRefresh, 10000)
    const fromOtherTab = (event: StorageEvent) => {
      if (event.key !== storageKey(scope, 'published')) return
      const saved = readPublished(browserStorage(), scope)
      if (saved && saved.revision > current.current.revision) { current.current = saved; setPublished(saved) }
    }
    window.addEventListener('focus', visibleRefresh)
    window.addEventListener('online', visibleRefresh)
    window.addEventListener('storage', fromOtherTab)
    document.addEventListener('visibilitychange', visibleRefresh)
    return () => {
      mounted.current = false; clearInterval(timer)
      window.removeEventListener('focus', visibleRefresh)
      window.removeEventListener('online', visibleRefresh)
      window.removeEventListener('storage', fromOtherTab)
      document.removeEventListener('visibilitychange', visibleRefresh)
    }
  }, [refresh, scope])

  async function login(credentials: Credentials) {
    if (config.error) throw Error(config.error)
    if (api) { await api.login(credentials); return }
    if (credentials.username !== 'admin' || credentials.password !== 'admin') throw Error('The username or password is incorrect.')
  }

  async function publish(document: CeremonyDocument, credentials: Credentials, revision: number) {
    if (config.error) throw Error(config.error)
    if (api) {
      const saved = await api.publish(document, credentials, revision)
      accept(saved); setStatus('online'); setError(null)
      return saved
    }
    const latest = readPublished(browserStorage(), scope) || current.current
    if (latest.revision !== revision) throw Error('A newer preview was saved in another tab. Load the latest version before saving.')
    const saved = { document, revision: revision + 1, updated_at: new Date().toISOString() }
    if (!writePublished(browserStorage(), saved, scope)) throw Error('Browser storage is unavailable or full. Your preview was not saved. Keep this window open and copy your edits.')
    accept(saved)
    return saved
  }

  return { published, status, error, scope, isShared: !!api, login, publish, refresh }
}
