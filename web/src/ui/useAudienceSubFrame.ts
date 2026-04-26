import { useEffect, useState } from 'react'
import { AUDIENCE_FRAME_DELAY_MS } from './androidMirrorConstants'

/**
 * Cycles 0 → 1 → 2 → 0 like Android audience layer within a ring set.
 * Pauses while the document is hidden (Android `LaunchedEffect(isVisible)` parity).
 */
export const useAudienceSubFrame = (): number => {
  const [sub, setSub] = useState(0)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    let intervalId: ReturnType<typeof window.setInterval> | undefined

    const clear = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
        intervalId = undefined
      }
    }

    const start = () => {
      clear()
      intervalId = window.setInterval(() => {
        setSub((s) => (s + 1) % 3)
      }, AUDIENCE_FRAME_DELAY_MS)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        start()
      } else {
        clear()
      }
    }

    if (document.visibilityState === 'visible') {
      start()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clear()
    }
  }, [])

  return sub
}
