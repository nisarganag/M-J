import { describe, expect, it } from 'vitest'
import source from '../data/default-ceremony.json'
import { readPublished, readDraft, writePublished, writeDraft } from './storage'
import { validateDocument } from './ceremony'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('draft and published storage', () => {
  it('isolates unpublished drafts from the guest document', () => {
    const storage = memoryStorage()
    const document = validateDocument(source)
    writePublished(storage, { document, revision: 1, updated_at: null }, 'shared')
    const draft = structuredClone(document)
    draft.sections[0].title = 'Unpublished text'
    writeDraft(storage, { document: draft, baseRevision: 1, savedAt: '2026-11-16' }, 'shared')
    expect(readPublished(storage, 'shared')?.document.sections[0].title).toBe('Entrance Procession')
    expect(readDraft(storage, 'shared')?.document.sections[0].title).toBe('Unpublished text')
    expect(readPublished(storage, 'preview')).toBeNull()
  })
  it('survives corrupt storage and reports failed writes', () => {
    const broken = { getItem: () => '{broken', setItem: () => { throw Error('quota') }, removeItem: () => {} }
    expect(readPublished(broken, 'shared')).toBeNull()
    expect(writePublished(broken, { document: validateDocument(source), revision: 1, updated_at: null }, 'shared')).toBe(false)
    expect(readPublished({ ...broken, getItem: () => { throw Error('denied') } }, 'shared')).toBeNull()
  })
  it('recovers incomplete text while a section is being rewritten', () => {
    const storage = memoryStorage()
    const document = validateDocument(source)
    document.sections[0].content = ''
    document.sections[0].title = ''
    writeDraft(storage, { document, baseRevision: 1, savedAt: '2026-11-16' }, 'shared')
    expect(readDraft(storage, 'shared')?.document.sections[0].content).toBe('')
  })
  it('recovers drafts larger than the publication limit without allowing publication', () => {
    const storage = memoryStorage()
    const document = validateDocument(source)
    document.sections.slice(0, 9).forEach(section => { section.content = 'x'.repeat(60000) })
    expect(writeDraft(storage, { document, baseRevision: 1, savedAt: '2026-11-16' }, 'shared')).toBe(true)
    expect(readDraft(storage, 'shared')?.document.sections[0].content.length).toBe(60000)
    expect(() => validateDocument(document)).toThrow(/too large/i)
  })
})
