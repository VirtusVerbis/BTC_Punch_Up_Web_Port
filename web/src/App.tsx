import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { ANIMATION_FRAME_DELAY_MS, BG2_MAX_CANDLES } from './ui/androidMirrorConstants'
import { useRingRotation } from './ui/useRingRotation'
import { useVideoOverlayState } from './ui/useVideoOverlayState'
import { VideoOverlay } from './ui/VideoOverlay'

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

const GITHUB_MARK_PATH =
  'M12 .5C5.65.5.5 5.67.5 12.03c0 5.11 3.3 9.45 7.88 10.98.58.1.8-.25.8-.56 0-.27-.01-1.16-.02-2.1-3.2.71-3.87-1.38-3.87-1.38-.52-1.36-1.28-1.72-1.28-1.72-1.04-.73.08-.72.08-.72 1.15.08 1.76 1.2 1.76 1.2 1.02 1.78 2.68 1.26 3.33.96.1-.76.4-1.26.72-1.55-2.55-.3-5.23-1.3-5.23-5.8 0-1.28.45-2.33 1.18-3.15-.12-.3-.51-1.5.11-3.13 0 0 .97-.32 3.17 1.2a10.8 10.8 0 0 1 5.77 0c2.2-1.52 3.16-1.2 3.16-1.2.63 1.63.24 2.83.12 3.13.73.82 1.17 1.87 1.17 3.15 0 4.51-2.68 5.49-5.24 5.78.42.37.78 1.09.78 2.2 0 1.6-.01 2.88-.01 3.27 0 .31.21.67.81.56A11.55 11.55 0 0 0 23.5 12.03C23.5 5.67 18.35.5 12 .5Z'

const GitHubMark = () => (
  <svg className="repo-link-icon" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
    <path fill="currentColor" d={GITHUB_MARK_PATH} />
  </svg>
)

function App() {
  const appShellRef = useRef<HTMLElement | null>(null)
  const stageAnchorRef = useRef<HTMLDivElement | null>(null)
  const [splashDone, setSplashDone] = useState(false)
  const onSplashDone = useCallback(() => setSplashDone(true), [])

  const [feed, setFeed] = useState<MarketFeedUpdate>(initialFeedUpdate)
  const [blockState, setBlockState] = useState<BlockState>(initialBlockState)
  const [candles, setCandles] = useState<Candle[]>([])
  const [sceneWidthPx, setSceneWidthPx] = useState(REFERENCE_WIDTH)
  const [sceneHeightPx, setSceneHeightPx] = useState(REFERENCE_HEIGHT)

  useLayoutEffect(() => {
    const el = stageAnchorRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setSceneWidthPx(w > 0 ? w : REFERENCE_WIDTH)
      setSceneHeightPx(h > 0 ? h : REFERENCE_HEIGHT)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const satoshi = useGameStore((state) => state.satoshi)
  const lizard = useGameStore((state) => state.lizard)
  const alignCharacters = useGameStore((state) => state.alignCharacters)
  const lastAttack = useGameStore((state) => state.lastAttack)
  const satoshiKoCount = useGameStore((state) => state.satoshiKoCount)
  const lizardKoCount = useGameStore((state) => state.lizardKoCount)
  const applyMarketTick = useGameStore((state) => state.applyMarketTick)
  const advanceCombat = useGameStore((state) => state.advanceCombat)

  const setFeedRef = useRef(setFeed)
  setFeedRef.current = setFeed
  const applyMarketTickRef = useRef(applyMarketTick)
  applyMarketTickRef.current = applyMarketTick
  const advanceCombatRef = useRef(advanceCombat)
  advanceCombatRef.current = advanceCombat

  const koPhaseActive =
    satoshi.pose === 'fall' ||
    satoshi.pose === 'knockedDown' ||
    satoshi.pose === 'rise' ||
    lizard.pose === 'fall' ||
    lizard.pose === 'knockedDown' ||
    lizard.pose === 'rise'
  const ringIndex = useRingRotation(koPhaseActive)
  const audienceSubFrame = useAudienceSubFrame()
  const bg2Meme = useBg2MemeState(feed.market.binance.price, feed.market.coinbase.price)
  const hasActiveBg2Meme = bg2Meme.activeMeme !== null
  const videoOverlay = useVideoOverlayState()
  const isVideoActive = videoOverlay.isVideoActive
  const bg2Visible = useBg2ChartVisible(hasActiveBg2Meme || isVideoActive)
  const koKnockedDown = satoshi.pose === 'knockedDown' || lizard.pose === 'knockedDown'
  const bg3 = useBg3FlashState({
    flashActive: koKnockedDown,
    sceneWidthPx,
    sceneHeightPx,
  })
  const bg4 = useBg4SignState({
    sceneWidthPx,
    sceneHeightPx,
    ringIndex,
    koKnockedDown,
    bg3FlashSpawnCount: bg3.flashSpawns.length,
    bg3AudienceFlashUntilMs: bg3.audienceFlashUntilMs,
  })
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
    const id = window.setInterval(() => advanceCombatRef.current(), ANIMATION_FRAME_DELAY_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const load = () => {
      void fetchBinanceBtc1mKlines(BG2_MAX_CANDLES).then(setCandles)
    }
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const showCandleChart = bg2Visible && !isVideoActive
  const showBg2Meme = splashDone && hasActiveBg2Meme && !isVideoActive

  return (
    <main ref={appShellRef} className="app-shell">
      {!splashDone ? <SplashSequence onDone={onSplashDone} /> : null}
      <div className="app-layout">
        <div className="stage-anchor" ref={stageAnchorRef}>
          <Stage shellRef={appShellRef}>
            <FightScene
              satoshi={satoshi}
              lizard={lizard}
              alignCharacters={alignCharacters}
              showCandleChart={showCandleChart}
              showBg2Meme={showBg2Meme}
              bg2ActiveMeme={bg2Meme.activeMeme}
              bg3FlashSpawns={bg3.flashSpawns}
              bg3AudienceFlashUntilMs={bg3.audienceFlashUntilMs}
              bg3FlashSizePx={bg3.flashSizePx}
              sceneCoordWidthPx={sceneWidthPx}
              sceneCoordHeightPx={sceneHeightPx}
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
              onTimeClick={() => {}}
              status={feed.status}
            />
            {videoOverlay.active ? (
              <VideoOverlay
                videoId={videoOverlay.active.videoId}
                soundEnabled={videoOverlay.soundEnabled}
                onEnded={videoOverlay.completeActiveVideo}
                onPlaybackError={videoOverlay.failActiveVideo}
                onClose={videoOverlay.completeActiveVideo}
                sceneWidthPx={sceneWidthPx}
                sceneHeightPx={sceneHeightPx}
              />
            ) : null}
          </Stage>
        </div>

        <aside className="repo-links-panel" aria-label="Source repositories">
          <a
            className="repo-link repo-link-playstore"
            href="https://play.google.com/store/apps/details?id=com.vv.btcpunchup&pcampaignid=web_share"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="BTC Punch Up on Google Play"
          >
            <img
              className="playstore-badge"
              src="/playstore-badge.png"
              alt="Get it on Google Play"
              draggable={false}
            />
          </a>
          <a
            className="repo-link repo-link-zapstore"
            href="https://zapstore.dev/apps/com.vv.btcpunchup"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="BTC Punch Up on Zapstore"
          >
            <img
              className="zapstore-badge"
              src="/zapstore_badge.png"
              alt="Get it on Zapstore"
              draggable={false}
            />
          </a>
          <div className="repo-link-lnurl" aria-label="LNURL address">
            <img
              className="lnurl-badge"
              src="/mobile/lnurl_address.jpg.jpeg"
              alt="LNURL address"
              draggable={false}
            />
          </div>
          <a
            className="repo-link"
            href="https://github.com/VirtusVerbis/BTC_Punch_Up_Web_Port"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubMark />
            <span>Web Port Repo</span>
          </a>
          <a
            className="repo-link"
            href="https://github.com/VirtusVerbis/BTC_Punch_Up"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubMark />
            <span>Android Repo</span>
          </a>
        </aside>
      </div>
    </main>
  )
}

export default App
