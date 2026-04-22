import { useEffect, useRef, useState } from 'react'
import { RING_ROTATE_FREQUENCY_MS, RING_ROTATION_FRAME_DELAY_MS } from './androidMirrorConstants'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Mirrors Android timer-driven ring rotation (`TEST_RING_ROTATION = true`):
 * every `RING_ROTATE_FREQUENCY_MS`, animates `ring_1`…`ring_7`, then returns to `ring_0`.
 */
export const useRingRotation = (koLockedUntil: number): number => {
  const [ringIndex, setRingIndex] = useState(0)
  const koRef = useRef(koLockedUntil)
  koRef.current = koLockedUntil

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      while (!cancelled) {
        await delay(RING_ROTATE_FREQUENCY_MS)
        if (cancelled) break
        if (Date.now() < koRef.current) continue

        const right = Math.random() < 0.5
        const seq = right ? [1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1]
        for (const f of seq) {
          if (cancelled) break
          if (Date.now() < koRef.current) {
            setRingIndex(0)
            break
          }
          setRingIndex(f)
          await delay(RING_ROTATION_FRAME_DELAY_MS)
        }
        if (!cancelled && Date.now() >= koRef.current) setRingIndex(0)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return ringIndex
}
