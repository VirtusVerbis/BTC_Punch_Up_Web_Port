import { useEffect, useRef, useState } from 'react'
import { BG2_MEME_CYCLE_FRAMES, BG2_MEME_FRAME_DELAY_MS, BG2_NEO_TOGGLE_INTERVAL_MS } from './androidMirrorConstants'

export interface Bg2MemeState {
  frame: number
  showNeo: boolean
}

/** Drives bg2 meme animation during bg2 visibility windows. */
export const useBg2MemeState = (visible: boolean): Bg2MemeState => {
  const [frame, setFrame] = useState(1)
  const [showNeo, setShowNeo] = useState(false)
  const neoAtRef = useRef<number>(Date.now() + BG2_NEO_TOGGLE_INTERVAL_MS)

  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => {
      setFrame((f) => (f % BG2_MEME_CYCLE_FRAMES) + 1)
    }, BG2_MEME_FRAME_DELAY_MS)
    return () => window.clearInterval(id)
  }, [visible])

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now()
      if (now >= neoAtRef.current) {
        setShowNeo((v) => !v)
        neoAtRef.current = now + BG2_NEO_TOGGLE_INTERVAL_MS
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!visible && !showNeo) return
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H3', location: 'useBg2MemeState.ts:41', message: 'bg2 meme visibility/frame', data: { visible, frame, showNeo, frameDelayMs: BG2_MEME_FRAME_DELAY_MS, cycleFrames: BG2_MEME_CYCLE_FRAMES, neoIntervalMs: BG2_NEO_TOGGLE_INTERVAL_MS }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [visible, frame, showNeo])

  return { frame, showNeo }
}
