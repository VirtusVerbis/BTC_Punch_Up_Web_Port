import { useEffect, useState } from 'react'
import {
  BG3_FLASH_AUDIENCE_DISPLAY_MS,
  BG3_FLASH_AUDIENCE_MIN_INTERVAL_MS,
  BG3_FLASH_FRAME_COUNT,
  BG3_FLASH_FRAME_DELAY_MS,
  BG3_FLASH_MAX_SPAWN_TOGETHER,
  BG3_FLASH_MAX_Y_FRACTION,
  BG3_FLASH_SIZE_DP,
  BG3_FLASH_SPAWN_COUNT_DEFAULT,
  BG3_FLASH_SPAWN_WAVE_DELAY_MS,
} from './androidMirrorConstants'

export interface Bg3FlashSpawn {
  id: number
  xPx: number
  yPx: number
  frameIndex: number
}

export interface Bg3FlashState {
  flashSpawns: Bg3FlashSpawn[]
  audienceFlashUntilMs: number
  flashSizePx: number
}

interface Bg3FlashStateArgs {
  flashActive: boolean
  sceneWidthPx: number
  sceneHeightPx: number
}

const overlaps = (a: Bg3FlashSpawn, b: Bg3FlashSpawn, sizePx: number): boolean =>
  Math.abs(a.xPx - b.xPx) < sizePx && Math.abs(a.yPx - b.yPx) < sizePx

/** Android-style bg3: KO-gated flash spawns + audience pulse. */
export const useBg3FlashState = ({
  flashActive,
  sceneWidthPx,
  sceneHeightPx,
}: Bg3FlashStateArgs): Bg3FlashState => {
  const [flashSpawns, setFlashSpawns] = useState<Bg3FlashSpawn[]>([])
  const [audienceFlashUntilMs, setAudienceFlashUntilMs] = useState(0)
  const [lastAudienceFlashAtMs, setLastAudienceFlashAtMs] = useState(0)
  const flashSizePx = BG3_FLASH_SIZE_DP

  useEffect(() => {
    if (!flashActive || sceneWidthPx <= 0 || sceneHeightPx <= 0) {
      setFlashSpawns([])
      return
    }
    let cancelled = false

    const runSpawnLoop = async () => {
      setFlashSpawns([])
      let spawned = 0
      const minX = flashSizePx / 2
      const maxX = sceneWidthPx - flashSizePx / 2
      const minY = flashSizePx / 2
      const maxY = Math.max(minY, sceneHeightPx * BG3_FLASH_MAX_Y_FRACTION - flashSizePx / 2)

      while (!cancelled && spawned < BG3_FLASH_SPAWN_COUNT_DEFAULT) {
        const waveCount = Math.min(
          BG3_FLASH_MAX_SPAWN_TOGETHER,
          BG3_FLASH_SPAWN_COUNT_DEFAULT - spawned,
          Math.floor(Math.random() * BG3_FLASH_MAX_SPAWN_TOGETHER) + 1,
        )
        const newSpawns: Bg3FlashSpawn[] = []
        setFlashSpawns((current) => {
          const next = [...current]
          for (let i = 0; i < waveCount; i += 1) {
            let tries = 20
            while (tries > 0) {
              const xPx = minX + Math.random() * (maxX - minX)
              const yPx = minY + Math.random() * (maxY - minY)
              const candidate: Bg3FlashSpawn = {
                id: Date.now() + Math.floor(Math.random() * 10_000) + i,
                xPx,
                yPx,
                frameIndex: 0,
              }
              if (![...next, ...newSpawns].some((existing) => overlaps(existing, candidate, flashSizePx))) {
                newSpawns.push(candidate)
                break
              }
              tries -= 1
            }
          }
          return newSpawns.length > 0 ? [...next, ...newSpawns] : current
        })
        spawned += newSpawns.length
        await new Promise<void>((resolve) => {
          const id = window.setTimeout(() => resolve(), BG3_FLASH_SPAWN_WAVE_DELAY_MS)
          if (cancelled) window.clearTimeout(id)
        })
      }
    }

    void runSpawnLoop()
    return () => {
      cancelled = true
    }
  }, [flashActive, sceneWidthPx, sceneHeightPx, flashSizePx])

  useEffect(() => {
    if (!flashActive) return
    const id = window.setInterval(() => {
      const now = Date.now()
      setFlashSpawns((current) => {
        if (current.length === 0) return current
        const next = current
          .map((spawn) => (spawn.frameIndex + 1 >= BG3_FLASH_FRAME_COUNT ? null : { ...spawn, frameIndex: spawn.frameIndex + 1 }))
          .filter((spawn): spawn is Bg3FlashSpawn => spawn !== null)
        const killedCount = current.length - next.length
        if (killedCount > 0 && (lastAudienceFlashAtMs === 0 || now - lastAudienceFlashAtMs >= BG3_FLASH_AUDIENCE_MIN_INTERVAL_MS)) {
          setLastAudienceFlashAtMs(now)
          setAudienceFlashUntilMs(now + BG3_FLASH_AUDIENCE_DISPLAY_MS)
        }
        return next
      })
    }, BG3_FLASH_FRAME_DELAY_MS)
    return () => window.clearInterval(id)
  }, [flashActive, lastAudienceFlashAtMs])

  useEffect(() => {
    if (!flashActive) {
      setFlashSpawns([])
      setAudienceFlashUntilMs(0)
      setLastAudienceFlashAtMs(0)
      return
    }

    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H2', location: 'useBg3FlashState.ts:121', message: 'bg3 flash ko-gated state', data: { flashActive, spawnCount: flashSpawns.length, audienceFlashUntilMs, frameDelayMs: BG3_FLASH_FRAME_DELAY_MS, frameCount: BG3_FLASH_FRAME_COUNT }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [flashActive, flashSpawns.length, audienceFlashUntilMs])

  return { flashSpawns, audienceFlashUntilMs, flashSizePx }
}
