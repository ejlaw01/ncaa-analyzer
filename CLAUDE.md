# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint (extends `next/core-web-vitals`)

No test framework is configured.

## Architecture

Next.js 14 App Router application that analyzes NCAA basketball over/under betting lines. It fetches live odds and scores from The Odds API, optionally enriches with historical data from Supabase, runs an analysis algorithm, and presents recommendations in a two-tab dashboard.

### Data Flow

1. **Fetch** — `/api/generate` calls The Odds API for today's games/odds and recent scores
2. **Store** — Upserts data to Supabase `games` table (skipped if Supabase not configured)
3. **Analyze** — `lib/analyzer.js` finds last 3 non-OT games per team, calculates average totals, counts overs (threshold: 4+ of 6), assigns strength ratings
4. **Cache** — Results stored in `lib/picksStore.js` (in-memory singleton)
5. **Display** — Client component fetches from `/api/picks` and renders in `PicksTable`

### Key Directories

- `app/api/` — Route handlers: `generate` (main pipeline), `picks` (cached results), `download` (Excel export)
- `lib/` — Business logic: `analyzer.js` (core algorithm), `oddsApi.js` (API client with 30-min cache), `supabase.js` (DB ops with graceful fallback), `utils.js` (conference mapping for 60+ teams)
- `components/` — `PicksTable` (two-tab table: Recommended Picks / All Games), `RefreshButton`, `DownloadButton`

### Important Patterns

- **Graceful Supabase degradation**: All Supabase operations are optional. If env vars are missing, the app works with API-only data.
- **In-memory caching**: The Odds API responses cached 30 min; generated picks cached in process memory. Supabase is only queried when in-memory cache is empty.
- **Merge strategy**: When combining API and Supabase data, API data wins on conflicts (freshness priority).
- **Path alias**: `@/*` maps to project root (configured in `jsconfig.json`).
- **Client components**: `app/page.js` and all components use `"use client"` directive.

## Environment Variables

- `ODDS_API_KEY` — Required. The Odds API key (free tier: 500 req/month)
- `NEXT_PUBLIC_APP_URL` — App base URL
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Optional. Enables historical data enrichment

## Deployment

Deployed on Vercel. A cron job (`vercel.json`) calls `/api/generate` daily at 11 AM UTC.
