import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Candle } from '../data/candles'
import type { AttackEvent, FighterState } from '../game/types'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  ANIMATION_FRAME_DELAY_MS,
  FIGHTER_ANCHOR_Y_OFFSET_FRACTION,
  FIGHTER_BASE_ART_DP,
  FIGHTER_WEB_DISPLAY_FACTOR,
} from './androidMirrorConstants'
import { BtcCandleChart } from './BtcCandleChart'
import { audienceFile, fighterSpriteUrl, ringFile } from './fighterSprite'
import { mobileAssetManifest } from './mobileAssetManifest'
import { resolveMobileAssetUrl } from './mobileAssetUrls'
import { useBoxerBobbing } from './useBoxerBobbing'

interface FightSceneProps {
  satoshi: FighterState
  lizard: FighterState
  alignCharacters: boolean
  showCandleChart: boolean
  candles: Candle[]
  ringIndex: number
  audienceSubFrame: number
  lastAttack: AttackEvent | null
}

const boxStyle = (layer: {
  zIndex: number
  left: number
  top: number
  width: number
  height: number
}): CSSProperties => ({
  position: 'absolute',
  zIndex: layer.zIndex,
  left: `${layer.left * 100}%`,
  top: `${layer.top * 100}%`,
  width: `${layer.width * 100}%`,
  height: `${layer.height * 100}%`,
  pointerEvents: 'none',
})

const fighterStyle = (
  cfg: (typeof mobileAssetManifest)['satoshi'],
  alignCharacters: boolean,
  sceneWidthPx: number,
  bob: { xBobPx: number; yBobPx: number; depth: number },
): CSSProperties => {
  const dx = alignCharacters ? cfg.alignDeltaX : 0
  const w = Math.max(1, sceneWidthPx)
  /** Match Android `Sprite`: `baseSizeDp = 128.dp * sizeScale` mapped to 1080px-wide design frame. */
  const boxPx =
    (w * FIGHTER_BASE_ART_DP * cfg.scale * FIGHTER_WEB_DISPLAY_FACTOR) / REFERENCE_WIDTH
  const anchorY = Math.min(1, cfg.anchorY + FIGHTER_ANCHOR_Y_OFFSET_FRACTION)
  const { xBobPx, yBobPx, depth } = bob
  return {
    position: 'absolute',
    zIndex: cfg.zIndex,
    left: `${(cfg.anchorX + dx) * 100}%`,
    top: `${anchorY * 100}%`,
    width: `${boxPx}px`,
    height: `${boxPx}px`,
    objectFit: 'contain' as const,
    transform: `translate(calc(-50% + ${xBobPx}px), calc(-50% + ${yBobPx}px)) scale(${depth})`,
    transformOrigin: 'center center',
    pointerEvents: 'none',
  }
}

export const FightScene = ({
  satoshi,
  lizard,
  alignCharacters,
  showCandleChart,
  candles,
  ringIndex,
  audienceSubFrame,
  lastAttack,
}: FightSceneProps) => {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const sceneRef = useRef<HTMLDivElement | null>(null)
  const [sceneWidthPx, setSceneWidthPx] = useState(0)
  const [sceneHeightPx, setSceneHeightPx] = useState(0)

  useLayoutEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSceneWidthPx(w > 0 ? w : 360)
      setSceneHeightPx(h > 0 ? h : Math.round((w > 0 ? w : 360) / (REFERENCE_WIDTH / REFERENCE_HEIGHT)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), ANIMATION_FRAME_DELAY_MS)
    return () => window.clearInterval(id)
  }, [])

  const bob = useBoxerBobbing(sceneWidthPx, sceneHeightPx, alignCharacters, satoshi, lizard, lastAttack)

  const m = mobileAssetManifest
  /** Audience should remain full-frame like Android; no conditional vertical shift. */
  const audienceRect = m.audience
  const audienceSrc = resolveMobileAssetUrl(audienceFile(ringIndex, audienceSubFrame))
  const ringSrc = resolveMobileAssetUrl(ringFile(ringIndex))

  const satoshiSrc = fighterSpriteUrl(
    'satoshi',
    satoshi.pose,
    satoshi.mode,
    satoshi.defenseType,
    lastAttack,
    nowMs,
  )
  const lizardSrc = fighterSpriteUrl('lizard', lizard.pose, lizard.mode, lizard.defenseType, lastAttack, nowMs)

  const hudBg = m.hudBackground ? resolveMobileAssetUrl(m.hudBackground) : null

  return (
    <div className="scene" ref={sceneRef}>
      {hudBg ? <img src={hudBg} alt="" className="scene-hud-bg" /> : null}

      <img
        src={audienceSrc}
        alt=""
        className="scene-layer scene-audience"
        style={{ ...boxStyle(audienceRect), objectFit: audienceRect.objectFit }}
        draggable={false}
      />

      {showCandleChart ? (
        <div className="scene-layer scene-chart-band" style={boxStyle(m.chartBand)}>
          <BtcCandleChart candles={candles} showAxisLabels />
        </div>
      ) : null}

      <img
        src={ringSrc}
        alt=""
        className="scene-layer scene-ring"
        style={{ ...boxStyle(m.ring), objectFit: m.ring.objectFit }}
        draggable={false}
      />

      <img
        src={lizardSrc}
        alt=""
        className="scene-fighter scene-lizard"
        style={fighterStyle(m.lizard, alignCharacters, sceneWidthPx, {
          xBobPx: bob.xBobLizardPx,
          yBobPx: bob.yBobPx,
          depth: bob.depthLizard,
        })}
        draggable={false}
        tabIndex={-1}
      />
      <img
        src={satoshiSrc}
        alt=""
        className="scene-fighter scene-satoshi"
        style={fighterStyle(m.satoshi, alignCharacters, sceneWidthPx, {
          xBobPx: bob.xBobSatoshiPx,
          yBobPx: bob.yBobPx,
          depth: bob.depthSatoshi,
        })}
        draggable={false}
        tabIndex={-1}
      />
    </div>
  )
}
