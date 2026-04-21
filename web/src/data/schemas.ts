import { z } from 'zod'
import type { ExchangeSnapshot } from '../game/types'

const numberFromUnknown = z.preprocess((value) => {
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return value
}, z.number().finite())

export const binanceTradeSchema = z.object({
  p: numberFromUnknown,
  q: numberFromUnknown,
  m: z.boolean().optional(),
})

export const coinbaseTickerSchema = z.object({
  type: z.literal('ticker'),
  price: numberFromUnknown,
  last_size: numberFromUnknown.optional(),
  side: z.enum(['buy', 'sell']).optional(),
})

export const normalizedExchangeSchema = z.object({
  exchange: z.enum(['binance', 'coinbase']),
  price: z.number().finite(),
  buyVolume: z.number().nonnegative(),
  sellVolume: z.number().nonnegative(),
  updatedAt: z.number().int(),
})

export type NormalizedExchange = z.infer<typeof normalizedExchangeSchema>

export const normalizeBinanceTrade = (payload: unknown): ExchangeSnapshot | null => {
  const parsed = binanceTradeSchema.safeParse(payload)
  if (!parsed.success) {
    return null
  }
  const isSell = parsed.data.m ?? false
  const tradeVolume = parsed.data.q
  return {
    exchange: 'binance',
    price: parsed.data.p,
    buyVolume: isSell ? 0 : tradeVolume,
    sellVolume: isSell ? tradeVolume : 0,
    updatedAt: Date.now(),
  }
}

export const normalizeCoinbaseTicker = (payload: unknown): ExchangeSnapshot | null => {
  const parsed = coinbaseTickerSchema.safeParse(payload)
  if (!parsed.success) {
    return null
  }
  const volume = parsed.data.last_size ?? 0
  const buyVolume = parsed.data.side === 'sell' ? 0 : volume
  const sellVolume = parsed.data.side === 'sell' ? volume : 0
  return {
    exchange: 'coinbase',
    price: parsed.data.price,
    buyVolume,
    sellVolume,
    updatedAt: Date.now(),
  }
}
