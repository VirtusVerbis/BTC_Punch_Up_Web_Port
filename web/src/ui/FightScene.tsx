import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Candle } from '../data/candles'
import type { AttackEvent, FighterState } from '../game/types'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  ANIMATION_FRAME_DELAY_MS,
  BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_DOWN_TOP_OFFSET_FRACTION,
  BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH,
  BG2_ARROW_UP_TOP_OFFSET_FRACTION,
  BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH,
  BG2_BDWW_TOP_OFFSET_FRACTION,
  BG2_DCB_ASPECT_HEIGHT_PER_WIDTH,
  BG2_DCB_TOP_OFFSET_FRACTION,
  BG2_FR_ASPECT_HEIGHT_PER_WIDTH,
  BG2_FR_TOP_OFFSET_FRACTION,
  BG2_NEO_ASPECT_HEIGHT_PER_WIDTH,
  BG2_NEO_TOP_OFFSET_FRACTION,
  FIGHTER_ANCHOR_Y_OFFSET_FRACTION,
  FIGHTER_BASE_ART_DP,
  FIGHTER_WEB_DISPLAY_FACTOR,
  LIZARD_CENTER_BIAS_DP,
  SATOSHI_CENTER_BIAS_DP,
} from './androidMirrorConstants'
import { BtcCandleChart } from './BtcCandleChart'
import {
  audienceFile,
  bg2ArrowDownFile,
  bg2ArrowUpFile,
  bg2BdwwFile,
  bg2FirstRuleFile,
  bg2MemeFile,
  bg2NeoFile,
  bg3FlashAudienceFile,
  bg3FlashFile,
  bg4BuySignFile,
  fg3CatFile,
  fighterSpriteUrl,
  ringFile,
} from './fighterSprite'
import { mobileAssetManifest } from './mobileAssetManifest'
import { resolveMobileAssetUrl } from './mobileAssetUrls'
import type { Bg3FlashSpawn } from './useBg3FlashState'
import type { Bg4SignSpawn } from './useBg4SignState'
import type { Bg2ActiveMeme } from './useBg2MemeState'
import { useBoxerBobbing } from './useBoxerBobbing'

interface FightSceneProps {
  satoshi: FighterState
  lizard: FighterState
  alignCharacters: boolean
  showCandleChart: boolean
  showBg2Meme: boolean
  bg2ActiveMeme: Bg2ActiveMeme | null
  bg3FlashSpawns: Bg3FlashSpawn[]
  bg3AudienceFlashUntilMs: number
  bg3FlashSizePx: number
  sceneCoordWidthPx: number
  sceneCoordHeightPx: number
  bg4SignSpawns: Bg4SignSpawn[]
  bg4SignSizePx: number
  showFg3Cat: boolean
  fg3Direction: 'left' | 'right'
  fg3Frame: number
  fg3Left: number
  fg3Top: number
  fg3Width: number
  fg3Height: number
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
  centerBiasDp: number,
): CSSProperties => {
  const dx = alignCharacters ? cfg.alignDeltaX : 0
  const w = Math.max(1, sceneWidthPx)
  /** Match Android `Sprite`: `baseSizeDp = 128.dp * sizeScale` mapped to 1080px-wide design frame. */
  const boxPx =
    (w * FIGHTER_BASE_ART_DP * cfg.scale * FIGHTER_WEB_DISPLAY_FACTOR) / REFERENCE_WIDTH
  const anchorY = Math.min(1, cfg.anchorY + FIGHTER_ANCHOR_Y_OFFSET_FRACTION)
  const { xBobPx, yBobPx, depth } = bob
  /** Android `Sprite`: `centerBiasPx = CENTER_BIAS_DP * density`; map dp via reference width. */
  const biasPx = (centerBiasDp * w) / REFERENCE_WIDTH
  return {
    position: 'absolute',
    zIndex: cfg.zIndex,
    left: `${(cfg.anchorX + dx) * 100}%`,
    top: `${anchorY * 100}%`,
    width: `${boxPx}px`,
    height: `${boxPx}px`,
    objectFit: 'contain' as const,
    transform: `translate(calc(-50% + ${xBobPx + biasPx}px), calc(-50% + ${yBobPx}px)) scale(${depth})`,
    transformOrigin: 'center center',
    pointerEvents: 'none',
  }
}

export const FightScene = ({
  satoshi,
  lizard,
  alignCharacters,
  showCandleChart,
  showBg2Meme,
  bg2ActiveMeme,
  bg3FlashSpawns,
  bg3AudienceFlashUntilMs,
  bg3FlashSizePx,
  sceneCoordWidthPx,
  sceneCoordHeightPx,
  bg4SignSpawns,
  bg4SignSizePx,
  showFg3Cat,
  fg3Direction,
  fg3Frame,
  fg3Left,
  fg3Top,
  fg3Width,
  fg3Height,
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
  const bg3AudienceFlashSrc = nowMs < bg3AudienceFlashUntilMs ? resolveMobileAssetUrl(bg3FlashAudienceFile()) : null
  const bg2MemeSrc = (() => {
    if (!bg2ActiveMeme) return null
    if (bg2ActiveMeme.sequenceId === 'dcb') return resolveMobileAssetUrl(bg2MemeFile(bg2ActiveMeme.frameIndex + 1))
    if (bg2ActiveMeme.sequenceId === 'bdww') return resolveMobileAssetUrl(bg2BdwwFile())
    if (bg2ActiveMeme.sequenceId === 'neo') return resolveMobileAssetUrl(bg2NeoFile())
    if (bg2ActiveMeme.sequenceId === 'firstRule') return resolveMobileAssetUrl(bg2FirstRuleFile())
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return resolveMobileAssetUrl(bg2ArrowUpFile())
    return resolveMobileAssetUrl(bg2ArrowDownFile())
  })()
  const bg2TopOffset = (() => {
    if (!bg2ActiveMeme) return BG2_DCB_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'dcb') return BG2_DCB_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'bdww') return BG2_BDWW_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'neo') return BG2_NEO_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'firstRule') return BG2_FR_TOP_OFFSET_FRACTION
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return BG2_ARROW_UP_TOP_OFFSET_FRACTION
    return BG2_ARROW_DOWN_TOP_OFFSET_FRACTION
  })()
  /** Android `MainActivity`: `fillMaxWidth` + height `(screenWidth * aspectHeightPerWidth / density).dp`. */
  const bg2Aspect = (() => {
    if (!bg2ActiveMeme) return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'dcb') return BG2_DCB_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'bdww') return BG2_BDWW_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'neo') return BG2_NEO_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'firstRule') return BG2_FR_ASPECT_HEIGHT_PER_WIDTH
    if (bg2ActiveMeme.sequenceId === 'arrowUp') return BG2_ARROW_UP_ASPECT_HEIGHT_PER_WIDTH
    return BG2_ARROW_DOWN_ASPECT_HEIGHT_PER_WIDTH
  })()
  const bg2HeightPct =
    sceneHeightPx > 0 ? (sceneWidthPx * bg2Aspect * 100) / sceneHeightPx : bg2Aspect * 100
  const bg2TopPct = bg2TopOffset * 100
  const bg2Style: CSSProperties = {
    position: 'absolute',
    zIndex: m.meme.zIndex,
    left: '0%',
    top: `${bg2TopPct}%`,
    width: '100%',
    height: `${bg2HeightPct}%`,
    objectFit: 'contain',
    pointerEvents: 'none',
  }
  const ringSrc = resolveMobileAssetUrl(ringFile(ringIndex))
  const fg3CatSrc = resolveMobileAssetUrl(fg3CatFile(fg3Direction, fg3Frame))
  const coordWidthPx = sceneCoordWidthPx > 0 ? sceneCoordWidthPx : REFERENCE_WIDTH
  const coordHeightPx = sceneCoordHeightPx > 0 ? sceneCoordHeightPx : REFERENCE_HEIGHT
  const fg3Style: CSSProperties = {
    position: 'absolute',
    zIndex: m.fg3.zIndex,
    left: `${fg3Left * 100}%`,
    top: `${fg3Top * 100}%`,
    width: `${fg3Width * 100}%`,
    height: `${fg3Height * 100}%`,
    objectFit: m.fg3.objectFit,
    pointerEvents: 'none',
  }

  const satoshiInKo = satoshi.pose === 'fall' || satoshi.pose === 'knockedDown' || satoshi.pose === 'rise'
  const lizardInKo = lizard.pose === 'fall' || lizard.pose === 'knockedDown' || lizard.pose === 'rise'

  const satoshiSrc = fighterSpriteUrl(
    'satoshi',
    satoshi.pose,
    satoshi.mode,
    satoshi.defenseType,
    satoshi.damageAnim,
    satoshi.defenseStripStartTs,
    lastAttack,
    lizardInKo,
    nowMs,
  )
  const lizardSrc = fighterSpriteUrl(
    'lizard',
    lizard.pose,
    lizard.mode,
    lizard.defenseType,
    lizard.damageAnim,
    lizard.defenseStripStartTs,
    lastAttack,
    satoshiInKo,
    nowMs,
  )

  const hudBg = m.hudBackground ? resolveMobileAssetUrl(m.hudBackground) : null

  return (
    <div className="scene" ref={sceneRef}>
      {hudBg ? <img src={hudBg} alt="" className="scene-hud-bg" /> : null}

      <img
        src={audienceSrc}
        alt=""
        className="scene-layer scene-audience"
        style={{ ...boxStyle(audienceRect), objectFit: audienceRect.objectFit, objectPosition: audienceRect.objectPosition }}
        draggable={false}
      />

      {showCandleChart
        ? null
        : bg4SignSpawns.map((sign) => {
            const bg4Src = resolveMobileAssetUrl(bg4BuySignFile(sign.frameIndex))
            const bg4Style: CSSProperties = {
              position: 'absolute',
              zIndex: m.buySigns.zIndex,
              left: `${((sign.xPx - bg4SignSizePx / 2) / coordWidthPx) * 100}%`,
              top: `${((sign.yPx - bg4SignSizePx / 2) / coordHeightPx) * 100}%`,
              width: `${(bg4SignSizePx / coordWidthPx) * 100}%`,
              height: `${(bg4SignSizePx / coordHeightPx) * 100}%`,
              objectFit: 'contain',
              pointerEvents: 'none',
            }
            return (
              <img
                key={sign.id}
                src={bg4Src}
                alt=""
                className="scene-layer scene-bg4-sign"
                style={bg4Style}
                draggable={false}
              />
            )
          })}

      {bg3FlashSpawns.map((spawn) => {
        const bg3FlashSrc = resolveMobileAssetUrl(bg3FlashFile(spawn.frameIndex))
        const bg3Style: CSSProperties = {
          position: 'absolute',
          zIndex: m.flash.zIndex,
          left: `${((spawn.xPx - bg3FlashSizePx / 2) / coordWidthPx) * 100}%`,
          top: `${((spawn.yPx - bg3FlashSizePx / 2) / coordHeightPx) * 100}%`,
          width: `${(bg3FlashSizePx / coordWidthPx) * 100}%`,
          height: `${(bg3FlashSizePx / coordHeightPx) * 100}%`,
          objectFit: 'contain',
          pointerEvents: 'none',
        }
        return (
          <img
            key={spawn.id}
            src={bg3FlashSrc}
            alt=""
            className="scene-layer scene-bg3-flash"
            style={bg3Style}
            draggable={false}
          />
        )
      })}

      {bg3AudienceFlashSrc ? (
        <img
          src={bg3AudienceFlashSrc}
          alt=""
          className="scene-layer scene-bg3-flash-audience"
          style={{ ...boxStyle(m.flash), objectFit: m.flash.objectFit }}
          draggable={false}
        />
      ) : null}

      {showBg2Meme && bg2MemeSrc ? (
        <img
          src={bg2MemeSrc}
          alt=""
          className="scene-layer scene-bg2-meme"
          style={bg2Style}
          draggable={false}
        />
      ) : null}

      {showCandleChart ? (
        <div className="scene-layer scene-chart-band" style={boxStyle(m.chartBand)}>
          <BtcCandleChart candles={candles} showAxisLabels />
        </div>
      ) : null}

      <img
        src={ringSrc}
        alt=""
        className="scene-layer scene-ring"
        style={{ ...boxStyle(m.ring), objectFit: m.ring.objectFit, objectPosition: m.ring.objectPosition }}
        draggable={false}
      />

      <img
        src={lizardSrc}
        alt=""
        className="scene-fighter scene-lizard"
        style={fighterStyle(
          m.lizard,
          alignCharacters,
          sceneWidthPx,
          {
            xBobPx: bob.xBobLizardPx,
            yBobPx: bob.yBobPx,
            depth: bob.depthLizard,
          },
          LIZARD_CENTER_BIAS_DP,
        )}
        draggable={false}
        tabIndex={-1}
      />
      <img
        src={satoshiSrc}
        alt=""
        className="scene-fighter scene-satoshi"
        style={fighterStyle(
          m.satoshi,
          alignCharacters,
          sceneWidthPx,
          {
            xBobPx: bob.xBobSatoshiPx,
            yBobPx: bob.yBobPx,
            depth: bob.depthSatoshi,
          },
          SATOSHI_CENTER_BIAS_DP,
        )}
        draggable={false}
        tabIndex={-1}
      />

      {showFg3Cat ? (
        <img
          src={fg3CatSrc}
          alt=""
          className="scene-layer scene-fg3-cat"
          style={fg3Style}
          draggable={false}
        />
      ) : null}
    </div>
  )
}
