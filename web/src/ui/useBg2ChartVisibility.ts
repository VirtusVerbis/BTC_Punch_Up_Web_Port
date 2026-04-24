import { useEffect, useState } from 'react'
import { BG2_SHOW_INTERVAL_MS, BG2_VISIBLE_DURATION_MS } from './androidMirrorConstants'

/** Periodic candle chart visibility (Android BG2). */
export const useBg2ChartVisible = (): boolean => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => {
      setVisible(true)
      window.setTimeout(() => setVisible(false), BG2_VISIBLE_DURATION_MS)
    }
    show()
    const id = window.setInterval(show, BG2_SHOW_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H7', location: 'useBg2ChartVisibility.ts:20', message: 'bg2 visibility toggle', data: { visible, showIntervalMs: BG2_SHOW_INTERVAL_MS, visibleDurationMs: BG2_VISIBLE_DURATION_MS }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [visible])

  return visible
}
