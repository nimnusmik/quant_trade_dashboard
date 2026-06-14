# Quant Trade Dashboard MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a Next.js dashboard that reads normalized paper-trade JSON and shows realized PnL, open positions, closed trades, symbol performance, and risk metrics.

**Architecture:** The first MVP is a frontend-only Next.js App Router application. A later Python export script converts raw `paper_trades.csv` into `public/data/trades.json`, keeping source parsing separate from UI and metric logic.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, Recharts later for charts.

---

## Phase 0: Bootstrap

- Initialize Next.js with TypeScript, Tailwind, ESLint, App Router, npm.
- Add Vitest and `npm test` script.
- Verify `npm run lint`, `npm test`, and `npm run build`.

## Phase 1: Data Contract

- Create `lib/types.ts` with `Trade`, `SummaryMetrics`, `SymbolStats`, and `EquityPoint`.
- Create `docs/data-contract.md` with normalized JSON rules.
- Create `public/data/trades.sample.json` and `public/data/trades.json`.

## Phase 2: Metric Logic with TDD

- Write failing tests in `tests/metrics.test.ts` before creating `lib/metrics.ts`.
- Implement closed/open filtering, realized PnL, win rate, average PnL, symbol stats, equity curve, and max drawdown.
- Run the focused test, then the full suite.

## Phase 3: Overview UI

- Replace the default landing page with dashboard summary cards.
- Use sample data from `public/data/trades.json` for the first screen.
- Add chart/table components after metric correctness is locked.

## Phase 4: CSV Export

- Add `scripts/export_trades_json.py` to convert the real paper ledger into normalized JSON.
- Keep raw trading repo files untouched.

## MVP Done Criteria

- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
- Dashboard can load sample `trades.json`.
- Metric definitions match `docs/data-contract.md`.
