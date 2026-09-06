import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Keep the growing library from retaining a WebGL context for every offscreen card.
export function VisiblePreview({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' })
    observer.observe(host.current!)
    return () => observer.disconnect()
  }, [])
  return <div ref={host} className="canvas-shell" data-preview-visible={visible}>{visible && children}</div>
}
