import { env } from '../config/env'
import type { ExchangeSnapshot, MarketSnapshot } from '../game/types'
import { EXCHANGE_EMIT_THROTTLE_MS, VOLUME_RESET_INTERVAL_MS } from './exchangeConstants'
import {
  binanceTradeSchema,
  coinbaseSnapshotTop50Volumes,
  normalizeCoinbaseMatch,
  parseBinanceTickerClosePrice,
  parseCoinbaseLevel2Snapshot,
  parseCoinbaseTickerPrice,
  unwrapBinanceWebSocketPayload,
} from './schemas'
import { SafeWebSocketClient } from './websocketClient'

export type FeedStatus = 'connecting' | 'connected' | 'disconnected'

export interface MarketFeedUpdate {
  market: MarketSnapshot
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

const emptySnapshot = (exchange: 'binance' | 'coinbase'): ExchangeSnapshot => ({
  exchange,
  price: 0,
  buyVolume: 0,
  sellVolume: 0,
  updatedAt: 0,
})

export class MarketDataService {
  private market: MarketSnapshot = {
    binance: emptySnapshot('binance'),
    coinbase: emptySnapshot('coinbase'),
  }

  private status: MarketFeedUpdate['status'] = {
    binance: 'disconnected',
    coinbase: 'disconnected',
  }

  private latestBinancePrice = 0
  private latestCoinbasePrice = 0
  private binanceBuyAcc = 0
  private binanceSellAcc = 0
  private coinbaseBuyAcc = 0
  private coinbaseSellAcc = 0

  private emitTimer: number | null = null
  private resetTimer: number | null = null
  private fallbackTimer: number | null = null

  private readonly binanceClient = new SafeWebSocketClient({
    url: env.binanceWsUrl,
    onJsonMessage: (payload) => {
      this.applyBinancePayload(payload)
    },
    onStatus: (status) => {
      this.status = { ...this.status, binance: status }
    },
  })

  private readonly coinbaseClient = new SafeWebSocketClient({
    url: env.coinbaseWsUrl,
    onJsonMessage: (payload) => {
      this.applyCoinbasePayload(payload)
    },
    onOpen: (socket) => {
      const subscribe = {
        type: 'subscribe',
        product_ids: [env.coinbaseProductId],
        channels: ['ticker', 'level2', 'matches', 'heartbeats'],
      }
      socket.send(JSON.stringify(subscribe))
    },
    onStatus: (status) => {
      this.status = { ...this.status, coinbase: status }
    },
  })

  constructor(private readonly onUpdate: (update: MarketFeedUpdate) => void) {}

  start() {
    this.binanceClient.connect()
    this.coinbaseClient.connect()
    if (this.emitTimer === null) {
      this.emitTimer = window.setInterval(() => this.pushSnapshot(), EXCHANGE_EMIT_THROTTLE_MS)
    }
    if (this.resetTimer === null) {
      this.resetTimer = window.setInterval(() => this.resetVolumeAccumulators(), VOLUME_RESET_INTERVAL_MS)
    }
    if (this.fallbackTimer === null) {
      this.fallbackTimer = window.setInterval(() => {
        void this.pollRestFallback()
      }, VOLUME_RESET_INTERVAL_MS)
      void this.pollRestFallback()
    }
  }

  stop() {
    if (this.emitTimer !== null) {
      window.clearInterval(this.emitTimer)
      this.emitTimer = null
    }
    if (this.resetTimer !== null) {
      window.clearInterval(this.resetTimer)
      this.resetTimer = null
    }
    if (this.fallbackTimer !== null) {
      window.clearInterval(this.fallbackTimer)
      this.fallbackTimer = null
    }
    this.binanceClient.disconnect()
    this.coinbaseClient.disconnect()
  }

  private resetVolumeAccumulators() {
    this.binanceBuyAcc = 0
    this.binanceSellAcc = 0
    this.coinbaseBuyAcc = 0
    this.coinbaseSellAcc = 0
  }

  private applyBinancePayload(payload: unknown) {
    const inner = unwrapBinanceWebSocketPayload(payload) as Record<string, unknown> | null
    if (!inner || typeof inner !== 'object') return
    const et = inner.e

    if (et === 'trade') {
      const parsed = binanceTradeSchema.safeParse(inner)
      if (!parsed.success) return
      const qty = parsed.data.q
      const isSell = parsed.data.m ?? false
      if (isSell) this.binanceSellAcc += qty
      else this.binanceBuyAcc += qty
      if (parsed.data.p > 0) this.latestBinancePrice = parsed.data.p
      return
    }

    if (et === '24hrTicker') {
      const px = parseBinanceTickerClosePrice(payload)
      if (px !== null) this.latestBinancePrice = px
    }
  }

  private applyCoinbasePayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') return
    const root = payload as Record<string, unknown>
    const type = root.type
    if (type === 'ticker') {
      const px = parseCoinbaseTickerPrice(payload)
      if (px !== null) this.latestCoinbasePrice = px
      return
    }
    if (type === 'snapshot') {
      const parsed = parseCoinbaseLevel2Snapshot(payload)
      if (!parsed.success) return
      if (parsed.data.product_id !== env.coinbaseProductId) return
      const { buyVolume, sellVolume } = coinbaseSnapshotTop50Volumes(parsed.data.bids, parsed.data.asks)
      this.coinbaseBuyAcc = buyVolume
      this.coinbaseSellAcc = sellVolume
      return
    }
    if (type === 'match') {
      const snap = normalizeCoinbaseMatch(payload)
      if (!snap) return
      if (root.product_id && root.product_id !== env.coinbaseProductId) return
      this.coinbaseBuyAcc += snap.buyVolume
      this.coinbaseSellAcc += snap.sellVolume
    }
  }

  private async pollRestFallback() {
    const binanceBase = import.meta.env.DEV ? '/binance-api' : env.binanceApiOrigin
    const coinbaseBase = import.meta.env.DEV ? '/coinbase-api' : 'https://api.exchange.coinbase.com'

    if (this.status.binance !== 'connected' || this.latestBinancePrice <= 0) {
      try {
        const priceRes = await fetch(`${binanceBase}/api/v3/ticker/price?symbol=BTCUSDT`)
        if (priceRes.ok) {
          const body = (await priceRes.json()) as { price?: unknown }
          const p = Number(body?.price)
          if (Number.isFinite(p) && p > 0) this.latestBinancePrice = p
        }
        const tradesRes = await fetch(`${binanceBase}/api/v3/trades?symbol=BTCUSDT&limit=80`)
        if (tradesRes.ok) {
          const trades = (await tradesRes.json()) as Array<{ qty?: unknown; isBuyerMaker?: unknown }>
          let buy = 0
          let sell = 0
          for (const t of trades) {
            const q = Number(t?.qty)
            if (!Number.isFinite(q) || q <= 0) continue
            const isSell = t?.isBuyerMaker === true
            if (isSell) sell += q
            else buy += q
          }
          if (buy + sell > 0) {
            this.binanceBuyAcc = buy
            this.binanceSellAcc = sell
          }
        }
      } catch {
        // Ignore; websocket path may recover first.
      }
    }

    if (this.status.coinbase !== 'connected' || this.latestCoinbasePrice <= 0) {
      try {
        const tickerRes = await fetch(`${coinbaseBase}/products/${encodeURIComponent(env.coinbaseProductId)}/ticker`)
        if (tickerRes.ok) {
          const body = (await tickerRes.json()) as { price?: unknown }
          const p = Number(body?.price)
          if (Number.isFinite(p) && p > 0) this.latestCoinbasePrice = p
        }
        const bookRes = await fetch(`${coinbaseBase}/products/${encodeURIComponent(env.coinbaseProductId)}/book?level=2`)
        if (bookRes.ok) {
          const body = (await bookRes.json()) as { bids?: unknown[]; asks?: unknown[] }
          const bids = Array.isArray(body?.bids) ? body.bids : []
          const asks = Array.isArray(body?.asks) ? body.asks : []
          let buy = 0
          let sell = 0
          for (let i = 0; i < Math.min(50, bids.length); i += 1) {
            const row = bids[i]
            const size = Array.isArray(row) ? Number(row[1]) : NaN
            if (Number.isFinite(size) && size > 0) buy += size
          }
          for (let i = 0; i < Math.min(50, asks.length); i += 1) {
            const row = asks[i]
            const size = Array.isArray(row) ? Number(row[1]) : NaN
            if (Number.isFinite(size) && size > 0) sell += size
          }
          if (buy + sell > 0) {
            this.coinbaseBuyAcc = buy
            this.coinbaseSellAcc = sell
          }
        }
      } catch {
        // Ignore; websocket path may recover first.
      }
    }
  }

  private pushSnapshot() {
    const now = Date.now()
    this.market = {
      binance: {
        exchange: 'binance',
        price: this.latestBinancePrice,
        buyVolume: this.binanceBuyAcc,
        sellVolume: this.binanceSellAcc,
        updatedAt: now,
      },
      coinbase: {
        exchange: 'coinbase',
        price: this.latestCoinbasePrice,
        buyVolume: this.coinbaseBuyAcc,
        sellVolume: this.coinbaseSellAcc,
        updatedAt: now,
      },
    }
    this.onUpdate({ market: this.market, status: this.status })
  }
}
