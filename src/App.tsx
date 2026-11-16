import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Check, Copy, Heart, LockKeyhole, Menu, PenLine, Printer, Share2, X } from 'lucide-react'
import { BotanicalArt, OliveBranch } from './components/BotanicalArt'
import { CeremonyReader } from './components/CeremonyReader'
import { LoginDialog } from './components/LoginDialog'
import { Editor } from './components/Editor'
import { Dialog } from './components/Dialog'
import { useCeremony } from './hooks/useCeremony'
import type { Credentials } from './lib/api'
import type { Filter } from './lib/ceremony'
import type { SiteConfig } from './lib/config'

export default function App({ config }: { config: SiteConfig }) {
  const ceremony = useCeremony(config)
  const { document } = ceremony.published
  const [filter, setFilter] = useState<Filter>('all')
  const [loginOpen, setLoginOpen] = useState(false), [editorOpen, setEditorOpen] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [menuOpen, setMenuOpen] = useState(false), [toast, setToast] = useState(''), [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const names = `${document.couple.firstName} & ${document.couple.secondName}`
  const initials = `${document.couple.firstName[0]} & ${document.couple.secondName[0]}`

  useEffect(() => { window.document.title = `${names} — Our Wedding Celebration` }, [names])
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) } }, [toast])
  function openAdmin() { if (credentials) setEditorOpen(true); else setLoginOpen(true) }
  async function signIn(value: Credentials) { await ceremony.login(value); setCredentials(value); setLoginOpen(false); setEditorOpen(true) }
  async function share() {
    const url = `${location.origin}${location.pathname}#ceremony`
    try { await navigator.clipboard.writeText(url); setToast('Ceremony link copied. Share it with someone you love.') }
    catch { setShareUrl(url); setCopied(false) }
  }

  return <div className="site-shell" data-revision={ceremony.published.revision}>
    <a className="skip-link" href="#ceremony">Skip to the ceremony</a>
    <header className="site-header">
      <a href="#home" className="brand" aria-label={`${names}, back to the beginning`}><span className="brand-monogram">{initials}</span><span className="brand-caption">TOGETHER IN HIS LOVE</span></a>
      <nav className={menuOpen ? 'header-nav open' : 'header-nav'} aria-label="Main navigation"><a href="#home" onClick={() => setMenuOpen(false)}>Our celebration</a><a href="#ceremony" onClick={() => { setFilter('all'); setMenuOpen(false) }}>The ceremony</a><a href="#thanks" onClick={() => setMenuOpen(false)}>With gratitude</a></nav>
      <div className="header-actions"><button className="admin-button" onClick={openAdmin}>{credentials ? <PenLine size={14}/> : <LockKeyhole size={14}/>}<span>{credentials ? 'Edit ceremony' : 'Admin'}</span></button><button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button></div>
    </header>
    <main>
      <section className="hero" id="home" aria-labelledby="couple-names">
        <div className="hero-copy"><span className="hero-topline"><span/>{document.intro.eyebrow}</span><h1 id="couple-names" aria-label={names}>{document.couple.firstName}<span className="second-name"><em>&</em> {document.couple.secondName}</span></h1><p className="hero-blessing">{document.intro.title}</p><p className="hero-description">{document.intro.message}</p><div className="hero-actions"><a className="button primary" href="#ceremony" onClick={() => setFilter('all')}>Follow the ceremony<ArrowDown size={16}/></a><a className="text-link" href="#ceremony" onClick={() => setFilter('hymn')}>Explore the hymns<ArrowRight size={15}/></a></div><div className="hero-footnote"><span/><Heart size={12}/><span>ONE LOVE. ONE FAITH. ONE BEAUTIFUL BEGINNING.</span></div></div>
        <div className="hero-art" aria-hidden="true"><div className="keepsake-shadow"/><div className="keepsake"><div className="keepsake-inner"><span className="art-cross">✝</span><span className="art-eyebrow">BY GRACE, TOGETHER</span><div className="art-monogram">{document.couple.firstName[0]}<em>&</em>{document.couple.secondName[0]}</div><span className="art-caption">a love to last<br/><em>a lifetime</em></span></div><BotanicalArt className="hero-botanical"/></div><span className="keepsake-note">our forever starts here</span><span className="art-sparkle sparkle-one">✧</span><span className="art-sparkle sparkle-two">✧</span></div>
      </section>
      <div className="scripture-strip"><OliveBranch/><div><p>“Love is patient, <em>love is kind.</em>”</p><span>1 CORINTHIANS 13:4</span></div><OliveBranch/></div>
      <div className="guest-toolbar"><span><BookMarkIcon/>An order of service, shared with love.</span><div><button onClick={() => void share()}><Share2 size={14}/>Share</button><button onClick={() => window.print()}><Printer size={14}/>Print service</button></div></div>
      {ceremony.status === 'offline' && <div className="offline-note" role="status">You’re viewing {ceremony.published.revision > 0 ? 'a saved copy' : 'the original ceremony'} while we reconnect.<button onClick={() => void ceremony.refresh()}>Refresh</button></div>}
      <CeremonyReader document={document} filter={filter} setFilter={setFilter}/>
      <section className="thanks-section" id="thanks" aria-labelledby="thanks-title"><div className="thanks-ornament"><span/><Heart size={22} strokeWidth={1}/><span/></div><span className="eyebrow">FROM OUR HEARTS TO YOURS</span><h2 id="thanks-title">{document.closing.title}</h2><div className="thanks-copy">{document.closing.message.split(/\n\s*\n/).map((paragraph, index) => <p className={paragraph.trim() === names ? 'couple-signature' : ''} key={index}>{paragraph}</p>)}</div><OliveBranch className="thanks-branch"/></section>
    </main>
    <footer className="site-footer"><a href="#home" className="footer-monogram">{initials}</a><p>A celebration of love, blessed by faith.</p><span>MADE TO BE CHERISHED</span></footer>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {loginOpen && <LoginDialog isShared={ceremony.isShared} onLogin={signIn} onClose={() => setLoginOpen(false)}/>}
    {editorOpen && credentials && <Editor published={ceremony.published} scope={ceremony.scope} isShared={ceremony.isShared} online={ceremony.status === 'online'} onPublish={(document, revision) => ceremony.publish(document, credentials, revision)} onRefresh={ceremony.refresh} onClose={() => setEditorOpen(false)} onLogout={() => { setCredentials(null); setEditorOpen(false); setToast('You have been signed out.') }}/>}
    {shareUrl && <Dialog className="share-dialog" labelledBy="share-title" onClose={() => setShareUrl('')}><button className="icon-button dialog-close" aria-label="Close sharing" onClick={() => setShareUrl('')}><X size={20}/></button><h2 id="share-title">Share the celebration.</h2><p>Copy this link to send our ceremony to your family and friends.</p><label htmlFor="ceremony-link">Ceremony link</label><input id="ceremony-link" value={shareUrl} readOnly onFocus={event => event.target.select()}/><button className="button primary" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { window.document.getElementById('ceremony-link')?.focus() } }}>{copied ? 'Copied' : 'Copy link'}<Copy size={15}/></button></Dialog>}
  </div>
}

function BookMarkIcon() { return <svg width="14" height="17" viewBox="0 0 14 17" fill="none" aria-hidden="true"><path d="M3 1.5h8v14l-4-3-4 3v-14Z" stroke="currentColor" strokeWidth="1.2"/></svg> }
