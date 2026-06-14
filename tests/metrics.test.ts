import { describe, expect, it } from "vitest";
import type { Trade } from "@/lib/types";
import {
  calculateAveragePnl,
  calculateEquityCurve,
  calculateMaxDrawdown,
  calculateSummaryMetrics,
  calculateSymbolStats,
  calculateTotalRealizedPnl,
  calculateWinRate,
  getClosedTrades,
  getOpenTrades,
} from "@/lib/metrics";

const trades: Trade[] = [
  {
    id: "btc-win",
    symbol: "BTCUSDT",
    side: "long",
    status: "closed",
    entryTime: "2026-06-14T09:00:00Z",
    exitTime: "2026-06-14T10:00:00Z",
    entryPrice: 100,
    exitPrice: 110,
    realizedPnl: 10,
  },
  {
    id: "btc-loss",
    symbol: "BTCUSDT",
    side: "short",
    status: "closed",
    entryTime: "2026-06-14T10:00:00Z",
    exitTime: "2026-06-14T11:00:00Z",
    entryPrice: 110,
    exitPrice: 115,
    realizedPnl: -5,
  },
  {
    id: "xrp-open",
    symbol: "XRPUSDT",
    side: "long",
    status: "open",
    entryTime: "2026-06-14T11:00:00Z",
    entryPrice: 2.5,
    unrealizedPnl: 100,
  },
  {
    id: "eth-breakeven",
    symbol: "ETHUSDT",
    side: "long",
    status: "closed",
    entryTime: "2026-06-14T12:00:00Z",
    exitTime: "2026-06-14T13:00:00Z",
    entryPrice: 3500,
    exitPrice: 3500,
    realizedPnl: 0,
  },
];

describe("trade filters", () => {
  it("separates closed and open trades", () => {
    expect(getClosedTrades(trades).map((trade) => trade.id)).toEqual([
      "btc-win",
      "btc-loss",
      "eth-breakeven",
    ]);
    expect(getOpenTrades(trades).map((trade) => trade.id)).toEqual(["xrp-open"]);
  });
});

describe("summary metrics", () => {
  it("calculates realized pnl from closed trades only", () => {
    expect(calculateTotalRealizedPnl(trades)).toBe(5);
  });

  it("calculates win rate from closed trades only and treats breakeven as not winning", () => {
    expect(calculateWinRate(trades)).toBeCloseTo(1 / 3);
  });

  it("calculates average pnl from closed trades only", () => {
    expect(calculateAveragePnl(trades)).toBeCloseTo(5 / 3);
  });

  it("returns zero rates for empty closed-trade sets", () => {
    const openOnly = trades.filter((trade) => trade.status === "open");

    expect(calculateWinRate(openOnly)).toBe(0);
    expect(calculateAveragePnl(openOnly)).toBe(0);
    expect(calculateTotalRealizedPnl(openOnly)).toBe(0);
  });

  it("builds a complete summary object", () => {
    expect(calculateSummaryMetrics(trades)).toEqual({
      totalTrades: 4,
      closedTrades: 3,
      openTrades: 1,
      totalRealizedPnl: 5,
      winRate: 1 / 3,
      averagePnl: 5 / 3,
    });
  });
});

describe("symbol stats", () => {
  it("groups realized performance by symbol", () => {
    expect(calculateSymbolStats(trades)).toEqual([
      {
        symbol: "BTCUSDT",
        closedTrades: 2,
        openTrades: 0,
        totalRealizedPnl: 5,
        winRate: 0.5,
        averagePnl: 2.5,
      },
      {
        symbol: "ETHUSDT",
        closedTrades: 1,
        openTrades: 0,
        totalRealizedPnl: 0,
        winRate: 0,
        averagePnl: 0,
      },
      {
        symbol: "XRPUSDT",
        closedTrades: 0,
        openTrades: 1,
        totalRealizedPnl: 0,
        winRate: 0,
        averagePnl: 0,
      },
    ]);
  });
});

describe("equity and drawdown", () => {
  it("builds an equity curve ordered by exit time using closed trades only", () => {
    expect(calculateEquityCurve(trades)).toEqual([
      {
        tradeId: "btc-win",
        timestamp: "2026-06-14T10:00:00Z",
        pnl: 10,
        equity: 10,
      },
      {
        tradeId: "btc-loss",
        timestamp: "2026-06-14T11:00:00Z",
        pnl: -5,
        equity: 5,
      },
      {
        tradeId: "eth-breakeven",
        timestamp: "2026-06-14T13:00:00Z",
        pnl: 0,
        equity: 5,
      },
    ]);
  });

  it("calculates max drawdown from peak equity", () => {
    const curve = calculateEquityCurve(trades);

    expect(calculateMaxDrawdown(curve)).toBe(5);
  });
});
