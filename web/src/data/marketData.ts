import { env } from '../config/env'
import type { MarketSnapshot } from '../game/types'
import { normalizeBinanceTrade, normalizeCoinbaseTicker } from './schemas'
import { SafeWebSocketClient } from './websocketClient'

export type FeedStatus = 'connecting' | 'connected' | 'disconnected'

export interface MarketFeedUpdate {
  market: MarketSnapshot
  status: {
    binance: FeedStatus
    coinbase: FeedStatus
  }
}

export class MarketDataService {
  private market: MarketSnapshot = {
    binance: { exchange: 'binance', price: 0, buyVolume: 0, sellVolume: 0, updatedAt: 0 },
    coinbase: { exchange: 'coinbase', price: 0, buyVolume: 0, sellVolume: 0, updatedAt: 0 },
  }

  private status: MarketFeedUpdate['status'] = {
    binance: 'disconnected',
    coinbase: 'disconnected',
  }

  private readonly binanceClient = new SafeWebSocketClient({
    url: env.binanceWsUrl,
    parseMessage: normalizeBinanceTrade,
    onMessage: (snapshot) => {
      this.market = { ...this.market, binance: snapshot }
      this.emit()
    },
    onStatus: (status) => {
      this.status = { ...this.status, binance: status }
      this.emit()
    },
  })

  private readonly coinbaseClient = new SafeWebSocketClient({
    url: env.coinbaseWsUrl,
    parseMessage: normalizeCoinbaseTicker,
    onMessage: (snapshot) => {
      this.market = { ...this.market, coinbase: snapshot }
      this.emit()
    },
    onStatus: (status) => {
      this.status = { ...this.status, coinbase: status }
      this.emit()
    },
  })

  constructor(private readonly onUpdate: (update: MarketFeedUpdate) => void) {}

  start() {
    this.binanceClient.connect()
    this.coinbaseClient.connect()
  }

  stop() {
    this.binanceClient.disconnect()
    this.coinbaseClient.disconnect()
  }

  injectMock(market: MarketSnapshot) {
    this.market = market
    this.emit()
  }

  private emit() {
    this.onUpdate({ market: this.market, status: this.status })
  }
}
