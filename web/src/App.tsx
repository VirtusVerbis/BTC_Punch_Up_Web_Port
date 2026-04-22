import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchBinanceBtc1mKlines, type Candle } from './data/candles'
import { BlockHeightService, type BlockState } from './data/blockHeight'
import { MarketDataService, type MarketFeedUpdate } from './data/marketData'
import { useGameStore } from './game/store'
import { FightScene } from './ui/FightScene'
import { Overlay } from './ui/Overlay'
import { SplashSequence } from './ui/SplashSequence'
import { Stage } from './ui/Stage'
import { useAudienceSubFrame } from './ui/useAudienceSubFrame'
import { useBg2ChartVisible } from './ui/useBg2ChartVisibility'
import { useRingRotation } from './ui/useRingRotation'

const emptyMarket = (): MarketFeedUpdate['market'] => ({
  binance: {
    exchange: 'binance',
    price: 0,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: 0,
  },
  coinbase: {
    exchange: 'coinbase',
    price: 0,
    buyVolume: 0,
    sellVolume: 0,
    updatedAt: 0,
  },
})

const initialFeedUpdate: MarketFeedUpdate = {
  market: emptyMarket(),
  status: {
    binance: 'disconnected',
    coinbase: 'disconnected',
  },
}

const initialBlockState: BlockState = {
  blockHeight: null,
  elapsedMs: 0,
  blockFlashOn: false,
  staleFlashOn: false,
}

function App() {
  const [splashDone, setSplashDone] = useState(false)
  const onSplashDone = useCallback(() => setSplashDone(true), [])

  const [feed, setFeed] = useState<MarketFeedUpdate>(initialFeedUpdate)
  const [blockState, setBlockState] = useState<BlockState>(initialBlockState)
  const [candles, setCandles] = useState<Candle[]>([])

  const satoshi = useGameStore((state) => state.satoshi)
  const lizard = useGameStore((state) => state.lizard)
  const alignCharacters = useGameStore((state) => state.alignCharacters)
  const lastAttack = useGameStore((state) => state.lastAttack)
  const satoshiKoCount = useGameStore((state) => state.satoshiKoCount)
  const lizardKoCount = useGameStore((state) => state.lizardKoCount)
  const applyMarketTick = useGameStore((state) => state.applyMarketTick)
  const toggleCharacterAlignment = useGameStore((state) => state.toggleCharacterAlignment)

  const setFeedRef = useRef(setFeed)
  setFeedRef.current = setFeed
  const applyMarketTickRef = useRef(applyMarketTick)
  applyMarketTickRef.current = applyMarketTick

  const koLockedUntil = Math.max(satoshi.koLockedUntil, lizard.koLockedUntil)
  const ringIndex = useRingRotation(koLockedUntil)
  const audienceSubFrame = useAudienceSubFrame()
  const bg2Visible = useBg2ChartVisible()

  const marketService = useMemo(
    () =>
      new MarketDataService((update) => {
        setFeedRef.current(update)
        applyMarketTickRef.current(update.market)
      }),
    [],
  )

  useEffect(() => {
    const blockService = new BlockHeightService(setBlockState)
    blockService.start()
    return () => blockService.stop()
  }, [])

  useEffect(() => {
    marketService.start()
    return () => marketService.stop()
  }, [marketService])

  useEffect(() => {
    const load = () => {
      void fetchBinanceBtc1mKlines(150).then(setCandles)
    }
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const showCandleChart = splashDone && bg2Visible

  return (
    <main className="app-shell">
      {!splashDone ? <SplashSequence onDone={onSplashDone} /> : null}
      <Stage>
        <FightScene
          satoshi={satoshi}
          lizard={lizard}
          alignCharacters={alignCharacters}
          showCandleChart={showCandleChart}
          candles={candles}
          ringIndex={ringIndex}
          audienceSubFrame={audienceSubFrame}
          lastAttack={lastAttack}
        />
        <Overlay
          market={feed.market}
          block={blockState}
          satoshiDamage={satoshi.damagePoints}
          lizardDamage={lizard.damagePoints}
          satoshiMode={satoshi.mode}
          lizardMode={lizard.mode}
          satoshiKoCount={satoshiKoCount}
          lizardKoCount={lizardKoCount}
          onTimeClick={toggleCharacterAlignment}
          status={feed.status}
        />
      </Stage>
    </main>
  )
}

export default App
