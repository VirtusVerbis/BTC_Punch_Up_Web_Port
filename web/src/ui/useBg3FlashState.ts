import { useEffect, useState } from 'react'
import { BG3_FLASH_BURST_INTERVAL_MS, BG3_FLASH_FRAME_COUNT, BG3_FLASH_FRAME_DELAY_MS } from './androidMirrorConstants'

export interface Bg3FlashState {
  flashFrame: number | null
  showAudienceFlash: boolean
}

/** Periodic burst flash sequence (0..N-1), then idle. */
export const useBg3FlashState = (): Bg3FlashState => {
  const [flashFrame, setFlashFrame] = useState<number | null>(null)

  useEffect(() => {
    let running = false

    const runBurst = () => {
      if (running) return
      running = true
      setFlashFrame(0)
      let frame = 0
      const id = window.setInterval(() => {
        frame += 1
        if (frame >= BG3_FLASH_FRAME_COUNT) {
          window.clearInterval(id)
          setFlashFrame(null)
          running = false
          return
        }
        setFlashFrame(frame)
      }, BG3_FLASH_FRAME_DELAY_MS)
    }

    runBurst()
    const burstId = window.setInterval(runBurst, BG3_FLASH_BURST_INTERVAL_MS)
    return () => window.clearInterval(burstId)
  }, [])

  useEffect(() => {
    if (flashFrame !== 0 && flashFrame !== null) return
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H2', location: 'useBg3FlashState.ts:43', message: 'bg3 flash gate', data: { flashFrame, showAudienceFlash: flashFrame !== null, burstIntervalMs: BG3_FLASH_BURST_INTERVAL_MS, frameDelayMs: BG3_FLASH_FRAME_DELAY_MS, frameCount: BG3_FLASH_FRAME_COUNT }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [flashFrame])

  return { flashFrame, showAudienceFlash: flashFrame !== null }
}
