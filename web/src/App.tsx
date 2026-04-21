import { useEffect, useMemo, useState } from 'react'
import { BlockHeightService, type BlockState } from './data/blockHeight'
import { MarketDataService, type MarketFeedUpdate } from './data/marketData'
import { createMockTick } from './data/mockData'
import { env } from './config/env'
import { useGameStore } from './game/store'
import { FightScene } from './ui/FightScene'
import { Overlay } from './ui/Overlay'
import { Stage } from './ui/Stage'

const initialFeedUpdate: MarketFeedUpdate = {
  market: createMockTick(),
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
  const [feed, setFeed] = useState<MarketFeedUpdate>(initialFeedUpdate)
  const [blockState, setBlockState] = useState<BlockState>(initialBlockState)

  const satoshi = useGameStore((state) => state.satoshi)
  const lizard = useGameStore((state) => state.lizard)
  const alignCharacters = useGameStore((state) => state.alignCharacters)
  const applyMarketTick = useGameStore((state) => state.applyMarketTick)
  const toggleCharacterAlignment = useGameStore((state) => state.toggleCharacterAlignment)

  const marketService = useMemo(
    () =>
      new MarketDataService((update) => {
        setFeed(update)
        applyMarketTick(update.market)
      }),
    [applyMarketTick],
  )

  useEffect(() => {
    const blockService = new BlockHeightService(setBlockState)
    blockService.start()
    return () => blockService.stop()
  }, [])

  useEffect(() => {
    if (env.useMockData) {
      const timer = window.setInterval(() => {
        const market = createMockTick()
        setFeed((prev) => ({ ...prev, market }))
        applyMarketTick(market)
      }, 400)
      return () => window.clearInterval(timer)
    }

    marketService.start()
    return () => marketService.stop()
  }, [applyMarketTick, marketService])

  return (
    <main className="app-shell">
      <Stage>
        <FightScene
          satoshi={satoshi}
          lizard={lizard}
          alignCharacters={alignCharacters}
          showCandleChart={false}
        />
        <Overlay
          market={feed.market}
          block={blockState}
          satoshiDamage={satoshi.damagePoints}
          lizardDamage={lizard.damagePoints}
          onTimeClick={toggleCharacterAlignment}
          status={feed.status}
        />
      </Stage>
    </main>
  )
}

export default App
