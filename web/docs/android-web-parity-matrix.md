# Android vs web parity matrix

**Reference:** [VirtusVerbis/BTC_Punch_Up](https://github.com/VirtusVerbis/BTC_Punch_Up) (`main`), Jetpack Compose.  
**Web app:** `web/` (this repo).  
**Status:** `done` = mirrored for web-feasible scope of this pass | `partial` | `missing` | `n/a` (Android-only).

**Binance network:** Web defaults to **Spot Testnet** (`testnet.binance.vision` / `stream.testnet.binance.vision`) for WS + klines so users are less likely to hit mainnet geo-blocks. Upstream Android **live** `BinanceWebSocketService` still uses **mainnet** `stream.binance.com`; Android `PriceRepository` REST already used testnet for some calls. Override with `VITE_BINANCE_WS_URL` / `VITE_BINANCE_API_ORIGIN` for mainnet. Production klines may still need a **same-origin proxy** if the browser blocks CORS to Binance (testnet or mainnet).

| Area | Android (source) | Web | Status | Notes |
|------|------------------|-----|--------|-------|
| Binance WS | `WebSocketRepository` / `BinanceWebSocketService` | `MarketDataService` + `websocketClient` | done | Combined stream: trades accumulate buy/sell; `24hrTicker` updates last price; 100ms emit + 5s volume reset like Android. Testnet/mainnet via env. |
| Coinbase WS | `CoinbaseWebSocketService` | `MarketDataService` | done | `ticker` + `level2` + `matches` + `heartbeats`; snapshot seeds top-50 book volumes; matches add; same throttle/reset as Android. |
| Block height poll | `PriceRepository` / Mempool | `BlockHeightService` | done | |
| Punch/defense/KO rules | `MainActivity` + mechanics | `game/mechanics.ts` + `store.ts` | done | Align with README |
| Dual splash (podcast + title) | `SplashScreen`, `vv_splash`, `btc_punchup_cover` | `SplashSequence` | done | Timings + tap skip; blocks main feed until done |
| Layered scene (audience, ring, fighters) | `MainActivity` draw order (bg5→bg0, fg1 Lizard under fg2 Satoshi) | `FightScene` + `mobileAssetManifest` z-index map | done | PNGs under `/mobile/`; reserved z slots for future bg4–bg2 / fg3 |
| Ring rotation (timer mode) | `TEST_RING_ROTATION`, `RING_ROTATE_*`, `RING_FRAMES` | `useRingRotation` | partial | Matches timer path; block-triggered rotation not wired |
| Audience frames vs ring | `AUDIENCE_FRAMES_BY_RING`, `AUDIENCE_FRAME_DELAY_MS` | `FightScene` | done | Sub-frame cycles 0–2 |
| Optional candle chart | `BtcCandleChart`, BG2 intervals, Binance klines | `BtcCandleChart` + `fetchBinanceBtc1mKlines` | partial | Default REST: testnet. Dev: Vite proxy `/binance-api` → testnet. Prod: CORS may require your own proxy; override `VITE_BINANCE_API_ORIGIN`. |
| Volume bars + mode + WiFi | `PriceDisplay`, `VolumeBar` | `Overlay` + CSS bars | done | Colors match Compose; feed glyph for status |
| Price green/red vs previous | `PriceDisplay` | `Overlay` | done | |
| Damage bars + KO count | `PriceDisplay` | `Overlay` + store | done | KO logic simplified vs simultaneous window |
| Time / block / elapsed flash | `MainActivity` | `Overlay` + `BlockHeightService` | done | |
| Character alignment toggle | Tap crosshair / saved offsets | Time button (existing) | partial | Web keeps toggle; no per-offset editor |
| Spread-based defense | `WebSocketRepository` median spread | — | missing | Web uses volume-only defense |
| Bid/ask / spread in UI | `ExchangeData` | — | missing | Not exposed on web feeds yet |
| Memes (Chika, BDWW, NEO, …) | `MainActivity` bg2 | — | missing | Large feature; optional follow-up |
| Flash spawns bg3 | `MainActivity` | — | missing | |
| Buy BTC signs bg4 | `MainActivity` | — | missing | |
| Cat walk fg3 | `MainActivity` | — | missing | |
| Bobbing / together movement | `MainActivity` | — | missing | |
| YouTube video overlay (WiFi) | `MainActivity` + player | n/a | n/a | Use iframe only with legal/UX review; not in this pass |
| PiP | `PictureInPictureParams` | n/a | n/a | |
| Haptics / notifications | platform | n/a | n/a | |

Last updated: implementation pass (mirror port).
