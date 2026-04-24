import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from './config/constants'
import { fetchBinanceBtc1mKlines, type Candle } from './data/candles'
import { BlockHeightService, type BlockState } from './data/blockHeight'
import { MarketDataService, type MarketFeedUpdate } from './data/marketData'
import { useGameStore } from './game/store'
import { FightScene } from './ui/FightScene'
import { Overlay } from './ui/Overlay'
import { SplashSequence } from './ui/SplashSequence'
import { Stage } from './ui/Stage'
import { useAudienceSubFrame } from './ui/useAudienceSubFrame'
import { useBg2MemeState } from './ui/useBg2MemeState'
import { useBg2ChartVisible } from './ui/useBg2ChartVisibility'
import { useBg3FlashState } from './ui/useBg3FlashState'
import { useBg4SignState } from './ui/useBg4SignState'
import { useFg3CatState } from './ui/useFg3CatState'
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
  const appShellRef = useRef<HTMLElement | null>(null)
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
  const bg2Meme = useBg2MemeState(bg2Visible)
  const bg4 = useBg4SignState({
    sceneWidthPx: REFERENCE_WIDTH,
    sceneHeightPx: REFERENCE_HEIGHT,
    ringIndex,
    bg2Visible,
    koKnockedDown: satoshi.pose === 'knockedDown' || lizard.pose === 'knockedDown',
  })
  const bg3 = useBg3FlashState()
  const fg3 = useFg3CatState()

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
  const showBg2Meme = splashDone

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7252/ingest/caf88746-b310-4ec2-85db-7a16f13955b8', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e88c71' }, body: JSON.stringify({ sessionId: 'e88c71', runId: 'baseline', hypothesisId: 'H0', location: 'App.tsx:114', message: 'app mounted for debug session', data: { splashDone, bg2Visible }, timestamp: Date.now() }) }).catch(() => {})
    // #endregion
  }, [splashDone, bg2Visible])

  return (
    <main ref={appShellRef} className="app-shell">
      {!splashDone ? <SplashSequence onDone={onSplashDone} /> : null}
      <Stage shellRef={appShellRef}>
        <FightScene
          satoshi={satoshi}
          lizard={lizard}
          alignCharacters={alignCharacters}
          showCandleChart={showCandleChart}
          showBg2Meme={showBg2Meme}
          bg2MemeFrame={bg2Meme.frame}
          showBg2Neo={bg2Meme.showNeo}
          bg3FlashFrame={bg3.flashFrame}
          showBg3AudienceFlash={bg3.showAudienceFlash}
          bg4SignSpawns={bg4.signSpawns}
          bg4SignSizePx={bg4.signSizePx}
          showFg3Cat={fg3.active}
          fg3Direction={fg3.direction}
          fg3Frame={fg3.frame}
          fg3Left={fg3.left}
          fg3Top={fg3.top}
          fg3Width={fg3.width}
          fg3Height={fg3.height}
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
