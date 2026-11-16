import { validateDocument, validatePublished, type PublishedCeremony, type Draft } from './ceremony'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export const storageKey = (scope: string, kind: string) => `mj-wedding:v1:${scope}:${kind}`

export function browserStorage(): StorageLike | null {
  try { return window.localStorage } catch { return null }
}

export function readPublished(storage: StorageLike | null, scope: string): PublishedCeremony | null {
  try {
    const value = storage?.getItem(storageKey(scope, 'published'))
    return value ? validatePublished(JSON.parse(value)) : null
  } catch { return null }
}

export function writePublished(storage: StorageLike | null, value: PublishedCeremony, scope: string): boolean {
  try {
    if (!storage) return false
    storage.setItem(storageKey(scope, 'published'), JSON.stringify(value))
    return true
  } catch { return false }
}

export function readDraft(storage: StorageLike | null, scope: string): Draft | null {
  try {
    const raw = storage?.getItem(storageKey(scope, 'draft'))
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!Number.isSafeInteger(value.baseRevision) || value.baseRevision < 0 || typeof value.savedAt !== 'string') return null
    return { document: validateDocument(value.document, true), baseRevision: value.baseRevision, savedAt: value.savedAt }
  } catch { return null }
}

export function writeDraft(storage: StorageLike | null, value: Draft, scope: string): boolean {
  try {
    if (!storage) return false
    storage.setItem(storageKey(scope, 'draft'), JSON.stringify(value))
    return true
  } catch { return false }
}

export function clearDraft(storage: StorageLike | null, scope: string, expected?: Draft): boolean {
  try {
    if (!storage) return false
    if (expected && JSON.stringify(readDraft(storage, scope)) !== JSON.stringify(expected)) return false
    storage.removeItem(storageKey(scope, 'draft'))
    return true
  } catch { return false }
}
