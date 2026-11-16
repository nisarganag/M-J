import { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/cormorant-garamond/latin-400-italic.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import './styles.css'
import App from './App'
import { loadConfig } from './lib/config'

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <main className="boot-screen"><h1>Let’s turn the page.</h1><p>The ceremony couldn’t be displayed. Please reload to try again.</p><button className="button primary" onClick={() => location.reload()}>Reload ceremony</button></main> : this.props.children
  }
}

const root = createRoot(document.getElementById('root')!)
root.render(<div className="boot-screen" role="status"><span className="boot-monogram">M & J</span><p>Gathering our words of love…</p></div>)
void loadConfig().then(config => root.render(<ErrorBoundary><App config={config}/></ErrorBoundary>))
