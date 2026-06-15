import { describe, expect, it } from "vitest";
import { getActiveChartSymbols, getSymbolTradeMarkers } from "@/lib/symbolCharts";
import type { Trade } from "@/lib/types";

const trades: Trade[] = [
  {
    id: "closed-btc",
    symbol: "BTCUSDT",
    side: "long",
    status: "closed",
    entryTime: "2026-06-14T09:00:00Z",
    exitTime: "2026-06-14T13:00:00Z",
    entryPrice: 100_000,
    exitPrice: 101_500,
    realizedPnl: 15,
    takeProfit: 101_500,
    stopLoss: 99_500,
  },
  {
    id: "open-xrp",
    symbol: "XRPUSDT",
    side: "short",
    status: "open",
    entryTime: "2026-06-14T10:00:00Z",
    entryPrice: 2.5,
    takeProfit: 2.42,
    stopLoss: 2.56,
    strategy: "risk_off_short",
    timeframe: "1h",
  },
  {
    id: "open-eth",
    symbol: "ETHUSDT",
    side: "long",
    status: "open",
    entryTime: "2026-06-14T11:00:00Z",
    entryPrice: 3_500,
    takeProfit: 3_620,
    stopLoss: 3_450,
  },
];

describe("symbol chart helpers", () => {
  it("prioritizes symbols with open trades for chart panels", () => {
    expect(getActiveChartSymbols(trades)).toEqual(["ETHUSDT", "XRPUSDT"]);
  });

  it("falls back to all traded symbols when there are no open trades", () => {
    const closedOnly = trades.filter((trade) => trade.status === "closed");

    expect(getActiveChartSymbols(closedOnly)).toEqual(["BTCUSDT"]);
  });

  it("builds trade markers with entry, TP, and SL levels", () => {
    expect(getSymbolTradeMarkers(trades, "XRPUSDT")).toEqual([
      {
        id: "open-xrp",
        side: "short",
        status: "open",
        entryPrice: 2.5,
        takeProfit: 2.42,
        stopLoss: 2.56,
        strategy: "risk_off_short",
        timeframe: "1h",
      },
    ]);
  });

  it("shows the latest closed trade marker when a symbol has no open trade", () => {
    expect(getSymbolTradeMarkers(trades, "BTCUSDT")).toEqual([
      {
        id: "closed-btc",
        side: "long",
        status: "closed",
        entryPrice: 100_000,
        exitPrice: 101_500,
        takeProfit: 101_500,
        stopLoss: 99_500,
      },
    ]);
  });
});
