# WEB BTC Punch Up

This repository contains a **browser-based port** of **BTC Punch Up**: a boxing-themed Bitcoin market visualizer that animates live market pressure using exchange data.

The implementation is **client-heavy**: the browser connects to public market/block-height sources, computes game state locally, and renders the scene.

## Upstream / reference (original Android app)

The original Android project lives here:

- [`VirtusVerbis/BTC_Punch_Up` on GitHub](https://github.com/VirtusVerbis/BTC_Punch_Up)

## Repository layout

- [`web/`](web/) — the Vite + React + TypeScript web app (this is what you run and deploy)
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — CI (`lint`, `test`, `build`)
- [`.github/dependabot.yml`](.github/dependabot.yml) — dependency update automation
- [`web/vercel.json`](web/vercel.json) — baseline security headers for Vercel deployments

## Quick start (local)

From the repo root:

```powershell
cd web
npm install
npm run dev
```

Common scripts (see [`web/package.json`](web/package.json)):

```powershell
npm run lint
npm run test
npm run build
npm run preview
```

## Configuration

Environment variables are documented in:

- [`web/.env.example`](web/.env.example)

Copy that file to `web/.env` for local overrides.

## Documentation

- Web app overview: [`web/README.md`](web/README.md)
- Browser support matrix: [`web/docs/browser-support-matrix.md`](web/docs/browser-support-matrix.md)
- Security note: [`web/docs/security-note.md`](web/docs/security-note.md)
- Security runbook: [`web/docs/security-runbook.md`](web/docs/security-runbook.md)

## Deployment

This is a static-site friendly Vite build. A common path is:

1. Build: `cd web` then `npm run build`
2. Deploy the `web/dist` output to your host (Vercel/Netlify/Cloudflare Pages)

`web/vercel.json` includes baseline headers (CSP/HSTS/etc). CI runs on pushes/PRs via `.github/workflows/ci.yml`.

## Windows note (Git line endings)

If Git warns that **LF will be replaced by CRLF**, that is usually harmless on Windows and comes from line-ending normalization settings.

If you want to eliminate the warnings long-term, the typical fix is adding a `.gitattributes` policy (not required for the app to run).
