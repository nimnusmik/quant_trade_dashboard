import { describe, expect, it } from "vitest";
import type { Trade } from "@/lib/types";
import { filterTrades, getTradeFilterOptions } from "@/lib/tradeFilters";

const trades: Trade[] = [
  {
    id: "btc-long-open",
    symbol: "BTCUSDT",
    side: "long",
    status: "open",
    entryTime: "2026-06-14T09:00:00Z",
    entryPrice: 100,
    strategy: "Breakout",
    timeframe: "1h",
  },
  {
    id: "xrp-short-closed",
    symbol: "XRPUSDT",
    side: "short",
    status: "closed",
    entryTime: "2026-06-14T10:00:00Z",
    exitTime: "2026-06-14T11:00:00Z",
    entryPrice: 2,
    exitPrice: 1.9,
    realizedPnl: 5,
    strategy: "Mean Reversion",
    timeframe: "15m",
  },
  {
    id: "btc-short-closed",
    symbol: "BTCUSDT",
    side: "short",
    status: "closed",
    entryTime: "2026-06-14T12:00:00Z",
    exitTime: "2026-06-14T13:00:00Z",
    entryPrice: 110,
    exitPrice: 120,
    realizedPnl: -10,
    strategy: "Breakout",
    timeframe: "1h",
  },
];

describe("trade filter options", () => {
  it("returns sorted unique symbols, strategies, and timeframes", () => {
    expect(getTradeFilterOptions(trades)).toEqual({
      symbols: ["BTCUSDT", "XRPUSDT"],
      strategies: ["Breakout", "Mean Reversion"],
      timeframes: ["15m", "1h"],
    });
  });
});

describe("trade filtering", () => {
  it("filters by status, symbol, side, strategy, and timeframe together", () => {
    expect(
      filterTrades(trades, {
        status: "closed",
        symbol: "BTCUSDT",
        side: "short",
        strategy: "Breakout",
        timeframe: "1h",
        search: "",
      }).map((trade) => trade.id),
    ).toEqual(["btc-short-closed"]);
  });

  it("matches search text against id, symbol, strategy, and exit reason", () => {
    const withReason: Trade[] = [
      ...trades,
      {
        id: "eth-stop-loss",
        symbol: "ETHUSDT",
        side: "long",
        status: "closed",
        entryTime: "2026-06-14T14:00:00Z",
        exitTime: "2026-06-14T15:00:00Z",
        entryPrice: 3000,
        exitPrice: 2970,
        realizedPnl: -30,
        strategy: "Pullback",
        exitReason: "SL reached",
      },
    ];

    expect(filterTrades(withReason, { search: "sl reached" }).map((trade) => trade.id)).toEqual([
      "eth-stop-loss",
    ]);
    expect(filterTrades(withReason, { search: "xrp" }).map((trade) => trade.id)).toEqual([
      "xrp-short-closed",
    ]);
  });
});
