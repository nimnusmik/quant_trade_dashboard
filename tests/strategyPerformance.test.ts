import { describe, expect, it } from "vitest";
import {
  calculateStrategyLeaderboard,
  calculateStrategySymbolMatrix,
  calculateSymbolLeaderboard,
  getBestStrategy,
} from "@/lib/strategyPerformance";
import type { Trade } from "@/lib/types";

const trades: Trade[] = [
  {
    id: "s8-win",
    symbol: "BTCUSDT",
    strategy: "S8_Relative_Strength_Rotation",
    timeframe: "1h",
    side: "short",
    status: "closed",
    entryTime: "2026-06-01T00:00:00Z",
    exitTime: "2026-06-01T01:00:00Z",
    entryPrice: 100,
    exitPrice: 90,
    realizedPnl: 5,
  },
  {
    id: "s8-loss",
    symbol: "ETHUSDT",
    strategy: "S8_Relative_Strength_Rotation",
    timeframe: "1h",
    side: "short",
    status: "closed",
    entryTime: "2026-06-01T02:00:00Z",
    exitTime: "2026-06-01T03:00:00Z",
    entryPrice: 100,
    exitPrice: 102,
    realizedPnl: -1,
  },
  {
    id: "s2-loss",
    symbol: "BTCUSDT",
    strategy: "S2_VWAP_Bounce",
    timeframe: "1h",
    side: "long",
    status: "closed",
    entryTime: "2026-06-01T04:00:00Z",
    exitTime: "2026-06-01T05:00:00Z",
    entryPrice: 100,
    exitPrice: 99,
    realizedPnl: -2,
  },
  {
    id: "open-ignored",
    symbol: "XRPUSDT",
    strategy: "S1_EMA_Cross",
    timeframe: "1h",
    side: "long",
    status: "open",
    entryTime: "2026-06-01T06:00:00Z",
    entryPrice: 1,
  },
];

describe("strategy performance", () => {
  it("ranks closed-trade strategies by realized PnL", () => {
    expect(calculateStrategyLeaderboard(trades)).toMatchObject([
      {
        strategy: "S8_Relative_Strength_Rotation",
        trades: 2,
        wins: 1,
        winRate: 0.5,
        totalRealizedPnl: 4,
        averagePnl: 2,
        profitFactor: 5,
        symbols: ["BTCUSDT", "ETHUSDT"],
        bestSymbols: [{ symbol: "BTCUSDT", totalRealizedPnl: 5 }],
        worstSymbols: [{ symbol: "ETHUSDT", totalRealizedPnl: -1 }],
        diagnosis: {
          verdict: "Leading",
          worksBecause: expect.arrayContaining([expect.stringContaining("PnL")]),
          failsBecause: expect.arrayContaining([expect.stringContaining("ETHUSDT")]),
          suggestedAction: expect.stringContaining("keep"),
        },
      },
      {
        strategy: "S2_VWAP_Bounce",
        trades: 1,
        wins: 0,
        totalRealizedPnl: -2,
        profitFactor: 0,
      },
    ]);
  });

  it("returns the current best strategy", () => {
    expect(getBestStrategy(trades)?.strategy).toBe("S8_Relative_Strength_Rotation");
  });

  it("ranks symbols by realized PnL", () => {
    expect(calculateSymbolLeaderboard(trades)).toMatchObject([
      { symbol: "BTCUSDT", trades: 2, wins: 1, totalRealizedPnl: 3 },
      { symbol: "ETHUSDT", trades: 1, wins: 0, totalRealizedPnl: -1 },
    ]);
  });

  it("ranks strategy-symbol combinations", () => {
    expect(calculateStrategySymbolMatrix(trades)).toMatchObject([
      {
        strategy: "S8_Relative_Strength_Rotation",
        symbol: "BTCUSDT",
        trades: 1,
        wins: 1,
        winRate: 1,
        totalRealizedPnl: 5,
        verdict: "Strong",
      },
      {
        strategy: "S8_Relative_Strength_Rotation",
        symbol: "ETHUSDT",
        trades: 1,
        wins: 0,
        totalRealizedPnl: -1,
        verdict: "Weak",
      },
      {
        strategy: "S2_VWAP_Bounce",
        symbol: "BTCUSDT",
        trades: 1,
        wins: 0,
        totalRealizedPnl: -2,
        verdict: "Weak",
      },
    ]);
  });
});
