# Bitcoin Conversion Tool (Fullstack)

A fullstack web app that converts fiat (USD, GBP, JPY) amounts into BTC using exchangerate.host.

## Architecture

- Backend: Vercel Serverless Functions (`/api`) using Node.js + TypeScript
- Frontend: Vue 3 + Vite + TypeScript (`/web`)

## Key decisions

- Uses `https://api.exchangerate.host/live` with `base=USD` and `symbols=BTC,GBP,JPY` in a single upstream request.
- Derives BTC-per-unit rates using Decimal arithmetic to avoid floating point precision issues.
- Caching:
  - In-memory cache with ~30 minute TTL for the warm function runtime
  - CDN caching via `Cache-Control: s-maxage` and `stale-while-revalidate` to reduce function + upstream hits.

## Backend API

### GET /api/btc

Query params:
- `currency`: `USD` | `GBP` | `JPY`
- `amount`: positive numeric string

Example:
```bash
curl "http://localhost:5173/api/btc?currency=USD&amount=1000"
```

### Run Commands:
1. Clone repo
2. Make exchangerate.host account, get API key
3. Set environment variable EXCHANGERATE_HOST_ACCESS_KEY in Vercel
4. Deploy to vercel
