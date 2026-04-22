const BINANCE_STREAMS_PATH = 'stream?streams=btcusdt@trade/btcusdt@ticker/btcusdt@bookTicker'

const resolveBinanceWsUrl = (): string => {
  const override = import.meta.env.VITE_BINANCE_WS_URL as string | undefined
  if (override) return override
  /** Same-origin WS in dev so Vite can proxy to Binance (avoids some browser / network cross-origin blocks). */
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws-binance/${BINANCE_STREAMS_PATH}`
  }
  return `wss://stream.testnet.binance.vision/${BINANCE_STREAMS_PATH}`
}

const resolveCoinbaseWsUrl = (): string => {
  const override = import.meta.env.VITE_COINBASE_WS_URL as string | undefined
  if (override) return override
  /** Keep Coinbase direct; Binance proxy is the path currently showing upstream aborts. */
  return 'wss://ws-feed.exchange.coinbase.com'
}

export const env = {
  get binanceWsUrl() {
    return resolveBinanceWsUrl()
  },
  get coinbaseWsUrl() {
    return resolveCoinbaseWsUrl()
  },
  coinbaseProductId: import.meta.env.VITE_COINBASE_PRODUCT_ID ?? 'BTC-USD',
  mempoolTipUrl:
    import.meta.env.VITE_MEMPOOL_TIP_URL ??
    'https://mempool.space/api/blocks/tip/height',
  /**
   * Binance REST origin for klines (default: Spot Testnet, same host family as Android `PriceRepository`).
   * Dev: prefer Vite proxy `/binance-api`. Prod: may require same-origin proxy if CORS blocks the browser.
   */
  binanceApiOrigin:
    (import.meta.env.VITE_BINANCE_API_ORIGIN as string | undefined) ?? 'https://testnet.binance.vision',
}
