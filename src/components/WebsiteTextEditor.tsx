import { useId, useState, type ChangeEvent } from 'react'
import { Search } from 'lucide-react'
import type { CeremonyDocument } from '../lib/ceremony'
import { COPY_FIELDS, type CopyKey } from '../lib/site-copy'

export function WebsiteTextEditor({ document, onChange }: { document: CeremonyDocument; onChange: (document: CeremonyDocument) => void }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const keys = Object.keys(COPY_FIELDS) as CopyKey[]
  const groups = [...new Set(keys.map(key => COPY_FIELDS[key].group))]
  const [visible, setVisible] = useState<CopyKey[]>(keys)
  function findFields(nextQuery: string, nextArea: string) {
    setQuery(nextQuery); setArea(nextArea)
    const search = nextQuery.trim().toLocaleLowerCase()
    // Keep the chosen fields in place while their text is being rewritten.
    setVisible(keys.filter(key => (nextArea === 'all' || COPY_FIELDS[key].group === nextArea) && (!search || `${COPY_FIELDS[key].label} ${COPY_FIELDS[key].group} ${document.copy[key]}`.toLocaleLowerCase().includes(search))))
  }
  return <div className="edit-form settings-form website-text-editor">
    <span className="eyebrow">EVERY WORD IS YOURS</span><h3>Website text</h3>
    <p className="field-help">Edit the wording around your ceremony, from the welcome card to the footer. Clear optional text to remove it. Button labels must stay readable.</p>
    <div className="copy-search"><label htmlFor={`${id}-search`}><Search size={14}/>Find website text</label><input id={`${id}-search`} type="search" placeholder="Search headings, quotes, labels…" value={query} onChange={event => findFields(event.target.value, area)}/></div>
    <label htmlFor={`${id}-area`}>Text area</label><select id={`${id}-area`} value={area} onChange={event => findFields(query, event.target.value)}><option value="all">Every area</option>{groups.map(group => <option key={group}>{group}</option>)}</select>
    {groups.map(group => {
      const fields = visible.filter(key => COPY_FIELDS[key].group === group)
      if (!fields.length) return null
      return <section className="copy-group" key={group} aria-label={group}>
        <h4>{group}</h4>
        {fields.map(key => {
          const spec = COPY_FIELDS[key]
          const props = { id: `${id}-${key}`, value: document.copy[key], maxLength: spec.max, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...document, copy: { ...document.copy, [key]: event.target.value } }) }
          return <div key={key}><label htmlFor={props.id}>{spec.label}</label>{spec.multiline ? <textarea {...props} rows={3}/> : <input {...props}/>}</div>
        })}
      </section>
    })}
    {!visible.length && <p className="field-help" role="status">No text fields match. Try another word or choose every area.</p>}
  </div>
}
