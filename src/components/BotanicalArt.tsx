import { useId } from 'react'

/** Original, resolution-independent floral illustration made for this site. */
export function BotanicalArt({ className = '' }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  return <svg className={className} viewBox="0 0 520 620" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b7be9c"/><stop offset="1" stopColor="#657b62"/></linearGradient>
      <radialGradient id={`${uid}-petal`}><stop stopColor="#c99c86"/><stop offset=".45" stopColor="#e8cbbb"/><stop offset="1" stopColor="#f6ede1"/></radialGradient>
      <g id={`${uid}-leaflet`}><path d="M0 0C-30-5-48-32-41-57C-13-58 5-27 0 0Z" fill={`url(#${uid}-leaf)`} fillOpacity=".85"/><path d="M0 0-35-49" stroke="#6c805f" strokeWidth=".7"/></g>
      <g id={`${uid}-sprig`} stroke="#7c8b6b" strokeWidth="1.4"><path d="M0 0C-17-55 4-117-4-189"/><use href={`#${uid}-leaflet`} transform="translate(-5 -28) rotate(-20) scale(.8)"/><use href={`#${uid}-leaflet`} transform="translate(-6 -59) rotate(87) scale(.82)"/><use href={`#${uid}-leaflet`} transform="translate(-4 -94) rotate(-7) scale(.65)"/><use href={`#${uid}-leaflet`} transform="translate(-2 -126) rotate(90) scale(.6)"/><use href={`#${uid}-leaflet`} transform="translate(-3 -150) rotate(18) scale(.5)"/></g>
      <g id={`${uid}-flower`} stroke="#bd9580" strokeWidth=".7">
        <path d="M0-15C-22-72-65-60-60-26C-102-18-82 23-52 30C-64 71-14 78 1 52C35 84 67 48 48 26C90 8 63-35 39-28C43-65 4-70 0-15Z" fill={`url(#${uid}-petal)`}/>
        <path d="M-26-16C-58-33-66 3-42 17C-52 43-18 53-7 34C14 63 44 32 31 13C59-6 26-32 12-22C5-48-24-44-26-16Z" fill="#eed8c8"/>
        <path d="M-24-8C-29 10-7 23 6 15C19 37 37 9 19-3C31-19 8-30-2-15C-13-33-35-22-24-8Z" fill="#dfb8a2"/>
        <path d="M-13-5C-15 7-1 16 8 8C18-1 7-15-2-7C-7-19-19-14-13-5Z" fill="#d2a58e"/>
        <path d="M-59-26Q-33-42-26-16M-52 30Q-31 33-23 15M1 52Q2 34-7 34M48 26Q30 27 31 13M39-28Q21-27 12-22M-3-7Q6-1 1 5"/>
      </g>
      <g id={`${uid}-bud`}><path d="M0 0C-24-10-16-40 0-43C19-35 24-10 0 0Z" fill="#ead3c0" stroke="#c4a08a" strokeWidth=".8"/><path d="M0 0Q-4-17 1-37M0 0-14-10M0 0 14-12" stroke="#8a9474"/></g>
    </defs>
    <g opacity=".38" stroke="#ad9365" strokeWidth="1"><path d="M69 403V230a191 191 0 0 1 382 0v173"/><path d="M79 399V230a181 181 0 0 1 362 0v169"/></g>
    <g opacity=".9">
      <use href={`#${uid}-sprig`} transform="translate(206 568) rotate(-47) scale(1.33)"/>
      <use href={`#${uid}-sprig`} transform="translate(266 556) rotate(-17) scale(1.35)"/>
      <use href={`#${uid}-sprig`} transform="translate(290 559) rotate(37) scale(1.3)"/>
      <use href={`#${uid}-sprig`} transform="translate(325 556) rotate(65) scale(1.12)"/>
      <use href={`#${uid}-sprig`} transform="translate(196 546) rotate(-75) scale(.95)"/>
      <path d="M250 575C184 442 115 421 83 302M269 580C328 470 400 419 424 303M234 571C169 501 82 509 45 433" stroke="#8a9273" strokeWidth="2"/>
      <use href={`#${uid}-bud`} transform="translate(84 312) rotate(-22) scale(.8)"/>
      <use href={`#${uid}-bud`} transform="translate(422 316) rotate(25) scale(.7)"/>
      <use href={`#${uid}-bud`} transform="translate(47 442) rotate(-52) scale(.7)"/>
      <use href={`#${uid}-flower`} transform="translate(162 464) rotate(-24) scale(.96)"/>
      <use href={`#${uid}-flower`} transform="translate(327 468) rotate(39) scale(.9)"/>
      <use href={`#${uid}-flower`} transform="translate(246 502) rotate(9) scale(1.12)"/>
      <use href={`#${uid}-sprig`} transform="translate(263 563) rotate(118) scale(.73)"/>
      <use href={`#${uid}-sprig`} transform="translate(236 562) rotate(-115) scale(.75)"/>
      <path d="M219 558Q254 573 285 557L278 576Q250 589 224 572Z" fill="#c2a17b"/><path d="M245 574Q207 590 203 619M259 577Q287 596 306 614" stroke="#c9ad8c" strokeWidth="15"/>
    </g>
    <g fill="#b29a6a" opacity=".75"><circle cx="104" cy="210" r="2"/><circle cx="405" cy="248" r="1.7"/><circle cx="391" cy="166" r="2.3"/><path d="m130 135 1.7 6 6 1.7-6 1.7-1.7 6-1.7-6-6-1.7 6-1.7ZM375 314l1.4 5 5 1.4-5 1.4-1.4 5-1.4-5-5-1.4 5-1.4Z"/></g>
  </svg>
}

export function OliveBranch({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 132 44" fill="none" aria-hidden="true"><path d="M8 33C44 20 79 24 124 11" stroke="currentColor"/><g fill="currentColor" opacity=".7"><path d="M25 28C10 24 11 14 11 14S27 15 25 28ZM41 25C29 15 33 6 33 6S47 13 41 25ZM59 23C50 12 56 4 56 4S68 14 59 23ZM81 21C75 8 83 3 83 3S90 15 81 21ZM101 16C99 6 109 1 109 1S113 12 101 16ZM31 27C33 39 47 39 47 39S45 28 31 27ZM52 24C55 35 68 36 68 36S65 25 52 24ZM74 22C82 34 93 29 93 29S87 19 74 22ZM96 18C104 27 116 23 116 23S107 15 96 18Z"/></g></svg>
}
