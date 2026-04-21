import type { BlockState } from '../data/blockHeight'
import type { FeedStatus } from '../data/marketData'
import type { MarketSnapshot } from '../game/types'
import { formatElapsed, formatPrice } from './format'

interface OverlayProps {
  market: MarketSnapshot
  block: BlockState
  satoshiDamage: number
  lizardDamage: number
  onTimeClick: () => void
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

export const Overlay = ({
  market,
  block,
  satoshiDamage,
  lizardDamage,
  onTimeClick,
  status,
}: OverlayProps) => (
  <div className="overlay">
    <div className="overlay-row">
      <div>
        <p className="overlay-label">Binance</p>
        <p>${formatPrice(market.binance.price)}</p>
        <p className="subtle">Feed: {status.binance}</p>
      </div>
      <button className="time-button" type="button" onClick={onTimeClick}>
        <span className="overlay-label">Time</span>
        <span className={block.blockFlashOn ? 'flash' : ''}>
          {block.blockHeight === null ? '—' : block.blockHeight}
        </span>
        <span className={block.staleFlashOn ? 'flash' : 'subtle'}>{formatElapsed(block.elapsedMs)}</span>
      </button>
      <div className="text-right">
        <p className="overlay-label">Coinbase</p>
        <p>${formatPrice(market.coinbase.price)}</p>
        <p className="subtle">Feed: {status.coinbase}</p>
      </div>
    </div>
    <div className="overlay-row">
      <div>
        <p className="overlay-label">Satoshi Damage</p>
        <progress max={100} value={satoshiDamage} />
      </div>
      <div className="text-right">
        <p className="overlay-label">Lizard Damage</p>
        <progress max={100} value={lizardDamage} />
      </div>
    </div>
    <p className="disclaimer">
      Informational display only, not trading advice. Data may be delayed or unavailable.
    </p>
  </div>
)
