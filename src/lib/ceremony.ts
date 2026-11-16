import defaultContent from '../data/default-ceremony.json'
import { COPY_FIELDS, DEFAULT_COPY, type CopyKey, type SiteCopy } from './site-copy'

export const CHAPTERS = [
  { id: 'opening', title: 'Opening rites', caption: 'Gathered in love', numeral: 'I' },
  { id: 'word', title: 'Liturgy of the Word', caption: 'A love rooted in faith', numeral: 'II' },
  { id: 'marriage', title: 'The rite of marriage', caption: 'Two hearts, one promise', numeral: 'III' },
  { id: 'eucharist', title: 'Liturgy of the Eucharist', caption: 'One bread, one body', numeral: 'IV' },
  { id: 'closing', title: 'Concluding rites', caption: 'The beginning of forever', numeral: 'V' },
] as const

export type Chapter = string
export type CeremonyChapter = { id: string; title: string; caption: string; numeral: string }
export type Category = 'prayer' | 'hymn' | 'reading' | 'ceremony'
export type Filter = Category | 'all'
export type CeremonySection = {
  id: string; number: number; title: string; chapter: Chapter
  category: Category; posture: string; content: string
}
export type CeremonyDocument = {
  schemaVersion: 1
  couple: { firstName: string; secondName: string }
  intro: { eyebrow: string; title: string; message: string }
  closing: { title: string; message: string }
  chapters: CeremonyChapter[]
  copy: SiteCopy
  sections: CeremonySection[]
}
export type PublishedCeremony = { document: CeremonyDocument; revision: number; updated_at: string | null }
export type Draft = { document: CeremonyDocument; baseRevision: number; savedAt: string }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid ceremony format.')
  return value as Record<string, unknown>
}
function string(value: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw Error(`${label} must be ${allowEmpty ? 'at most' : 'between 1 and'} ${max.toLocaleString()} characters.`)
  }
  return value
}

export function validateDocument(value: unknown, draftMode = false): CeremonyDocument {
  const data = object(value)
  if (data.schemaVersion !== 1) throw Error('This ceremony version is not supported.')
  const couple = object(data.couple), intro = object(data.intro), closing = object(data.closing)
  const rawChapters = data.chapters === undefined ? CHAPTERS : data.chapters
  if (!Array.isArray(rawChapters) || rawChapters.length > 30) throw Error('A ceremony can have up to 30 chapters.')
  const chapterIds = new Set<string>()
  const chapters = rawChapters.map((value): CeremonyChapter => {
    const chapter = object(value)
    const id = string(chapter.id, 'Chapter ID', 80)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || chapterIds.has(id)) throw Error('Chapters need unique, valid IDs.')
    chapterIds.add(id)
    return { id, title: string(chapter.title, 'Chapter title', 160, draftMode), caption: string(chapter.caption, 'Chapter caption', 160, true), numeral: string(chapter.numeral, 'Chapter numeral', 20, true) }
  })
  const rawCopy = data.copy === undefined ? {} : object(data.copy)
  const copy = { ...DEFAULT_COPY }
  for (const key of Object.keys(COPY_FIELDS) as CopyKey[]) {
    const spec = COPY_FIELDS[key]
    if (rawCopy[key] !== undefined) copy[key] = string(rawCopy[key], spec.label, spec.max, draftMode || !spec.required)
  }
  if (!Array.isArray(data.sections) || data.sections.length > 120) throw Error('A ceremony can have up to 120 sections.')
  const ids = new Set<string>()
  const sections = data.sections.map((value): CeremonySection => {
    const section = object(value)
    const id = string(section.id, 'Section ID', 80)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw Error('Sections need unique, valid IDs.')
    ids.add(id)
    if (!Number.isSafeInteger(section.number) || (section.number as number) < 1 || (section.number as number) > 9999999) throw Error('Invalid section number.')
    if (!chapterIds.has(section.chapter as string)) throw Error('Each moment must belong to an existing chapter.')
    if (!['prayer', 'hymn', 'reading', 'ceremony'].includes(section.category as string)) throw Error('Invalid section category.')
    return {
      id, number: section.number as number, chapter: section.chapter as Chapter, category: section.category as Category,
      title: string(section.title, 'Section title', 160, draftMode), posture: string(section.posture, 'Posture', 80, true),
      content: string(section.content, 'Section content', 60000, true),
    }
  })
  const result: CeremonyDocument = {
    schemaVersion: 1,
    couple: { firstName: string(couple.firstName, 'First name', 80, draftMode), secondName: string(couple.secondName, 'Second name', 80, draftMode) },
    intro: { eyebrow: string(intro.eyebrow, 'Welcome label', 120, true), title: string(intro.title, 'Welcome title', 160, true), message: string(intro.message, 'Welcome message', 4000, true) },
    closing: { title: string(closing.title, 'Closing title', 160, true), message: string(closing.message, 'Closing message', 10000, true) },
    chapters, copy, sections: chapters.flatMap(chapter => sections.filter(section => section.chapter === chapter.id)),
  }
  // Recover editable work even when it still needs shortening before publication.
  if (!draftMode && new TextEncoder().encode(JSON.stringify(result)).length > 500000) throw Error('The ceremony is too large to publish. Shorten the text or download a draft backup.')
  return result
}

export function validatePublished(value: unknown): PublishedCeremony {
  const data = object(value)
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) throw Error('Invalid content revision.')
  if (data.updated_at !== null && (typeof data.updated_at !== 'string' || Number.isNaN(Date.parse(data.updated_at)))) throw Error('Invalid publication date.')
  return { document: validateDocument(data.document), revision: data.revision as number, updated_at: data.updated_at as string | null }
}

export function filterSections(sections: CeremonySection[], category: Filter, query: string): CeremonySection[] {
  const search = query.trim().toLocaleLowerCase()
  return sections.filter(section => (category === 'all' || section.category === category) &&
    (!search || `${section.title}\n${section.content}`.toLocaleLowerCase().includes(search)))
}

export function renumberMoments(document: CeremonyDocument): CeremonyDocument {
  const sections = document.chapters.flatMap(chapter => document.sections.filter(section => section.chapter === chapter.id))
  return { ...document, sections: sections.map((section, index) => ({ ...section, number: index + 1 })) }
}

export function addMoment(document: CeremonyDocument, id: string, afterId?: string): CeremonyDocument {
  if (document.sections.length >= 120) throw Error('A ceremony can have up to 120 moments.')
  if (document.sections.some(section => section.id === id)) throw Error('Moments need unique IDs.')
  const chapters = document.chapters.length ? document.chapters : [{ id: 'chapter-start', title: 'Our ceremony', caption: '', numeral: 'I' }]
  const after = document.sections.findIndex(section => section.id === afterId)
  const chapter = after >= 0 ? document.sections[after].chapter : chapters.at(-1)!.id
  const sections = [...document.sections]
  sections.splice(after >= 0 ? after + 1 : sections.length, 0, { id, number: 1, title: 'New moment', chapter, category: 'prayer', posture: '', content: '' })
  return renumberMoments({ ...document, chapters, sections })
}

export function moveMoment(document: CeremonyDocument, id: string, direction: -1 | 1): CeremonyDocument {
  const sections = [...document.sections]
  const index = sections.findIndex(section => section.id === id), target = index + direction
  if (index < 0 || target < 0 || target >= sections.length) return document
  const moved = { ...sections[index], chapter: sections[target].chapter }
  sections[index] = sections[target]; sections[target] = moved
  return renumberMoments({ ...document, sections })
}

export function removeMoment(document: CeremonyDocument, id: string): CeremonyDocument {
  return renumberMoments({ ...document, sections: document.sections.filter(section => section.id !== id) })
}

export function changeMomentChapter(document: CeremonyDocument, id: string, chapterId: string): CeremonyDocument {
  if (!document.chapters.some(chapter => chapter.id === chapterId)) throw Error('Choose an existing chapter.')
  const section = document.sections.find(section => section.id === id)
  if (!section || section.chapter === chapterId) return document
  return renumberMoments({ ...document, sections: [...document.sections.filter(section => section.id !== id), { ...section, chapter: chapterId }] })
}

export function addChapter(document: CeremonyDocument, id: string): CeremonyDocument {
  if (document.chapters.length >= 30) throw Error('A ceremony can have up to 30 chapters.')
  if (document.chapters.some(chapter => chapter.id === id)) throw Error('Chapters need unique IDs.')
  return { ...document, chapters: [...document.chapters, { id, title: 'New chapter', caption: '', numeral: String(document.chapters.length + 1) }] }
}

export function moveChapter(document: CeremonyDocument, id: string, direction: -1 | 1): CeremonyDocument {
  const chapters = [...document.chapters]
  const index = chapters.findIndex(chapter => chapter.id === id), target = index + direction
  if (index < 0 || target < 0 || target >= chapters.length) return document
  ;[chapters[index], chapters[target]] = [chapters[target], chapters[index]]
  return renumberMoments({ ...document, chapters })
}

export function removeChapter(document: CeremonyDocument, id: string): CeremonyDocument {
  return renumberMoments({ ...document, chapters: document.chapters.filter(chapter => chapter.id !== id), sections: document.sections.filter(section => section.chapter !== id) })
}

export const DEFAULT_DOCUMENT = validateDocument(defaultContent)
export const DEFAULT_PUBLISHED: PublishedCeremony = { document: DEFAULT_DOCUMENT, revision: 0, updated_at: null }
