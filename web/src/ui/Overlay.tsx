import { useEffect, useRef, useState } from 'react'
import type { BlockState } from '../data/blockHeight'
import type { FeedStatus } from '../data/marketData'
import type { MarketSnapshot, Mode } from '../game/types'
import { mobileAssetManifest } from './mobileAssetManifest'
import { resolveMobileAssetUrl } from './mobileAssetUrls'
import { formatElapsed, formatExchangePriceLabel } from './format'

interface OverlayProps {
  market: MarketSnapshot
  block: BlockState
  satoshiDamage: number
  lizardDamage: number
  satoshiMode: Mode
  lizardMode: Mode
  satoshiKoCount: number
  lizardKoCount: number
  onTimeClick: () => void
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

const maxVolumeAll = (m: MarketSnapshot): number => {
  const v = Math.max(
    m.binance.buyVolume,
    m.binance.sellVolume,
    m.coinbase.buyVolume,
    m.coinbase.sellVolume,
    1,
  )
  return v
}

const modeLabel = (mode: Mode): string => (mode === 'offense' ? 'Offense' : 'Defense')

const FeedGlyph = ({ status }: { status: FeedStatus }) => {
  const on = status === 'connected'
  const color = on ? '#4caf50' : status === 'connecting' ? '#ffc107' : '#757575'
  const label = on ? '●' : status === 'connecting' ? '◐' : '○'
  return (
    <span className="feed-glyph" style={{ color }} title={status} aria-hidden>
      {label}
    </span>
  )
}

const VolumeBar = ({
  volume,
  maxVolume,
  color,
  alignEnd,
  animate,
}: {
  volume: number
  maxVolume: number
  color: string
  alignEnd: boolean
  animate: boolean
}) => {
  const p = maxVolume > 0 ? Math.min(1, volume / maxVolume) : 0
  const [pulse, setPulse] = useState(1)
  useEffect(() => {
    if (!animate) return
    setPulse(1.15)
    const t = window.setTimeout(() => setPulse(1), 300)
    return () => window.clearTimeout(t)
  }, [animate, volume])
  const w = Math.min(1, p * pulse)
  return (
    <div className={`volume-bar-track ${alignEnd ? 'volume-bar-track-end' : ''}`}>
      <div
        className="volume-bar-fill"
        style={{
          width: `${w * 100}%`,
          backgroundColor: color,
          marginLeft: alignEnd ? 'auto' : 0,
        }}
      />
    </div>
  )
}

const DamageBar = ({
  points,
  alignEnd,
}: {
  points: number
  alignEnd: boolean
}) => {
  const w = Math.min(1, points / 100)
  return (
    <div className={`volume-bar-track damage-bar-track ${alignEnd ? 'volume-bar-track-end' : ''}`}>
      <div
        className="volume-bar-fill damage-bar-fill"
        style={{ width: `${w * 100}%`, marginLeft: alignEnd ? 'auto' : 0 }}
      />
    </div>
  )
}

export const Overlay = ({
  market,
  block,
  satoshiDamage,
  lizardDamage,
  satoshiMode,
  lizardMode,
  satoshiKoCount,
  lizardKoCount,
  onTimeClick,
  status,
}: OverlayProps) => {
  const maxV = maxVolumeAll(market)
  const prevBinance = useRef<number | undefined>(undefined)
  const prevCoinbase = useRef<number | undefined>(undefined)
  const prevBinBuy = useRef<number | undefined>(undefined)
  const prevBinSell = useRef<number | undefined>(undefined)
  const prevCbBuy = useRef<number | undefined>(undefined)
  const prevCbSell = useRef<number | undefined>(undefined)

  const [binPulse, setBinPulse] = useState(false)
  const [cbPulse, setCbPulse] = useState(false)

  useEffect(() => {
    const bBuy = market.binance.buyVolume
    const bSell = market.binance.sellVolume
    if (bBuy !== prevBinBuy.current || bSell !== prevBinSell.current) {
      setBinPulse(true)
      const t = window.setTimeout(() => setBinPulse(false), 320)
      prevBinBuy.current = bBuy
      prevBinSell.current = bSell
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [market.binance.buyVolume, market.binance.sellVolume])

  useEffect(() => {
    const cBuy = market.coinbase.buyVolume
    const cSell = market.coinbase.sellVolume
    if (cBuy !== prevCbBuy.current || cSell !== prevCbSell.current) {
      setCbPulse(true)
      const t = window.setTimeout(() => setCbPulse(false), 320)
      prevCbBuy.current = cBuy
      prevCbSell.current = cSell
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [market.coinbase.buyVolume, market.coinbase.sellVolume])

  const binPriceLabel = formatExchangePriceLabel(market.binance.price)
  const cbPriceLabel = formatExchangePriceLabel(market.coinbase.price)

  const pBin = market.binance.price
  const prevBin = prevBinance.current
  const binanceUnavailable = binPriceLabel === 'Unavailable'
  const binanceColor = status.binance === 'connected'
    ? prevBin === undefined || prevBin === pBin
      ? '#ffffff'
      : pBin > prevBin
        ? '#4caf50'
        : '#f44336'
    : '#757575'
  prevBinance.current = pBin

  const pCb = market.coinbase.price
  const prevCb = prevCoinbase.current
  const coinbaseUnavailable = cbPriceLabel === 'Unavailable'
  const coinbaseColor = status.coinbase === 'connected'
    ? prevCb === undefined || prevCb === pCb
      ? '#ffffff'
      : pCb > prevCb
        ? '#4caf50'
        : '#f44336'
    : '#757575'
  prevCoinbase.current = pCb

  const hudBg = mobileAssetManifest.hudBackground

  return (
    <div className="overlay">
      {hudBg ? (
        <img className="overlay-hud-bg" src={resolveMobileAssetUrl(hudBg)} alt="" draggable={false} />
      ) : null}
      <div className="overlay-row">
        <div className="overlay-column overlay-column-start">
          <p className="overlay-label">
            Binance <FeedGlyph status={status.binance} />
          </p>
          <p className="overlay-price" style={{ color: binanceColor }}>
            {binanceUnavailable ? binPriceLabel : `$${binPriceLabel}`}
          </p>
          <VolumeBar
            volume={market.binance.buyVolume}
            maxVolume={maxV}
            color="#4caf50"
            alignEnd={false}
            animate={binPulse}
          />
          <VolumeBar
            volume={market.binance.sellVolume}
            maxVolume={maxV}
            color="#f44336"
            alignEnd={false}
            animate={binPulse}
          />
          <p className={`overlay-mode ${satoshiMode === 'defense' ? 'overlay-mode-defense' : 'overlay-mode-offense'}`}>
            {modeLabel(satoshiMode)}
          </p>
          <DamageBar points={satoshiDamage} alignEnd={false} />
          <p className="overlay-ko-count">{satoshiKoCount}</p>
        </div>
        <button className="time-button" type="button" onClick={onTimeClick}>
          <span className="overlay-label">Time</span>
          <span className={block.blockFlashOn ? 'flash' : ''}>
            {block.blockHeight === null ? '—' : block.blockHeight}
          </span>
          <span className={block.staleFlashOn ? 'flash' : 'subtle'}>{formatElapsed(block.elapsedMs)}</span>
        </button>
        <div className="overlay-column overlay-column-end">
          <p className="overlay-label">
            Coinbase <FeedGlyph status={status.coinbase} />
          </p>
          <p className="overlay-price" style={{ color: coinbaseColor }}>
            {coinbaseUnavailable ? cbPriceLabel : `$${cbPriceLabel}`}
          </p>
          <VolumeBar
            volume={market.coinbase.buyVolume}
            maxVolume={maxV}
            color="#4caf50"
            alignEnd
            animate={cbPulse}
          />
          <VolumeBar
            volume={market.coinbase.sellVolume}
            maxVolume={maxV}
            color="#f44336"
            alignEnd
            animate={cbPulse}
          />
          <p className={`overlay-mode ${lizardMode === 'defense' ? 'overlay-mode-defense' : 'overlay-mode-offense'}`}>
            {modeLabel(lizardMode)}
          </p>
          <DamageBar points={lizardDamage} alignEnd />
          <p className="overlay-ko-count">{lizardKoCount}</p>
        </div>
      </div>
      <p className="disclaimer">
        Informational display only, not trading advice. Data may be delayed or unavailable.
      </p>
    </div>
  )
}
