import { useEffect, useRef, useState } from 'react'
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

/** Android-style bg3: KO-gated flash spawns + audience pulse; pauses when tab hidden (`isVisible` parity). */
export const useBg3FlashState = ({
  flashActive,
  sceneWidthPx,
  sceneHeightPx,
}: Bg3FlashStateArgs): Bg3FlashState => {
  const [flashSpawns, setFlashSpawns] = useState<Bg3FlashSpawn[]>([])
  const [audienceFlashUntilMs, setAudienceFlashUntilMs] = useState(0)
  const [lastAudienceFlashAtMs, setLastAudienceFlashAtMs] = useState(0)
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState === 'visible',
  )
  const waveDelayTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined)
  const flashSizePx = BG3_FLASH_SIZE_DP

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!flashActive || !tabVisible || sceneWidthPx <= 0 || sceneHeightPx <= 0) {
      setFlashSpawns([])
      return
    }
    let cancelled = false

    const clearWaveDelay = () => {
      if (waveDelayTimeoutRef.current !== undefined) {
        globalThis.clearTimeout(waveDelayTimeoutRef.current)
        waveDelayTimeoutRef.current = undefined
      }
    }

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

        if (cancelled) break

        await new Promise<void>((resolve) => {
          if (cancelled) {
            resolve()
            return
          }
          clearWaveDelay()
          waveDelayTimeoutRef.current = globalThis.setTimeout(() => {
            waveDelayTimeoutRef.current = undefined
            resolve()
          }, BG3_FLASH_SPAWN_WAVE_DELAY_MS)
        })
      }
    }

    void runSpawnLoop()
    return () => {
      cancelled = true
      clearWaveDelay()
    }
  }, [flashActive, tabVisible, sceneWidthPx, sceneHeightPx, flashSizePx])

  useEffect(() => {
    if (!flashActive || !tabVisible) return
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
  }, [flashActive, tabVisible, lastAudienceFlashAtMs])

  useEffect(() => {
    if (!flashActive || !tabVisible) {
      setFlashSpawns([])
      setAudienceFlashUntilMs(0)
      setLastAudienceFlashAtMs(0)
    }
  }, [flashActive, tabVisible])

  return { flashSpawns, audienceFlashUntilMs, flashSizePx }
}
