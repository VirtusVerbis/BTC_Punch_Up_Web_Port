import { useEffect, useRef, useState } from 'react'
import { RING_ROTATE_FREQUENCY_MS, RING_ROTATION_FRAME_DELAY_MS } from './androidMirrorConstants'

/**
 * Mirrors Android timer-driven ring rotation (`TEST_RING_ROTATION = true`):
 * every `RING_ROTATE_FREQUENCY_MS`, animates `ring_1`…`ring_7`, then returns to `ring_0`.
 * Pauses when tab hidden (`isVisible` parity).
 */
export const useRingRotation = (koPhaseActive: boolean): number => {
  const [ringIndex, setRingIndex] = useState(0)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )
  const koRef = useRef(koPhaseActive)
  koRef.current = koPhaseActive

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!tabVisible) return

    let cancelled = false
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = globalThis.setTimeout(() => {
          timeoutId = undefined
          resolve()
        }, ms)
      })

    // Mobile parity: when KO starts during ring timing, hold progress and resume from same point.
    const delayRespectKoPause = async (ms: number) => {
      let elapsed = 0
      while (!cancelled && elapsed < ms) {
        await delay(50)
        if (!koRef.current) elapsed += 50
      }
    }

    const run = async () => {
      while (!cancelled) {
        await delayRespectKoPause(RING_ROTATE_FREQUENCY_MS)
        if (cancelled) break

        const right = Math.random() < 0.5
        const seq = right ? [1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1]
        for (const f of seq) {
          if (cancelled) break
          setRingIndex(f)
          await delayRespectKoPause(RING_ROTATION_FRAME_DELAY_MS)
        }
        if (!cancelled) setRingIndex(0)
      }
    }

    void run()
    return () => {
      cancelled = true
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId)
    }
  }, [tabVisible])

  return ringIndex
}
