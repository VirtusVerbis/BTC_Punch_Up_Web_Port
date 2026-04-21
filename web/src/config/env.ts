const readBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback
  }
  return value.toLowerCase() === 'true'
}

export const env = {
  useMockData: readBool(import.meta.env.VITE_USE_MOCK_DATA, true),
  binanceWsUrl:
    import.meta.env.VITE_BINANCE_WS_URL ??
    'wss://stream.binance.com:9443/ws/btcusdt@trade',
  coinbaseWsUrl:
    import.meta.env.VITE_COINBASE_WS_URL ?? 'wss://ws-feed.exchange.coinbase.com',
  mempoolTipUrl:
    import.meta.env.VITE_MEMPOOL_TIP_URL ??
    'https://mempool.space/api/blocks/tip/height',
}
