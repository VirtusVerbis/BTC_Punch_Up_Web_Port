import { useEffect, useRef, useState } from 'react'
import type { AttackEvent, FighterState } from '../game/types'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { BOBBING_INTERVAL_MS, BOBBING_START_DELAY_MS } from './androidMirrorConstants'
import { bothFightersIdleForBobbing } from './fighterSprite'
import {
  advanceBobbingEngine,
  bobbingPixelOutputs,
  createInitialBobbingState,
  depthLizard,
  depthSatoshi,
  type BobbingEngineState,
} from './bobbingLogic'

export interface BoxerBobbingFrame {
  xBobSatoshiPx: number
  xBobLizardPx: number
  yBobPx: number
  depthSatoshi: number
  depthLizard: number
}

export const ZERO_BOBBING_FRAME: BoxerBobbingFrame = {
  xBobSatoshiPx: 0,
  xBobLizardPx: 0,
  yBobPx: 0,
  depthSatoshi: 1,
  depthLizard: 1,
}

function frameFromEngine(s: BobbingEngineState, bobScale: number): BoxerBobbingFrame {
  const { xBobSatoshiPx, xBobLizardPx, yBobPx } = bobbingPixelOutputs(s)
  return {
    xBobSatoshiPx,
    xBobLizardPx,
    yBobPx,
    depthSatoshi: depthSatoshi(s.movementOffsetY, bobScale),
    depthLizard: depthLizard(s.movementOffsetY, bobScale),
  }
}

function copyBobFrame(f: BoxerBobbingFrame): BoxerBobbingFrame {
  return {
    xBobSatoshiPx: f.xBobSatoshiPx,
    xBobLizardPx: f.xBobLizardPx,
    yBobPx: f.yBobPx,
    depthSatoshi: f.depthSatoshi,
    depthLizard: f.depthLizard,
  }
}

/**
 * Mirrors Android `MainActivity` LaunchedEffect bobbing: 40ms tick, opposite X per boxer,
 * shared Y + together drift, depth from Y. Paused for `alignCharacters`, KO lock, start delay,
 * or unless both fighters use the idle sprite loop (see `bothFightersIdleForBobbing`).
 */
export function useBoxerBobbing(
  sceneWidthPx: number,
  sceneHeightPx: number,
  alignCharacters: boolean,
  satoshi: FighterState,
  lizard: FighterState,
  lastAttack: AttackEvent | null,
): BoxerBobbingFrame {
  const engineRef = useRef<BobbingEngineState>(createInitialBobbingState())
  const startRef = useRef<number | null>(null)
  const alignRef = useRef(alignCharacters)
  const koSatRef = useRef(satoshi.koLockedUntil)
  const koLizRef = useRef(lizard.koLockedUntil)
  const satoshiRef = useRef(satoshi)
  const lizardRef = useRef(lizard)
  const lastAttackRef = useRef(lastAttack)
  /** Last pose/depth from the bobbing engine; held during punch/block so resume does not snap from center. */
  const lastShownBobRef = useRef<BoxerBobbingFrame>(copyBobFrame(ZERO_BOBBING_FRAME))
  alignRef.current = alignCharacters
  koSatRef.current = satoshi.koLockedUntil
  koLizRef.current = lizard.koLockedUntil
  satoshiRef.current = satoshi
  lizardRef.current = lizard
  lastAttackRef.current = lastAttack

  const [frame, setFrame] = useState<BoxerBobbingFrame>(ZERO_BOBBING_FRAME)

  useEffect(() => {
    if (startRef.current === null) startRef.current = Date.now()
  }, [])

  useEffect(() => {
    const bobScale =
      sceneWidthPx > 0 && sceneHeightPx > 0
        ? Math.min(sceneWidthPx / REFERENCE_WIDTH, sceneHeightPx / REFERENCE_HEIGHT)
        : 0

    const tick = () => {
      if (alignRef.current) {
        lastShownBobRef.current = copyBobFrame(ZERO_BOBBING_FRAME)
        setFrame(ZERO_BOBBING_FRAME)
        return
      }
      const t = Date.now()
      if (bobScale <= 0) return

      if (t < koSatRef.current || t < koLizRef.current) {
        const f = frameFromEngine(engineRef.current, bobScale)
        lastShownBobRef.current = copyBobFrame(f)
        setFrame(f)
        return
      }

      const started = startRef.current ?? t
      if (t - started < BOBBING_START_DELAY_MS) {
        const f = frameFromEngine(engineRef.current, bobScale)
        lastShownBobRef.current = copyBobFrame(f)
        setFrame(f)
        return
      }

      const idleBoth = bothFightersIdleForBobbing(satoshiRef.current, lizardRef.current, lastAttackRef.current)

      if (!idleBoth) {
        setFrame(copyBobFrame(lastShownBobRef.current))
        return
      }

      const next = advanceBobbingEngine(engineRef.current, bobScale)
      engineRef.current = next
      const f = frameFromEngine(next, bobScale)
      lastShownBobRef.current = copyBobFrame(f)
      setFrame(f)
    }

    const id = window.setInterval(tick, BOBBING_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [sceneWidthPx, sceneHeightPx])

  if (alignCharacters) {
    return ZERO_BOBBING_FRAME
  }

  return frame
}
