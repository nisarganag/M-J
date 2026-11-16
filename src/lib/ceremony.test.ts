import { describe, expect, it } from 'vitest'
import source from '../data/default-ceremony.json'
import { addChapter, addMoment, changeMomentChapter, filterSections, moveChapter, moveMoment, removeChapter, removeMoment, validateDocument } from './ceremony'

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

describe('complete ceremony editing', () => {
  it('loads legacy content with editable chapter headings and website text', () => {
    const document = validateDocument(source)
    expect(document.chapters.map(chapter => chapter.title)).toContain('Opening rites')
    expect(document.copy.readerTitle).toBe('Every word.')
    expect(document.sections).toEqual(source.sections)
  })

  it('retains custom chapters and copy while allowing optional text to be removed', () => {
    const document = structuredClone(source) as Record<string, any>
    document.chapters = [{ id: 'custom', title: 'Our promises', caption: '', numeral: 'A' }]
    document.sections = document.sections.map((section: Record<string, unknown>) => ({ ...section, chapter: 'custom' }))
    document.copy = { readerTitle: 'A day of joy', quote: '', quoteEmphasis: '' }
    document.intro.message = ''; document.closing.message = ''
    const result = validateDocument(document)
    expect(result.chapters[0].title).toBe('Our promises')
    expect(result.copy.readerTitle).toBe('A day of joy')
    expect(result.copy.quote).toBe('')
    expect(result.intro.message).toBe('')
  })

  it('rejects broken chapter references, duplicate chapters and invalid display numbers', () => {
    const document = validateDocument(source)
    expect(() => validateDocument({ ...document, chapters: [] })).toThrow(/chapter/i)
    expect(() => validateDocument({ ...document, chapters: [...document.chapters, document.chapters[0]] })).toThrow(/unique/i)
    const badNumber = structuredClone(document)
    badNumber.sections[0].number = 10000000
    expect(() => validateDocument(badNumber)).toThrow(/number/i)
    expect(() => validateDocument({ ...document, copy: { readerTitle: 12 } })).toThrow()
  })

  it('adds a moment after the selected one and moves it across chapter boundaries without losing text', () => {
    const original = validateDocument(source)
    const lastOpening = original.sections.filter(section => section.chapter === 'opening').at(-1)!
    const added = addMoment(original, 'new-moment', lastOpening.id)
    const moved = moveMoment(added, 'new-moment', 1)
    const newMoment = moved.sections.find(section => section.id === 'new-moment')!
    expect(newMoment.chapter).toBe('word')
    expect(moved.sections.map(section => section.number)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
    expect(moved.sections.filter(section => section.chapter === 'word').map(section => section.id).indexOf('new-moment')).toBe(1)
    expect(moved.sections.filter(section => section.id !== 'new-moment').map(section => section.content)).toEqual(original.sections.map(section => section.content))
    expect(original.sections).toHaveLength(30)
  })

  it('keeps guest order consistent when chapters move and moments change chapter', () => {
    const original = validateDocument(source)
    const added = addChapter(original, 'custom')
    const reassigned = changeMomentChapter(added, original.sections[0].id, 'custom')
    const moved = moveChapter(reassigned, 'custom', -1)
    expect(moved.chapters.at(-2)?.id).toBe('custom')
    expect(moved.sections.filter(section => section.chapter === 'custom')[0].content).toBe(original.sections[0].content)
    expect(moved.sections.map(section => moved.chapters.findIndex(chapter => chapter.id === section.chapter))).toEqual([...moved.sections.map(section => moved.chapters.findIndex(chapter => chapter.id === section.chapter))].sort((a, b) => a - b))
    expect(() => changeMomentChapter(moved, original.sections[0].id, 'missing')).toThrow(/chapter/i)
  })

  it('can remove every chapter and start again without an invalid or uneditable document', () => {
    let document = validateDocument(source)
    for (const chapter of document.chapters) document = removeChapter(document, chapter.id)
    expect(validateDocument(document).sections).toEqual([])
    expect(document.chapters).toEqual([])
    document = addMoment(document, 'fresh-start')
    expect(document.chapters).toHaveLength(1)
    expect(document.sections[0].number).toBe(1)
    document = removeMoment(document, 'fresh-start')
    expect(validateDocument(document).sections).toEqual([])
  })

  it('does not duplicate IDs or move beyond the bounds of the document', () => {
    const document = validateDocument(source)
    expect(() => addMoment(document, document.sections[0].id)).toThrow(/unique/i)
    expect(() => addChapter(document, document.chapters[0].id)).toThrow(/unique/i)
    expect(moveMoment(document, document.sections[0].id, -1)).toEqual(document)
    expect(moveChapter(document, document.chapters[0].id, -1)).toEqual(document)
    expect(moveMoment(document, 'removed-id', 1)).toEqual(document)
  })
})
