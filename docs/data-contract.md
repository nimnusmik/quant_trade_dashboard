# Trade Data Contract

The dashboard reads normalized trade records from `public/data/trades.json`.

Raw sources such as `paper_trades.csv` or Google Sheets should be converted into this shape before the UI reads them. The UI should not parse source-specific ledger columns directly.

## Trade

```ts
type Trade = {
  id: string;
  symbol: string;
  side: "long" | "short";
  status: "open" | "closed";
  entryTime: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity?: number;
  realizedPnl?: number;
  realizedPnlPct?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  fee?: number;
  strategy?: string;
  timeframe?: string;
  entryReason?: string;
  exitReason?: string;
  source?: "paper_trades_csv" | "google_sheet" | "sample";
};
```

## Metric rules

- Realized PnL includes only `closed` trades.
- Open trades are excluded from realized PnL and win rate.
- A winning trade is a closed trade with `realizedPnl > 0`.
- A losing/breakeven trade is a closed trade with `realizedPnl <= 0`.
- Equity curve is ordered by `exitTime`, then accumulates closed-trade `realizedPnl`.
- Symbol statistics group by `symbol` and use the same closed-trade rules.

## Source flow

```text
raw paper_trades.csv → scripts/export_trades_json.py → public/data/trades.json → Next.js dashboard
```
