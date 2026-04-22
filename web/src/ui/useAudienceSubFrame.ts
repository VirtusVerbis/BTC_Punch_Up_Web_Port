import { useEffect, useState } from 'react'
import { AUDIENCE_FRAME_DELAY_MS } from './androidMirrorConstants'

/** Cycles 0 → 1 → 2 → 0 like Android audience layer within a ring set. */
export const useAudienceSubFrame = (): number => {
  const [sub, setSub] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => {
      setSub((s) => (s + 1) % 3)
    }, AUDIENCE_FRAME_DELAY_MS)
    return () => window.clearInterval(id)
  }, [])
  return sub
}
