import defaultContent from '../data/default-ceremony.json'

export const CHAPTERS = [
  { id: 'opening', title: 'Opening rites', caption: 'Gathered in love', numeral: 'I' },
  { id: 'word', title: 'Liturgy of the Word', caption: 'A love rooted in faith', numeral: 'II' },
  { id: 'marriage', title: 'The rite of marriage', caption: 'Two hearts, one promise', numeral: 'III' },
  { id: 'eucharist', title: 'Liturgy of the Eucharist', caption: 'One bread, one body', numeral: 'IV' },
  { id: 'closing', title: 'Concluding rites', caption: 'The beginning of forever', numeral: 'V' },
] as const

export type Chapter = typeof CHAPTERS[number]['id']
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
  if (!Array.isArray(data.sections) || !data.sections.length || data.sections.length > 120) throw Error('A ceremony needs between 1 and 120 sections.')
  const ids = new Set<string>()
  const sections = data.sections.map((value): CeremonySection => {
    const section = object(value)
    const id = string(section.id, 'Section ID', 80)
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw Error('Sections need unique, valid IDs.')
    ids.add(id)
    if (!Number.isSafeInteger(section.number) || (section.number as number) < 1) throw Error('Invalid section number.')
    if (!CHAPTERS.some(chapter => chapter.id === section.chapter)) throw Error('Invalid ceremony chapter.')
    if (!['prayer', 'hymn', 'reading', 'ceremony'].includes(section.category as string)) throw Error('Invalid section category.')
    return {
      id, number: section.number as number, chapter: section.chapter as Chapter, category: section.category as Category,
      title: string(section.title, 'Section title', 160, draftMode), posture: string(section.posture, 'Posture', 80, true),
      content: string(section.content, 'Section content', 60000, draftMode),
    }
  })
  const result: CeremonyDocument = {
    schemaVersion: 1,
    couple: { firstName: string(couple.firstName, 'First name', 80, draftMode), secondName: string(couple.secondName, 'Second name', 80, draftMode) },
    intro: { eyebrow: string(intro.eyebrow, 'Welcome label', 120, draftMode), title: string(intro.title, 'Welcome title', 160, draftMode), message: string(intro.message, 'Welcome message', 4000, draftMode) },
    closing: { title: string(closing.title, 'Closing title', 160, draftMode), message: string(closing.message, 'Closing message', 10000, draftMode) },
    sections,
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

export const DEFAULT_DOCUMENT = validateDocument(defaultContent)
export const DEFAULT_PUBLISHED: PublishedCeremony = { document: DEFAULT_DOCUMENT, revision: 0, updated_at: null }
