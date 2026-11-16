import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, X } from 'lucide-react'
import { Dialog } from './Dialog'
import { OliveBranch } from './BotanicalArt'
import type { Credentials } from '../lib/api'

export function LoginDialog({ isShared, onLogin, onClose }: { isShared: boolean; onLogin: (credentials: Credentials) => Promise<void>; onClose: () => void }) {
  const id = useId()
  const [username, setUsername] = useState(''), [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await onLogin({ username: username.trim(), password }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to sign in.'); setBusy(false) }
  }
  return <Dialog labelledBy={`${id}-title`} onClose={() => { if (!busy) onClose() }} className="login-dialog">
    <button className="icon-button dialog-close" aria-label="Close sign in" onClick={onClose} disabled={busy}><X size={20}/></button>
    <OliveBranch className="login-branch"/>
    <span className="eyebrow">A LITTLE BEHIND THE SCENES</span>
    <h2 id={`${id}-title`}>Care for the ceremony.</h2>
    <p className="dialog-description">Sign in to edit the prayers, hymns, and words that make this celebration yours.</p>
    <form onSubmit={submit}>
      <label htmlFor={`${id}-username`}>Username</label>
      <input id={`${id}-username`} autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} value={username} onChange={e => setUsername(e.target.value)} autoFocus/>
      <label htmlFor={`${id}-password`}>Password</label>
      <div className="password-field"><input id={`${id}-password`} type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)}/><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={17}/></button>
    </form>
    <p className="login-footnote"><LockKeyhole size={13}/>{isShared ? 'Edits are published to your shared ceremony.' : 'Preview only · changes stay on this device.'}</p>
  </Dialog>
}
