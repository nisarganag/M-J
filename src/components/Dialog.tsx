import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ children, onClose, labelledBy, className = '' }: { children: ReactNode; onClose: () => void; labelledBy: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const dialog = ref.current!
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [])
  return <dialog ref={ref} className={className} aria-labelledby={labelledBy} onCancel={event => { event.preventDefault(); close.current() }}>{children}</dialog>
}
