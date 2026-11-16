import { describe, expect, it } from 'vitest'
import source from '../data/default-ceremony.json'
import { filterSections, validateDocument } from './ceremony'

describe('ceremony content', () => {
  it('accepts the source without inventing missing section 26', () => {
    const data = validateDocument(source)
    expect(data.sections).toHaveLength(30)
    expect(data.sections.map(s => s.number)).not.toContain(26)
    expect(data.sections.at(-1)?.number).toBe(31)
    expect(data.sections.find(s => s.number === 25)?.content).toContain('I am the bread of life,\nHe who comes')
  })
  it('combines category and case-insensitive full-text search', () => {
    const data = validateDocument(source)
    expect(filterSections(data.sections, 'hymn', 'HERE I AM')).toHaveLength(1)
    expect(filterSections(data.sections, 'reading', 'HERE I AM')).toHaveLength(0)
    expect(filterSections(data.sections, 'all', '  faithfulness ')).not.toHaveLength(0)
  })
  it('rejects malformed documents, duplicate ids and oversized text', () => {
    expect(() => validateDocument({})).toThrow()
    const bad = structuredClone(source)
    bad.sections[1].id = bad.sections[0].id
    expect(() => validateDocument(bad)).toThrow(/unique/i)
    const oversized = structuredClone(source)
    oversized.sections[0].content = 'x'.repeat(60001)
    expect(() => validateDocument(oversized)).toThrow()
  })
})
