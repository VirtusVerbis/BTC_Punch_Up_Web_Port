# BTC Punch Up Web

Web port of BTC Punch Up with a client-heavy architecture: the browser consumes market data, computes boxing state, and renders the fight scene.

## Local development

1. Install dependencies:
   - `npm install`
2. Run local dev server:
   - `npm run dev`
3. Run test/lint/build:
   - `npm run test`
   - `npm run lint`
   - `npm run build`

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

- `VITE_BINANCE_WS_URL` Binance websocket endpoint.
- `VITE_COINBASE_WS_URL` Coinbase websocket endpoint.
- `VITE_MEMPOOL_TIP_URL` Mempool block tip endpoint.

## Feature parity highlights

- Punch/defense/cooldown/damage/KO logic ported to TypeScript.
- Block height polling with elapsed timer and flash indicators.
- Fixed mobile reference aspect ratio scene, with letterbox behavior instead of stretching.
- `Time` label click/tap toggles character alignment interaction.
- Browser-safe parsing/guards for live websocket payloads.

## Browser support target

See [`docs/browser-support-matrix.md`](docs/browser-support-matrix.md).

## Security documentation

- [`docs/security-note.md`](docs/security-note.md)
- [`docs/security-runbook.md`](docs/security-runbook.md)

## Hosting

This project is static-host friendly and deploys well on Vercel, Netlify, or Cloudflare Pages.
`vercel.json` includes baseline headers (CSP/HSTS/etc) and clickjacking protection.
