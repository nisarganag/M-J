import { useEffect, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Check, Download, Eye, FileText, ListOrdered, LogOut, PenLine, Plus, Save, Settings2, Trash2, Type, X } from 'lucide-react'
import { addMoment, changeMomentChapter, moveMoment, removeMoment, renumberMoments, type CeremonyDocument, type CeremonySection, type PublishedCeremony, type Draft, validateDocument } from '../lib/ceremony'
import { browserStorage, clearDraft, readDraft, writeDraft } from '../lib/storage'
import { Dialog } from './Dialog'
import { ContentText } from './ContentText'
import { WebsiteTextEditor } from './WebsiteTextEditor'
import { ChapterEditor } from './ChapterEditor'

type Props = {
  published: PublishedCeremony; scope: string; isShared: boolean; online: boolean
  onPublish: (document: CeremonyDocument, revision: number) => Promise<PublishedCeremony>
  onClose: () => void; onLogout: () => void; onRefresh: () => Promise<void>
}

export function Editor({ published, scope, isShared, online, onPublish, onClose, onLogout, onRefresh }: Props) {
  const id = useId()
  const [recovered] = useState(() => readDraft(browserStorage(), scope))
  const lastStored = useRef<Draft | null>(recovered)
  const [draft, setDraft] = useState<CeremonyDocument>(() => structuredClone(recovered?.document || published.document))
  const [base, setBase] = useState<PublishedCeremony>(() => ({ ...published, revision: recovered?.baseRevision ?? published.revision }))
  const [selected, setSelected] = useState((recovered?.document || published.document).sections[0]?.id || '@chapters')
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [success, setSuccess] = useState('')
  const [draftStatus, setDraftStatus] = useState(recovered ? 'Recovered your unpublished draft.' : '')
  const dirty = JSON.stringify(draft) !== JSON.stringify(base.document)
  const newer = published.revision !== base.revision
  const section = draft.sections.find(item => item.id === selected)
  const sectionIndex = draft.sections.findIndex(item => item.id === selected)

  useEffect(() => {
    if (!selected.startsWith('@') && !draft.sections.some(item => item.id === selected)) setSelected(draft.sections[0]?.id || '@chapters')
  }, [draft.sections, selected])

  useEffect(() => {
    if (!dirty) {
      if (lastStored.current) clearDraft(browserStorage(), scope, lastStored.current)
      lastStored.current = null
      setDraftStatus('')
      return
    }
    setSuccess('')
    const timer = window.setTimeout(() => {
      const snapshot = { document: draft, baseRevision: base.revision, savedAt: new Date().toISOString() }
      const saved = writeDraft(browserStorage(), snapshot, scope)
      if (saved) lastStored.current = snapshot
      setDraftStatus(saved ? 'Draft saved on this device.' : 'Draft recovery is unavailable. Keep this window open or download a backup.')
    }, 350)
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => { clearTimeout(timer); window.removeEventListener('beforeunload', guard) }
  }, [draft, dirty, base.revision, scope])

  useEffect(() => {
    if (newer && !dirty && !busy) { setBase(published); setDraft(structuredClone(published.document)) }
  }, [published, newer, dirty, busy])

  function close(logout = false) {
    if (busy) return
    if (dirty && !window.confirm('Leave the editor? Your changes have not been published. A draft will be kept on this device if browser storage is available.')) return
    if (dirty) {
      const snapshot = { document: draft, baseRevision: base.revision, savedAt: new Date().toISOString() }
      const saved = writeDraft(browserStorage(), snapshot, scope)
      if (saved) lastStored.current = snapshot
      if (!saved && !window.confirm('This browser could not keep your draft. Leaving now will lose these changes. Leave anyway?')) return
    }
    if (logout) onLogout(); else onClose()
  }
  function updateSection(patch: Partial<CeremonySection>) {
    setDraft(current => ({ ...current, sections: current.sections.map(item => item.id === selected ? { ...item, ...patch } : item) }))
  }
  function createMoment() {
    const momentId = `moment-${crypto.randomUUID()}`
    setDraft(current => addMoment(current, momentId, selected)); setSelected(momentId); setPreview(false)
  }
  function deleteMoment() {
    if (!section || !window.confirm(`Remove “${section.title || 'Untitled moment'}”? This change stays in your draft until you publish.`)) return
    const next = removeMoment(draft, section.id)
    setDraft(next); setSelected(next.sections[Math.min(sectionIndex, next.sections.length - 1)]?.id || '@chapters'); setPreview(false)
  }
  function choose(value: string) { setSelected(value); setPreview(false) }
  async function save() {
    setBusy(true); setError(''); setSuccess('')
    try {
      const valid = validateDocument(draft)
      const result = await onPublish(valid, base.revision)
      setBase(result); setDraft(structuredClone(result.document))
      if (lastStored.current) clearDraft(browserStorage(), scope, lastStored.current)
      lastStored.current = null
      setDraftStatus(''); setSuccess(isShared ? 'Published. Your guests will see this version.' : 'Preview saved on this device.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save. Your draft is unchanged.') }
    finally { setBusy(false) }
  }
  function loadLatest() {
    if (dirty && !window.confirm('Replace your unpublished draft with the latest published ceremony? Download a draft backup first if you want to keep these edits.')) return
    setDraft(structuredClone(published.document)); setBase(published)
    if (lastStored.current) clearDraft(browserStorage(), scope, lastStored.current)
    lastStored.current = null
    setError(''); setSuccess(''); setDraftStatus('')
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'mohini-jewel-draft.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const dateLabel = published.updated_at ? new Date(published.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Original ceremony'

  return <Dialog labelledBy={`${id}-title`} onClose={() => close()} className="editor-dialog">
    <header className="editor-header"><div className="editor-heading"><span className="editor-emblem"><PenLine size={20}/></span><div><span className="eyebrow">{draft.couple.firstName} & {draft.couple.secondName}</span><h2 id={`${id}-title`}>The ceremony studio</h2></div></div><button className="icon-button" aria-label="Close editor" onClick={() => close()} disabled={busy}><X size={22}/></button></header>
    <div className={`editor-connection ${isShared ? 'shared' : ''}`}><span className="connection-dot"/><strong>{isShared ? 'Shared ceremony' : 'Preview mode'}</strong><span>{isShared ? 'Publish once. Every guest sees the latest version.' : 'Changes stay on this device. Connect Supabase to publish for everyone.'}</span></div>
    <div className="editor-layout">
      <aside className="editor-nav"><button className={`editor-settings ${selected === '@welcome' ? 'selected' : ''}`} onClick={() => choose('@welcome')}><Settings2 size={16}/>Welcome & thanks</button><button className={`editor-settings ${selected === '@website' ? 'selected' : ''}`} onClick={() => choose('@website')}><Type size={16}/>Website text</button><button className={`editor-settings ${selected === '@chapters' ? 'selected' : ''}`} onClick={() => choose('@chapters')}><ListOrdered size={16}/>Chapters & order</button><span className="eyebrow">YOUR CEREMONY · {draft.sections.length}</span><nav aria-label="Moments to edit">{draft.chapters.map(chapter => <div className="editor-nav-chapter" key={chapter.id}><h3>{chapter.title || 'Untitled chapter'}</h3>{draft.sections.filter(item => item.chapter === chapter.id).map(item => <button key={item.id} className={selected === item.id ? 'selected' : ''} onClick={() => choose(item.id)}><span>{String(item.number).padStart(2, '0')}</span>{item.title || 'Untitled moment'}</button>)}</div>)}</nav></aside>
      <fieldset className="editor-main" aria-label="Edit ceremony content" disabled={busy}>
        <label className="mobile-picker-label" htmlFor={`${id}-section`}>Choose what to edit</label><select className="mobile-section-picker" id={`${id}-section`} value={selected} onChange={event => choose(event.target.value)}><option value="@welcome">Welcome & thanks</option><option value="@website">Website text</option><option value="@chapters">Chapters & order</option>{draft.chapters.map(chapter => <optgroup label={chapter.title || 'Untitled chapter'} key={chapter.id}>{draft.sections.filter(item => item.chapter === chapter.id).map(item => <option key={item.id} value={item.id}>{item.number}. {item.title || 'Untitled moment'}</option>)}</optgroup>)}</select>
        <div className="editor-commandbar"><span>{draft.chapters.length} chapters · {draft.sections.length} moments</span><button className="button small secondary" onClick={createMoment} disabled={draft.sections.length >= 120}><Plus size={15}/>Add moment</button></div>
        {newer && dirty && <div className="editor-notice"><p>A newer ceremony has been published. Your draft has been kept. Download it before loading the latest version.</p><button onClick={loadLatest}>Load latest version<ArrowUpRight size={14}/></button></div>}
        {isShared && !online && <div className="editor-notice"><p>The shared ceremony could not be refreshed. Your draft will stay here until you can publish.</p><button onClick={() => void onRefresh()}>Try connection again</button></div>}
        {section ? <>
          <div className="edit-panel-heading"><div><span className="eyebrow">MOMENT {String(section.number).padStart(2, '0')}</span><h3>{preview ? 'A guest’s view' : 'Words for this moment'}</h3></div><button className="button small secondary" onClick={() => setPreview(!preview)}>{preview ? <PenLine size={14}/> : <Eye size={14}/>} {preview ? 'Edit section' : 'Preview section'}</button></div>
          <div className="moment-structure"><div className="structure-actions"><button className="button small secondary" aria-label="Move moment up" disabled={sectionIndex === 0} onClick={() => setDraft(current => moveMoment(current, selected, -1))}><ArrowUp size={15}/>Move up</button><button className="button small secondary" aria-label="Move moment down" disabled={sectionIndex === draft.sections.length - 1} onClick={() => setDraft(current => moveMoment(current, selected, 1))}><ArrowDown size={15}/>Move down</button></div><button className="button small danger-action" aria-label="Remove moment" onClick={deleteMoment}><Trash2 size={15}/>Remove</button></div>
          {preview ? <div className="editor-preview"><span className="eyebrow">{draft.copy[({ prayer: 'categoryPrayer', hymn: 'categoryHymn', reading: 'categoryReading', ceremony: 'categoryCeremony' } as const)[section.category]]}</span><h3>{section.title}</h3>{section.posture && <div className="posture">{draft.copy.congregationLabel}: {section.posture}</div>}<ContentText content={section.content}/></div> : <div className="edit-form">
            <label htmlFor={`${id}-section-title`}>Section title</label><input id={`${id}-section-title`} maxLength={160} value={section.title} onChange={event => updateSection({ title: event.target.value })}/>
            <div className="form-columns"><div><label htmlFor={`${id}-category`}>Category</label><select id={`${id}-category`} value={section.category} onChange={event => updateSection({ category: event.target.value as CeremonySection['category'] })}><option value="prayer">Prayer</option><option value="hymn">Hymn & music</option><option value="reading">Reading</option><option value="ceremony">Ceremony</option></select></div><div><label htmlFor={`${id}-posture`}>Congregation cue</label><input id={`${id}-posture`} maxLength={80} placeholder="e.g. STAND" value={section.posture} onChange={event => updateSection({ posture: event.target.value })}/></div></div>
            <label htmlFor={`${id}-content`}>Prayer, reading, or hymn text</label><textarea id={`${id}-content`} className="content-editor" rows={13} maxLength={60000} value={section.content} onChange={event => updateSection({ content: event.target.value })}/><p className="field-help">Keep hymn line breaks. Use a blank line between verses. “Everyone:” and “[ALL]” highlight the congregation’s response.</p>
            <label htmlFor={`${id}-chapter`}>Ceremony chapter</label><select id={`${id}-chapter`} value={section.chapter} onChange={event => setDraft(current => changeMomentChapter(current, selected, event.target.value))}>{draft.chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title || 'Untitled chapter'}</option>)}</select>
            <label htmlFor={`${id}-number`}>Display number</label><input id={`${id}-number`} type="number" min={1} max={9999999} value={section.number} onChange={event => { const number = event.currentTarget.valueAsNumber; if (Number.isSafeInteger(number) && number > 0 && number <= 9999999) updateSection({ number }) }}/>
            <p className="field-help">Moving or removing moments renumbers the ceremony. Set a custom number here, or <button className="inline-action" onClick={() => setDraft(current => renumberMoments(current))}>renumber all moments</button>.</p>
          </div>}
        </> : selected === '@website' ? <WebsiteTextEditor document={draft} onChange={setDraft}/> : selected === '@chapters' ? <ChapterEditor document={draft} onChange={setDraft}/> : <div className="edit-form settings-form"><span className="eyebrow">MAKE IT YOURS</span><h3>Welcome & words of thanks</h3>
          <div className="form-columns"><div><label htmlFor={`${id}-first`}>First name</label><input id={`${id}-first`} maxLength={80} value={draft.couple.firstName} onChange={event => setDraft({ ...draft, couple: { ...draft.couple, firstName: event.target.value } })}/></div><div><label htmlFor={`${id}-second`}>Second name</label><input id={`${id}-second`} maxLength={80} value={draft.couple.secondName} onChange={event => setDraft({ ...draft, couple: { ...draft.couple, secondName: event.target.value } })}/></div></div>
          <label htmlFor={`${id}-eyebrow`}>Welcome label</label><input id={`${id}-eyebrow`} maxLength={120} value={draft.intro.eyebrow} onChange={event => setDraft({ ...draft, intro: { ...draft.intro, eyebrow: event.target.value } })}/>
          <label htmlFor={`${id}-welcome-title`}>Welcome title</label><input id={`${id}-welcome-title`} maxLength={160} value={draft.intro.title} onChange={event => setDraft({ ...draft, intro: { ...draft.intro, title: event.target.value } })}/>
          <label htmlFor={`${id}-welcome-message`}>Welcome message</label><textarea id={`${id}-welcome-message`} rows={3} maxLength={4000} value={draft.intro.message} onChange={event => setDraft({ ...draft, intro: { ...draft.intro, message: event.target.value } })}/>
          <label htmlFor={`${id}-thanks-title`}>Thank-you title</label><input id={`${id}-thanks-title`} maxLength={160} value={draft.closing.title} onChange={event => setDraft({ ...draft, closing: { ...draft.closing, title: event.target.value } })}/>
          <label htmlFor={`${id}-thanks-message`}>Thank-you message</label><textarea id={`${id}-thanks-message`} rows={7} maxLength={10000} value={draft.closing.message} onChange={event => setDraft({ ...draft, closing: { ...draft.closing, message: event.target.value } })}/>
        </div>}
      </fieldset>
    </div>
    <footer className="editor-footer"><div className="editor-status">{error ? <p className="form-error" role="alert">{error}</p> : success ? <p className="success-message" role="status"><Check size={15}/>{success}</p> : <><span><FileText size={14}/>{dirty ? 'Unpublished changes' : 'All changes saved'}</span><small>{dirty ? draftStatus || 'Saving your draft…' : `Last ${isShared ? 'published' : 'saved'}: ${dateLabel}`}</small></>}</div><div className="editor-actions"><button className="icon-button" aria-label="Download draft backup" title="Download draft backup" onClick={download}><Download size={18}/></button><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => close(true)} disabled={busy}><LogOut size={18}/></button><button className="button primary" onClick={() => void save()} disabled={busy || !dirty || (newer && dirty)}>{busy ? 'Saving…' : isShared ? 'Publish changes' : 'Save preview'}{isShared ? <BookOpen size={16}/> : <Save size={16}/>}</button></div></footer>
  </Dialog>
}
