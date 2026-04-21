import type { MarketSnapshot } from '../game/types'

let seed = 42
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

export const createMockTick = (): MarketSnapshot => {
  const basePrice = 100_000 + (rand() - 0.5) * 1200
  const buyB = 40 + rand() * 80
  const sellB = 30 + rand() * 80
  const buyC = 35 + rand() * 85
  const sellC = 25 + rand() * 85
  const ts = Date.now()

  return {
    binance: {
      exchange: 'binance',
      price: Number(basePrice.toFixed(2)),
      buyVolume: Number(buyB.toFixed(2)),
      sellVolume: Number(sellB.toFixed(2)),
      updatedAt: ts,
    },
    coinbase: {
      exchange: 'coinbase',
      price: Number((basePrice + (rand() - 0.5) * 50).toFixed(2)),
      buyVolume: Number(buyC.toFixed(2)),
      sellVolume: Number(sellC.toFixed(2)),
      updatedAt: ts,
    },
  }
}
