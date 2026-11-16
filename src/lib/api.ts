import { validateDocument, validatePublished, type CeremonyDocument, type PublishedCeremony } from './ceremony'

export type ApiConfig = { url: string; key: string }
export type Credentials = { username: string; password: string }
export class ApiError extends Error {
  code: string
  constructor(message: string, code = 'unavailable') { super(message); this.code = code }
}

export class CeremonyApi {
  constructor(private config: ApiConfig, private fetcher: typeof fetch = fetch) {}

  private async request(path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = { apikey: this.config.key, 'Content-Type': 'application/json' }
    // New publishable keys are not JWTs. Only legacy anon JWTs use Bearer.
    if (this.config.key.startsWith('eyJ')) headers.Authorization = `Bearer ${this.config.key}`
    let response: Response
    try {
      response = await this.fetcher.call(globalThis, `${this.config.url.replace(/\/$/, '')}/rest/v1/${path}`, {
        method: body === undefined ? 'GET' : 'POST', headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(12000), cache: 'no-store',
      })
    } catch {
      throw new ApiError('Unable to reach the shared ceremony. Check your connection and try again. Your draft is unchanged.')
    }
    let result: unknown
    try { result = await response.json() } catch { throw new ApiError('The ceremony service returned an unexpected response. Please try again.') }
    if (!response.ok) {
      const message = typeof result === 'object' && result && 'message' in result ? String(result.message) : ''
      if (message.includes('CONTENT_CONFLICT')) throw new ApiError('A newer version was published. Your draft is safe; load the latest version before editing again.', 'conflict')
      if (message.includes('INVALID_CREDENTIALS')) throw new ApiError('The username or password is incorrect.', 'credentials')
      if (message.includes('INVALID_DOCUMENT')) throw new ApiError('The ceremony could not be saved. Check the chapter and moment fields and ensure the editor database upgrade has been applied. Your draft is unchanged.', 'validation')
      if (response.status === 429) throw new ApiError('Too many requests. Wait a moment, then try again.', 'rate-limit')
      throw new ApiError('Shared storage is unavailable. Check the project setup and connection, then try again. Your draft is unchanged.')
    }
    return result
  }

  async read(): Promise<PublishedCeremony> {
    const result = await this.request('wedding_ceremony?id=eq.mohini-jewel&select=document,revision,updated_at')
    if (!Array.isArray(result) || !result.length) throw new ApiError('Shared storage is empty. Run the supplied SQL setup first.', 'setup')
    return validatePublished(result[0])
  }

  async login(credentials: Credentials): Promise<void> {
    const result = await this.request('rpc/wedding_login', { p_username: credentials.username, p_password: credentials.password })
    if (result !== true) throw new ApiError('The username or password is incorrect.', 'credentials')
  }

  async publish(document: CeremonyDocument, credentials: Credentials, expectedRevision: number): Promise<PublishedCeremony> {
    const result = await this.request('rpc/publish_wedding', {
      p_username: credentials.username, p_password: credentials.password,
      p_document: validateDocument(document), p_expected_revision: expectedRevision,
    })
    if (!Array.isArray(result) || result.length !== 1) throw new ApiError('Publication was not confirmed. Your draft is unchanged; refresh before trying again.')
    return validatePublished(result[0])
  }
}
