# Quant Trade Dashboard

A Next.js dashboard for monitoring paper-trading performance.

## Current MVP

- Normalized trade data contract in `docs/data-contract.md`
- Sample trade data in `public/data/trades.json`
- Overview dashboard with realized PnL, win rate, open positions, average PnL, and an equity curve chart
- Trades, Symbols, and Risk pages
- Interactive trade filters for status, side, symbol, strategy, timeframe, and free-text search
- Tested metric and filter calculations with Vitest

## Data flow

```text
raw paper_trades.csv -> scripts/export_trades_json.py -> public/data/trades.json -> Next.js dashboard
```

The dashboard should read normalized JSON only. Source-specific ledger parsing belongs in the export script, not in React components.

## Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Tests and validation

```bash
npm test
npm run lint
npm run build
```

## Real trading data export

Copy the environment template and adjust paths if needed:

```bash
cp .env.example .env
```

Then run:

```bash
python3 scripts/export_trades_json.py
```

Default source path:

```text
/Users/sunminkim/Desktop/projects/quant_trading/logs/paper_trades.csv
```

Default output path:

```text
public/data/trades.json
```

## Metric rules

- Realized PnL uses closed trades only.
- Open trades are excluded from realized PnL and win rate.
- Win rate counts `realizedPnl > 0` as a win.
- Breakeven and losing closed trades are not wins.
- Equity curve is ordered by `exitTime` and accumulates realized PnL.
