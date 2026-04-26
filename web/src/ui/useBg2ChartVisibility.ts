import { useEffect, useState } from 'react'
import { BG2_SHOW_INTERVAL_MS, BG2_VISIBLE_DURATION_MS } from './androidMirrorConstants'

/** Periodic candle chart visibility (Android BG2 `MainActivity` LaunchedEffect); pauses when tab hidden (`isVisible` parity). */
export const useBg2ChartVisible = (): boolean => {
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!tabVisible) {
      setVisible(false)
      return
    }

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
        await delay(BG2_SHOW_INTERVAL_MS)
        if (cancelled) break
        setVisible(true)
        await delay(BG2_VISIBLE_DURATION_MS)
        if (cancelled) break
        setVisible(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId)
    }
  }, [tabVisible])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H7', location: 'useBg2ChartVisibility.ts:agentLog', message: 'bg2 visibility toggle', data: { visible, tabVisible, showIntervalMs: BG2_SHOW_INTERVAL_MS, visibleDurationMs: BG2_VISIBLE_DURATION_MS }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [visible, tabVisible])

  return visible
}
