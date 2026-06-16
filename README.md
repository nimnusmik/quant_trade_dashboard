# Quant Trade Dashboard

A Next.js dashboard for monitoring paper-trading performance.

## Current MVP

- Normalized trade data contract in `docs/data-contract.md`
- Sample trade data in `public/data/trades.json`
- Overview dashboard with realized PnL, win rate, open positions, average PnL, and an equity curve chart
- Trades, Symbols, and Risk pages
- Monitor page showing all runtime watchlist symbols, active strategies, signal intervals, and representative TP/SL params
- League page showing the live paper league at `strategy × symbol × timeframe × side` granularity plus separate S1~S100 STRICT backtest candidates
- Symbol charts with Binance candles plus entry, take-profit, and stop-loss level markers
- Interactive trade filters for status, side, symbol, strategy, timeframe, and free-text search
- Tested metric, filter, and symbol-chart helper calculations with Vitest

## Data flow

```text
raw paper_trades.csv -> scripts/export_trades_json.py -> public/data/trades.json
quant_trading monitor config -> scripts/export_monitor_universe.py -> public/data/monitor-universe.json
quant_trading reports/*.csv -> scripts/export_strategy_league_json.py -> public/data/strategy-league.json
public/data/*.json -> scripts/export_supabase_import_sql.py -> Supabase SQL Editor
Supabase tables -> Next.js dashboard, with public/data/*.json fallback
Binance public klines -> /symbols chart panels
```

The dashboard should read normalized dashboard-shaped data only. Source-specific ledger parsing belongs in export scripts, not in React components.

## Supabase deployment

If these environment variables are set, the dashboard reads Supabase first and falls back to `public/data/*.json` when Supabase is unavailable:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit service-role keys. For a no-secret manual import, generate SQL and paste it into Supabase SQL Editor:

```bash
python3 scripts/export_supabase_import_sql.py
```

Generated file:

```text
supabase/import-current-dashboard-data.sql
```

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
python3 scripts/export_monitor_universe.py
python3 scripts/export_strategy_league_json.py
```

Default source path:

```text
/Users/sunminkim/Desktop/projects/quant_trading/logs/paper_trades.csv
```

Default output path:

```text
public/data/trades.json
```

Default monitor-universe source path:

```text
/Users/sunminkim/Desktop/projects/quant_trading
```

Default monitor-universe output path:

```text
public/data/monitor-universe.json
```

Default league sources:

```text
/Users/sunminkim/Desktop/projects/quant_trading/reports/paper_strategy_timeframe_leaderboard.csv
/Users/sunminkim/Desktop/projects/quant_trading/reports/s1_to_s100_multisymbol_multitimeframe_strict.csv
```

Default league output path:

```text
public/data/strategy-league.json
```

## Metric rules

- Realized PnL uses closed trades only.
- Open trades are excluded from realized PnL and win rate.
- Win rate counts `realizedPnl > 0` as a win.
- Breakeven and losing closed trades are not wins.
- Equity curve is ordered by `exitTime` and accumulates realized PnL.
- Symbol chart panels prioritize open-position symbols. If there are no open positions, they show all traded symbols.
- TP/SL markers come from the ledger `tp` and `sl` columns exported as `takeProfit` and `stopLoss`.
- Monitor coverage is calculated from the exported runtime universe: watched symbols × strategy-specific active intervals.
- Paper strategy league ranking is evaluated as `strategy × symbol × timeframe × side`, not strategy-only averages.
- S1~S100 STRICT candidates are shown as backtest candidates and must be judged separately from live paper league evidence.
- Low-sample paper teams are explicitly warned because 1-trade winners should not outrank stable 30-trade teams without context.
