import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowRight, BookOpen, Check, ChevronDown, Heart, Music2, Search, Sparkles, X } from 'lucide-react'
import { filterSections, type CeremonyDocument, type Category, type Filter } from '../lib/ceremony'
import type { CopyKey } from '../lib/site-copy'
import { ContentText } from './ContentText'
import { OliveBranch } from './BotanicalArt'

const icons = { hymn: Music2, prayer: Sparkles, reading: BookOpen, ceremony: Heart }
const labels: Record<Category, CopyKey> = { hymn: 'categoryHymn', prayer: 'categoryPrayer', reading: 'categoryReading', ceremony: 'categoryCeremony' }
const filters: { id: Filter; label: CopyKey }[] = [{ id: 'all', label: 'filterAll' }, { id: 'prayer', label: 'filterPrayer' }, { id: 'hymn', label: 'filterHymn' }, { id: 'reading', label: 'filterReading' }, { id: 'ceremony', label: 'filterCeremony' }]

export function CeremonyReader({ document: ceremony, filter, setFilter }: { document: CeremonyDocument; filter: Filter; setFilter: (filter: Filter) => void }) {
  const [query, setQuery] = useState('')
  const { copy, chapters } = ceremony
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ceremony.sections[0] ? [ceremony.sections[0].id] : []))
  const [activeChapter, setActiveChapter] = useState(chapters[0]?.id || '')
  const [size, setSize] = useState(0)
  const visible = useMemo(() => filterSections(ceremony.sections, filter, query), [ceremony.sections, filter, query])
  const allExpanded = visible.length > 0 && visible.every(section => expanded.has(section.id))

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const target = entries.find(entry => entry.isIntersecting)
      if (target) setActiveChapter(target.target.id.replace('chapter-', ''))
    }, { rootMargin: '-15% 0px -65% 0px' })
    document.querySelectorAll('.chapter').forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [visible])

  function toggle(id: string) {
    setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function clearFilters() { setQuery(''); setFilter('all') }
  function jump(chapter: string) {
    clearFilters(); setActiveChapter(chapter)
    requestAnimationFrame(() => document.getElementById(`chapter-${chapter}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }))
  }

  return <section id="ceremony" className="ceremony-section" aria-label={copy.navCeremony}>
    <div className="section-intro">{copy.readerEyebrow && <span className="eyebrow">{copy.readerEyebrow}</span>}{(copy.readerTitle || copy.readerTitleEmphasis) && <h2 id="ceremony-title">{copy.readerTitle} <em>{copy.readerTitleEmphasis}</em></h2>}{copy.readerDescription && <p>{copy.readerDescription}</p>}<OliveBranch className="section-branch"/></div>
    <div className="ceremony-layout">
      <aside className="service-sidebar" aria-label="Ceremony chapters">
        <div className="sidebar-inner">{copy.sidebarTitle && <span className="eyebrow sidebar-label">{copy.sidebarTitle}</span>}
          <nav>{chapters.filter(chapter => ceremony.sections.some(section => section.chapter === chapter.id)).map(chapter => <button key={chapter.id} onClick={() => jump(chapter.id)} className={`chapter-link ${activeChapter === chapter.id ? 'active' : ''}`} aria-current={activeChapter === chapter.id ? 'location' : undefined}>{chapter.numeral && <span className="chapter-roman">{chapter.numeral}</span>}<span>{chapter.title}</span><ArrowRight size={14}/></button>)}</nav>
          {(copy.participationMessage || copy.participationCaption) && <div className="participation-note"><span className="small-cross" aria-hidden="true">✝</span>{copy.participationMessage && <p>{copy.participationMessage}</p>}{copy.participationCaption && <span>{copy.participationCaption}</span>}</div>}
          <div className="reading-key">{copy.responsesHelp && <span><Check size={12}/>{copy.responsesHelp}</span>}{copy.hymnsHelp && <span><Music2 size={12}/>{copy.hymnsHelp}</span>}</div>
        </div>
      </aside>
      <div className="service-main" style={{ '--reading-scale': 1 + size * .12 } as CSSProperties}>
        <div className="reader-controls">
          <div className="filter-row" role="group" aria-label="Filter ceremony">{filters.map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={filter === item.id ? 'filter active' : 'filter'}>{copy[item.label]}</button>)}</div>
          <div className="search-row"><div className="search-field"><Search size={18}/><input aria-label="Search the ceremony" type="search" placeholder={copy.searchPlaceholder} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="Clear search"><X size={16}/></button>}</div>
            <div className="type-controls" role="group" aria-label="Reading size"><button aria-label="Decrease reading size" onClick={() => setSize(Math.max(0, size - 1))} disabled={size === 0}>A<span>−</span></button><span aria-hidden="true"/><button aria-label="Increase reading size" onClick={() => setSize(Math.min(3, size + 1))} disabled={size === 3}>A<span>+</span></button></div>
          </div>
          <div className="results-row"><span aria-live="polite">{visible.length} {visible.length === 1 ? copy.momentSingular : copy.momentPlural} {query || filter !== 'all' ? copy.resultsSelection : copy.resultsCelebration}</span><button disabled={!visible.length} onClick={() => setExpanded(allExpanded ? new Set() : new Set(visible.map(s => s.id)))}>{allExpanded ? copy.collapseAll : copy.expandAll}<ChevronDown size={13}/></button></div>
        </div>
        {!visible.length && <div className="empty-state"><Search size={26}/><h3>{ceremony.sections.length ? copy.emptyTitle : copy.emptyCeremonyTitle}</h3><p>{ceremony.sections.length ? copy.emptyMessage : copy.emptyCeremonyMessage}</p>{ceremony.sections.length > 0 && <button className="button secondary" onClick={clearFilters}>{copy.clearFilters}<ArrowRight size={15}/></button>}</div>}
        {chapters.map(chapter => {
          const sections = visible.filter(section => section.chapter === chapter.id)
          if (!sections.length) return null
          return <section className="chapter" id={`chapter-${chapter.id}`} key={chapter.id} aria-labelledby={`${chapter.id}-heading`}>
            <div className="chapter-heading">{chapter.numeral && <span className="chapter-number">{chapter.numeral}</span>}<div>{chapter.caption && <span className="eyebrow">{chapter.caption}</span>}<h3 id={`${chapter.id}-heading`}>{chapter.title}</h3></div><span className="chapter-line"/></div>
            <div className="ceremony-cards">{sections.map(section => {
              const Icon = icons[section.category], open = expanded.has(section.id)
              return <article className={`ceremony-card ${open ? 'expanded' : ''}`} key={section.id} id={section.id}>
                <h4><button className="ceremony-toggle" aria-expanded={open} aria-controls={`body-${section.id}`} onClick={() => toggle(section.id)}><span className="moment-number">{String(section.number).padStart(2, '0')}</span><span className="moment-heading"><span className="moment-category"><Icon size={12}/>{copy[labels[section.category]]}</span><span className="moment-title">{section.title}</span></span><ChevronDown className="toggle-chevron" size={18}/></button></h4>
                <div id={`body-${section.id}`} hidden={!open} className="section-body">
                  {section.posture && <div className="posture"><span className="posture-dot"/>{copy.congregationLabel}: {section.posture}</div>}
                  <ContentText content={section.content}/>
                  <div className="section-ending"><span/><span aria-hidden="true">✦</span><span/></div>
                </div>
              </article>
            })}</div>
          </section>
        })}
        {visible.length > 0 && copy.ceremonyEnd && <a href="#thanks" className="ceremony-end"><Heart size={16}/><span>{copy.ceremonyEnd}</span><ArrowDown size={14}/></a>}
      </div>
    </div>
  </section>
}
