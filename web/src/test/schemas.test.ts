import { normalizeBinanceTrade, normalizeCoinbaseTicker } from '../data/schemas'

describe('socket payload parsing', () => {
  test('normalizes binance trade payload', () => {
    const parsed = normalizeBinanceTrade({ p: '102000.50', q: '0.42', m: false })
    expect(parsed?.exchange).toBe('binance')
    expect(parsed?.price).toBe(102000.5)
    expect(parsed?.buyVolume).toBe(0.42)
    expect(parsed?.sellVolume).toBe(0)
  })

  test('normalizes coinbase ticker payload', () => {
    const parsed = normalizeCoinbaseTicker({
      type: 'ticker',
      price: '101999.1',
      side: 'sell',
      last_size: '0.18',
    })
    expect(parsed?.exchange).toBe('coinbase')
    expect(parsed?.sellVolume).toBe(0.18)
    expect(parsed?.buyVolume).toBe(0)
  })
})
