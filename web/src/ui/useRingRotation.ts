import { useEffect, useRef, useState } from 'react'
import { RING_ROTATE_FREQUENCY_MS, RING_ROTATION_FRAME_DELAY_MS } from './androidMirrorConstants'

/**
 * Mirrors Android timer-driven ring rotation (`TEST_RING_ROTATION = true`):
 * every `RING_ROTATE_FREQUENCY_MS`, animates `ring_1`…`ring_7`, then returns to `ring_0`.
 * Pauses when tab hidden (`isVisible` parity).
 */
export const useRingRotation = (koLockedUntil: number): number => {
  const [ringIndex, setRingIndex] = useState(0)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )
  const koRef = useRef(koLockedUntil)
  koRef.current = koLockedUntil

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
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId)
    }
  }, [tabVisible])

  return ringIndex
}
