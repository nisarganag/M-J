import { readFileSync, existsSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import source from '../data/default-ceremony.json'
import { addChapter, addMoment, changeMomentChapter, validateDocument } from './ceremony'
import { COPY_FIELDS } from './site-copy'

const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8')
const textFunction = schema.match(/create or replace function wedding_private\.valid_text[\s\S]+?\$\$;/i)![0]
const documentFunction = schema.match(/create or replace function wedding_private\.valid_document[\s\S]+?\$\$;/i)![0]

describe('PostgreSQL publication validation', () => {
  let database: PGlite
  beforeAll(async () => {
    database = new PGlite()
    await database.exec(`create schema wedding_private; ${textFunction} ${documentFunction}`)
  }, 20000)
  afterAll(async () => { await database?.close() })
  async function accepts(document: unknown) {
    const result = await database.query<{ valid: boolean }>('select wedding_private.valid_document($1::jsonb) as valid', [JSON.stringify(document)])
    return result.rows[0].valid
  }

  it('accepts both the original document and expanded editor publications', async () => {
    expect(await accepts(source)).toBe(true)
    let document = addChapter(validateDocument(source), 'new-chapter')
    document = changeMomentChapter(document, document.sections[0].id, 'new-chapter')
    document = addMoment(document, 'new-prayer')
    document.copy.readerTitle = 'A new celebration'
    document.intro.message = ''; document.closing.title = ''; document.closing.message = ''
    expect(await accepts(document)).toBe(true)
    expect(await accepts({ ...document, chapters: [], sections: [] })).toBe(true)
  })

  it('rejects orphaned moments, duplicate chapters and malformed editable copy', async () => {
    const document = validateDocument(source)
    expect(await accepts({ ...document, chapters: [] })).toBe(false)
    expect(await accepts({ ...document, chapters: [...document.chapters, document.chapters[0]] })).toBe(false)
    expect(await accepts({ ...document, copy: { readerTitle: { malicious: 'object' } } })).toBe(false)
    expect(await accepts({ ...document, copy: { readerTitle: 'x'.repeat(4001) } })).toBe(false)
    expect(await accepts({ ...document, sections: [{ ...document.sections[0], number: 1.5 }] })).toBe(false)
  })

  it('enforces the same website text limits and required labels as the browser', async () => {
    const document = validateDocument(source)
    for (const copy of [
      { navHome: '' }, { navHome: 'A'.repeat(81) }, { readerTitle: 'A'.repeat(161) },
      { navHome: '\n\t' }, { navHome: '💒'.repeat(41) },
    ]) {
      expect(() => validateDocument({ ...document, copy })).toThrow()
      expect(await accepts({ ...document, copy })).toBe(false)
    }
    expect(await accepts({ ...document, copy: { navHome: 'A'.repeat(80), readerTitle: 'A'.repeat(160), quote: '' } })).toBe(true)
    for (const [key, field] of Object.entries(COPY_FIELDS)) {
      const boundary = { ...document, copy: { [key]: 'x'.repeat(field.max) } }
      expect(() => validateDocument(boundary)).not.toThrow()
      expect(await accepts(boundary), `${key} at its limit`).toBe(true)
      const oversized = { ...document, copy: { [key]: 'x'.repeat(field.max + 1) } }
      expect(() => validateDocument(oversized)).toThrow()
      expect(await accepts(oversized), `${key} beyond its limit`).toBe(false)
      expect(await accepts({ ...document, copy: { [key]: '' } }), `${key} required status`).toBe(!field.required)
    }
  })

  it('upgrades the existing database without changing stored ceremony content', async () => {
    const upgradePath = new URL('../../supabase/upgrade-editor.sql', import.meta.url)
    expect(existsSync(upgradePath)).toBe(true)
    await database.exec('create table public.wedding_ceremony (document jsonb not null check (wedding_private.valid_document(document)))')
    await database.query('insert into public.wedding_ceremony (document) values ($1::jsonb)', [JSON.stringify(source)])
    await database.exec(readFileSync(upgradePath, 'utf8'))
    expect((await database.query<{ document: unknown }>('select document from public.wedding_ceremony')).rows[0].document).toEqual(source)
    expect(await accepts({ ...validateDocument(source), chapters: [], sections: [] })).toBe(true)
    expect(await accepts({ ...validateDocument(source), copy: { navHome: '' } })).toBe(false)
  })
})
