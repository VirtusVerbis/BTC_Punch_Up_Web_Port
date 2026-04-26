import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BG4_SIGN_FRAMES,
  BG4_SIGN_FRAME_DELAY_MS,
  BG4_SIGN_MARGIN_X_FRACTION,
  BG4_SIGN_ROW_Y_FRACTIONS,
  BG4_SIGN_SIZE_DP,
  BG4_SIGN_SPAWN_INTERVAL_MS,
} from './androidMirrorConstants'

export interface Bg4SignSpawn {
  id: number
  xPx: number
  yPx: number
  frameIndex: number
  rowIndex: number
}

export interface Bg4SignState {
  signSpawns: Bg4SignSpawn[]
  signSizePx: number
}

interface UseBg4SignStateParams {
  sceneWidthPx: number
  sceneHeightPx: number
  ringIndex: number
  koKnockedDown: boolean
  bg3FlashSpawnCount: number
  bg3AudienceFlashUntilMs: number
}

/** Android-style bg4 signs: wave spawns, one-per-row occupancy; paused while bg3 flash is active. */
export const useBg4SignState = ({
  sceneWidthPx,
  sceneHeightPx,
  ringIndex,
  koKnockedDown,
  bg3FlashSpawnCount,
  bg3AudienceFlashUntilMs,
}: UseBg4SignStateParams): Bg4SignState => {
  const [signSpawns, setSignSpawns] = useState<Bg4SignSpawn[]>([])
  const nextIdRef = useRef(1)
  const lastRingRef = useRef(ringIndex)
  const bg3SpawnCountRef = useRef(0)
  const bg3AudienceUntilRef = useRef(0)

  useLayoutEffect(() => {
    bg3SpawnCountRef.current = bg3FlashSpawnCount
    bg3AudienceUntilRef.current = bg3AudienceFlashUntilMs
  }, [bg3FlashSpawnCount, bg3AudienceFlashUntilMs])

  const bg3PausesBg4 = (): boolean =>
    bg3SpawnCountRef.current > 0 || Date.now() < bg3AudienceUntilRef.current

  const signSizePx = useMemo(() => (BG4_SIGN_SIZE_DP * sceneWidthPx) / 360, [sceneWidthPx])

  useEffect(() => {
    if (ringIndex === lastRingRef.current) return
    lastRingRef.current = ringIndex
    setSignSpawns([])
  }, [ringIndex])

  useEffect(() => {
    const spawnId = window.setInterval(() => {
      setSignSpawns((prev) => {
        if (koKnockedDown || sceneWidthPx <= 0 || sceneHeightPx <= 0 || bg3PausesBg4()) return prev
        const occupiedRows = new Set(prev.map((s) => s.rowIndex))
        const availableRows = BG4_SIGN_ROW_Y_FRACTIONS.map((_, i) => i).filter((i) => !occupiedRows.has(i))
        const requestedCount = Math.floor(Math.random() * 3) + 1
        const count = Math.min(requestedCount, availableRows.length)
        if (count <= 0) return prev

        const shuffled = [...availableRows].sort(() => Math.random() - 0.5)
        const chosenRows = shuffled.slice(0, count)
        const marginPx = sceneWidthPx * BG4_SIGN_MARGIN_X_FRACTION
        const minX = marginPx
        const maxX = Math.max(minX, sceneWidthPx - marginPx)

        const newSigns: Bg4SignSpawn[] = chosenRows.map((rowIndex) => {
          const id = nextIdRef.current++
          const xPx = minX + (maxX - minX) * Math.random()
          const yPx = sceneHeightPx * BG4_SIGN_ROW_Y_FRACTIONS[rowIndex]
          return { id, xPx, yPx, frameIndex: 0, rowIndex }
        })
        return prev.concat(newSigns)
      })
    }, BG4_SIGN_SPAWN_INTERVAL_MS)

    const frameId = window.setInterval(() => {
      setSignSpawns((prev) => {
        if (bg3PausesBg4()) return prev
        return prev
          .map((s) => ({ ...s, frameIndex: s.frameIndex + 1 }))
          .filter((s) => s.frameIndex < BG4_SIGN_FRAMES)
      })
    }, BG4_SIGN_FRAME_DELAY_MS)

    return () => {
      window.clearInterval(spawnId)
      window.clearInterval(frameId)
    }
  }, [koKnockedDown, sceneWidthPx, sceneHeightPx])

  useEffect(() => {
    // #region agent log
    const bg3Paused = bg3FlashSpawnCount > 0 || Date.now() < bg3AudienceFlashUntilMs
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H1', location: 'useBg4SignState.ts:agentLog', message: 'bg4 spawn lifecycle', data: { count: signSpawns.length, rows: signSpawns.map((s) => s.rowIndex), frames: signSpawns.map((s) => s.frameIndex), ringIndex, koKnockedDown, bg3FlashSpawnCount, bg3AudienceFlashUntilMs, bg3Paused, signDelayMs: BG4_SIGN_FRAME_DELAY_MS, spawnIntervalMs: BG4_SIGN_SPAWN_INTERVAL_MS }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [signSpawns, ringIndex, koKnockedDown, bg3FlashSpawnCount, bg3AudienceFlashUntilMs])

  return { signSpawns, signSizePx }
}
