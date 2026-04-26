import { useEffect, useRef, useState } from 'react'
import {
  BG2_ARROW_DOWN_DISPLAY_MS,
  BG2_ARROW_DOWN_PRICE_DROP_PERCENT,
  BG2_ARROW_DOWN_PRICE_DROP_PERCENT_MAX,
  BG2_ARROW_UP_DISPLAY_MS,
  BG2_ARROW_UP_PRICE_INCREASE_PERCENT,
  BG2_ARROW_UP_PRICE_INCREASE_PERCENT_MAX,
  BG2_BDWW_DISPLAY_MS,
  BG2_BDWW_PRICE_DROP_PERCENT,
  BG2_BDWW_PRICE_DROP_PERCENT_MAX,
  BG2_DCB_FRAME_DELAY_MS,
  BG2_DCB_MIN_FRAME_INTERVAL_MS,
  BG2_DCB_PRICE_INCREASE_PERCENT,
  BG2_DCB_PRICE_INCREASE_PERCENT_MAX,
  BG2_FR_DISPLAY_MS,
  BG2_FR_PRICE_DROP_PERCENT,
  BG2_FR_PRICE_DROP_PERCENT_MAX,
  BG2_MEME_CYCLE_FRAMES,
  BG2_MEME_PRICE_WINDOW_MS,
  BG2_NEO_DISPLAY_MS,
  BG2_NEO_PRICE_INCREASE_PERCENT,
  BG2_NEO_PRICE_INCREASE_PERCENT_MAX,
} from './androidMirrorConstants'

export type Bg2MemeSequenceId = 'dcb' | 'bdww' | 'neo' | 'firstRule' | 'arrowUp' | 'arrowDown'

export interface Bg2ActiveMeme {
  sequenceId: Bg2MemeSequenceId
  frameIndex: number
}

export interface Bg2MemeState {
  activeMeme: Bg2ActiveMeme | null
}

interface PricePoint {
  atMs: number
  price: number
}

const pct = (v: number): number => v / 100

const riseInRange = (current: number, old: number | undefined, minPct: number, maxPct: number): boolean => {
  if (old === undefined || old <= 0 || !Number.isFinite(current) || current <= 0) return false
  const rise = (current - old) / old
  return rise >= pct(minPct) && rise <= pct(maxPct)
}

const dropInRange = (current: number, old: number | undefined, minPct: number, maxPct: number): boolean => {
  if (old === undefined || old <= 0 || !Number.isFinite(current) || current <= 0) return false
  const drop = (old - current) / old
  return drop >= pct(minPct) && drop <= pct(maxPct)
}

const latestAtOrBefore = (history: PricePoint[], cutoffMs: number): number | undefined => {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const point = history[i]
    if (point.atMs <= cutoffMs) return point.price
  }
  return undefined
}

const frameCountFor = (sequenceId: Bg2MemeSequenceId): number =>
  sequenceId === 'dcb' ? BG2_MEME_CYCLE_FRAMES : 1

const delayMsFor = (sequenceId: Bg2MemeSequenceId): number => {
  if (sequenceId === 'dcb') return Math.max(BG2_DCB_FRAME_DELAY_MS, BG2_DCB_MIN_FRAME_INTERVAL_MS)
  if (sequenceId === 'bdww') return BG2_BDWW_DISPLAY_MS
  if (sequenceId === 'neo') return BG2_NEO_DISPLAY_MS
  if (sequenceId === 'firstRule') return BG2_FR_DISPLAY_MS
  if (sequenceId === 'arrowUp') return BG2_ARROW_UP_DISPLAY_MS
  return BG2_ARROW_DOWN_DISPLAY_MS
}

/** Mobile-style bg2 lifecycle: chart windows + one active price-triggered meme sequence. */
export const useBg2MemeState = (
  visibleChart: boolean,
  binancePrice: number,
  coinbasePrice: number,
): Bg2MemeState => {
  const [activeMeme, setActiveMeme] = useState<Bg2ActiveMeme | null>(null)
  const lastTriggerAtRef = useRef(0)
  const binanceHistoryRef = useRef<PricePoint[]>([])
  const coinbaseHistoryRef = useRef<PricePoint[]>([])

  useEffect(() => {
    const now = Date.now()
    const cutoff = now - 2 * BG2_MEME_PRICE_WINDOW_MS

    if (Number.isFinite(binancePrice) && binancePrice > 0) {
      binanceHistoryRef.current = [...binanceHistoryRef.current, { atMs: now, price: binancePrice }].filter(
        (p) => p.atMs > cutoff,
      )
    }
    if (Number.isFinite(coinbasePrice) && coinbasePrice > 0) {
      coinbaseHistoryRef.current = [...coinbaseHistoryRef.current, { atMs: now, price: coinbasePrice }].filter(
        (p) => p.atMs > cutoff,
      )
    }

  }, [binancePrice, coinbasePrice])

  useEffect(() => {
    if (activeMeme !== null) return
    const now = Date.now()
    if (now - lastTriggerAtRef.current < BG2_MEME_PRICE_WINDOW_MS) return

    const cutoff = now - BG2_MEME_PRICE_WINDOW_MS
    const binanceOld = latestAtOrBefore(binanceHistoryRef.current, cutoff)
    const coinbaseOld = latestAtOrBefore(coinbaseHistoryRef.current, cutoff)

    const upDcb =
      riseInRange(binancePrice, binanceOld, BG2_DCB_PRICE_INCREASE_PERCENT, BG2_DCB_PRICE_INCREASE_PERCENT_MAX) ||
      riseInRange(coinbasePrice, coinbaseOld, BG2_DCB_PRICE_INCREASE_PERCENT, BG2_DCB_PRICE_INCREASE_PERCENT_MAX)
    if (upDcb) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'dcb', frameIndex: 0 })
      return
    }

    const upNeo =
      riseInRange(binancePrice, binanceOld, BG2_NEO_PRICE_INCREASE_PERCENT, BG2_NEO_PRICE_INCREASE_PERCENT_MAX) ||
      riseInRange(coinbasePrice, coinbaseOld, BG2_NEO_PRICE_INCREASE_PERCENT, BG2_NEO_PRICE_INCREASE_PERCENT_MAX)
    if (upNeo) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'neo', frameIndex: 0 })
      return
    }

    const upArrow =
      riseInRange(
        binancePrice,
        binanceOld,
        BG2_ARROW_UP_PRICE_INCREASE_PERCENT,
        BG2_ARROW_UP_PRICE_INCREASE_PERCENT_MAX,
      ) ||
      riseInRange(
        coinbasePrice,
        coinbaseOld,
        BG2_ARROW_UP_PRICE_INCREASE_PERCENT,
        BG2_ARROW_UP_PRICE_INCREASE_PERCENT_MAX,
      )
    if (upArrow) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'arrowUp', frameIndex: 0 })
      return
    }

    const downBdww =
      dropInRange(binancePrice, binanceOld, BG2_BDWW_PRICE_DROP_PERCENT, BG2_BDWW_PRICE_DROP_PERCENT_MAX) ||
      dropInRange(coinbasePrice, coinbaseOld, BG2_BDWW_PRICE_DROP_PERCENT, BG2_BDWW_PRICE_DROP_PERCENT_MAX)
    if (downBdww) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'bdww', frameIndex: 0 })
      return
    }

    const downFr =
      dropInRange(binancePrice, binanceOld, BG2_FR_PRICE_DROP_PERCENT, BG2_FR_PRICE_DROP_PERCENT_MAX) ||
      dropInRange(coinbasePrice, coinbaseOld, BG2_FR_PRICE_DROP_PERCENT, BG2_FR_PRICE_DROP_PERCENT_MAX)
    if (downFr) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'firstRule', frameIndex: 0 })
      return
    }

    const downArrow =
      dropInRange(
        binancePrice,
        binanceOld,
        BG2_ARROW_DOWN_PRICE_DROP_PERCENT,
        BG2_ARROW_DOWN_PRICE_DROP_PERCENT_MAX,
      ) ||
      dropInRange(
        coinbasePrice,
        coinbaseOld,
        BG2_ARROW_DOWN_PRICE_DROP_PERCENT,
        BG2_ARROW_DOWN_PRICE_DROP_PERCENT_MAX,
      )

    if (downArrow) {
      lastTriggerAtRef.current = now
      setActiveMeme({ sequenceId: 'arrowDown', frameIndex: 0 })
    }
  }, [activeMeme, binancePrice, coinbasePrice])

  useEffect(() => {
    if (activeMeme === null || visibleChart) return
    const sequenceId = activeMeme.sequenceId
    const frameCount = frameCountFor(sequenceId)
    const id = window.setTimeout(() => {
      setActiveMeme((current) => {
        if (!current || current.sequenceId !== sequenceId) return current
        if (frameCount === 0 || current.frameIndex + 1 >= frameCount) return null
        return { ...current, frameIndex: current.frameIndex + 1 }
      })
    }, delayMsFor(sequenceId))
    return () => window.clearTimeout(id)
  }, [activeMeme, visibleChart])

  useEffect(() => {
    if (!visibleChart && !activeMeme) return
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H3', location: 'useBg2MemeState.ts:157', message: 'bg2 meme sequence state', data: { visibleChart, activeMeme, cooldownMs: BG2_MEME_PRICE_WINDOW_MS }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [visibleChart, activeMeme])

  return { activeMeme }
}
