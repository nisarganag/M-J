export function ContentText({ content }: { content: string }) {
  let chorus = false
  return <div className="content-text">{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
    const cue = paragraph.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
    if (cue) {
      chorus = cue[1].toUpperCase().startsWith('ALL')
      return <div key={index} className={chorus ? 'text-block response' : 'text-block'}>
        <span className="voice-label">[{cue[1]}]</span>{cue[2] && <p>{cue[2]}</p>}
      </div>
    }
    const speaker = paragraph.match(/^(Priest|Everyone|Reader|Bride\/Groom|Bride|Groom):\s*([\s\S]*)$/)
    if (speaker) return <div key={index} className={`text-block ${speaker[1] === 'Everyone' ? 'response' : ''}`}><span className="voice-label">{speaker[1]}:</span><p>{speaker[2]}</p></div>
    const music = /^(Song:|Hymn:|Hymns:|Communion hymns:)/.test(paragraph)
    return <p className={`${chorus ? 'response' : ''} ${music ? 'music-caption' : ''}`} key={index}>{paragraph}</p>
  })}</div>
}
