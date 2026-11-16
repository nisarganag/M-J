import { useId } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { addChapter, moveChapter, removeChapter, type CeremonyDocument, type CeremonyChapter } from '../lib/ceremony'

export function ChapterEditor({ document, onChange }: { document: CeremonyDocument; onChange: (document: CeremonyDocument) => void }) {
  const id = useId()
  function update(chapterId: string, patch: Partial<CeremonyChapter>) {
    onChange({ ...document, chapters: document.chapters.map(chapter => chapter.id === chapterId ? { ...chapter, ...patch } : chapter) })
  }
  function remove(chapter: CeremonyChapter) {
    const count = document.sections.filter(section => section.chapter === chapter.id).length
    const warning = count ? ` This also removes ${count} ${count === 1 ? 'moment' : 'moments'} in this chapter. Move any moments you want to keep to another chapter first.` : ''
    if (window.confirm(`Remove “${chapter.title || 'Untitled chapter'}”?${warning} This change stays in your draft until you publish.`)) onChange(removeChapter(document, chapter.id))
  }
  return <div className="edit-form settings-form chapters-editor">
    <span className="eyebrow">THE SHAPE OF YOUR CELEBRATION</span><h3>Chapters & order</h3>
    <p className="field-help">Rename each chapter and its small heading. Moving a chapter moves all its moments with it. Adding, moving, or removing moments updates their numbers in reading order.</p>
    {document.chapters.map((chapter, index) => <section role="group" aria-label={`Chapter ${index + 1}`} className="chapter-editor-card" key={chapter.id}>
      <div className="chapter-editor-top"><span className="eyebrow">CHAPTER {index + 1} · {document.sections.filter(section => section.chapter === chapter.id).length} MOMENTS</span><div className="structure-actions"><button className="icon-button" aria-label="Move chapter up" title="Move chapter up" disabled={index === 0} onClick={() => onChange(moveChapter(document, chapter.id, -1))}><ArrowUp size={16}/></button><button className="icon-button" aria-label="Move chapter down" title="Move chapter down" disabled={index === document.chapters.length - 1} onClick={() => onChange(moveChapter(document, chapter.id, 1))}><ArrowDown size={16}/></button><button className="icon-button danger-action" aria-label="Remove chapter" title="Remove chapter" onClick={() => remove(chapter)}><Trash2 size={16}/></button></div></div>
      <label htmlFor={`${id}-${chapter.id}-title`}>Chapter heading</label><input id={`${id}-${chapter.id}-title`} value={chapter.title} maxLength={160} onChange={event => update(chapter.id, { title: event.target.value })}/>
      <label htmlFor={`${id}-${chapter.id}-caption`}>Chapter caption</label><input id={`${id}-${chapter.id}-caption`} value={chapter.caption} maxLength={160} onChange={event => update(chapter.id, { caption: event.target.value })}/>
      <label htmlFor={`${id}-${chapter.id}-numeral`}>Chapter numeral</label><input id={`${id}-${chapter.id}-numeral`} value={chapter.numeral} maxLength={20} onChange={event => update(chapter.id, { numeral: event.target.value })}/>
    </section>)}
    {!document.chapters.length && <p className="field-help">There are no chapters yet. Add a chapter, or add a moment to start a new ceremony.</p>}
    <button className="button secondary small add-chapter" disabled={document.chapters.length >= 30} onClick={() => onChange(addChapter(document, `chapter-${crypto.randomUUID()}`))}><Plus size={16}/>Add chapter</button>
  </div>
}
