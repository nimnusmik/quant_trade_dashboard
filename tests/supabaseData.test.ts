import { describe, expect, it } from "vitest";
import {
  mapMonitorUniverseRows,
  mapStrategyMetricRows,
  mapTradeRow,
} from "@/lib/supabaseData";

describe("Supabase data mapping", () => {
  it("maps a trades table row into the existing dashboard Trade shape", () => {
    expect(
      mapTradeRow({
        trade_id: "trade-1",
        ts: "2026-06-14T09:00:00Z",
        strategy: "S1_EMA_Cross",
        symbol: "BTCUSDT",
        timeframe: "1h",
        side: "long",
        status: "closed",
        action: "ENTRY_EXIT",
        quantity: 0.1,
        price: 100,
        pnl: 10,
        pnl_pct: 1.5,
        fee: 0.01,
        raw: {
          entryTime: "2026-06-14T09:00:00Z",
          exitTime: "2026-06-14T10:00:00Z",
          entryPrice: 100,
          exitPrice: 110,
          takeProfit: 120,
          stopLoss: 95,
          entryReason: "signal",
          exitReason: "tp",
          source: "paper_trades_csv",
        },
      }),
    ).toEqual({
      id: "trade-1",
      symbol: "BTCUSDT",
      side: "long",
      status: "closed",
      entryTime: "2026-06-14T09:00:00Z",
      exitTime: "2026-06-14T10:00:00Z",
      entryPrice: 100,
      exitPrice: 110,
      quantity: 0.1,
      realizedPnl: 10,
      realizedPnlPct: 1.5,
      takeProfit: 120,
      stopLoss: 95,
      fee: 0.01,
      strategy: "S1_EMA_Cross",
      timeframe: "1h",
      entryReason: "signal",
      exitReason: "tp",
      source: "paper_trades_csv",
    });
  });

  it("rebuilds paper league and strict candidates from strategy_metrics rows", () => {
    const data = mapStrategyMetricRows([
      {
        ts: "2026-06-16T00:00:00Z",
        strategy: "S8",
        symbol: "ETHUSDT",
        timeframe: "1h",
        side: "short",
        total_trades: 7,
        wins: 5,
        losses: 2,
        win_rate: 0.7143,
        total_pnl: 8.83,
        avg_pnl: 1.26,
        profit_factor: 5.17,
        score: 9,
        evidence_type: "paper",
        raw: { rank: 1, teamKey: "S8@1h:ETHUSDT:short" },
      },
      {
        ts: "2026-06-16T00:00:00Z",
        strategy: "S45",
        symbol: "XRPUSDT",
        timeframe: "5m",
        side: "long",
        total_trades: 265,
        win_rate: null,
        total_pnl: null,
        avg_pnl: null,
        profit_factor: null,
        score: null,
        evidence_type: "strict_backtest",
        raw: {
          label: "S45 평균회귀 #01",
          verdict: "STRICT",
          fullTrades: 265,
          fullReturnPct: 0.66,
          fullProfitFactor: 1.01,
          holdoutTrades: 60,
          holdoutReturnPct: 3.16,
          holdoutProfitFactor: 1.26,
          recentTrades: 35,
          recentReturnPct: 6.47,
          recentProfitFactor: 2.22,
          minReturnPct: 3.16,
          minProfitFactor: 1.26,
        },
      },
    ]);

    expect(data.updatedAt).toBe("2026-06-16T00:00:00Z");
    expect(data.paperLeague).toMatchObject([
      { rank: 1, teamKey: "S8@1h:ETHUSDT:short", strategy: "S8", symbol: "ETHUSDT" },
    ]);
    expect(data.strictCandidates).toMatchObject([
      { strategy: "S45", symbol: "XRPUSDT", timeframe: "5m", verdict: "STRICT" },
    ]);
  });

  it("rebuilds monitor universe from one row per strategy-symbol-timeframe", () => {
    const universe = mapMonitorUniverseRows([
      {
        ts: "2026-06-16T00:00:00Z",
        strategy: "S1_EMA_Cross",
        symbol: "BTCUSDT",
        timeframe: "1h",
        side: "long",
        candidate_type: "runtime_monitor",
        evidence_type: "monitor_config",
        score: null,
        reason: null,
        is_active: true,
        raw: {
          label: "EMA 크로스 추세추종",
          paramsByInterval: { "1h": { tp_pct: 0.05 } },
          source: "quant_trading",
        },
      },
      {
        ts: "2026-06-16T00:00:00Z",
        strategy: "S1_EMA_Cross",
        symbol: "ETHUSDT",
        timeframe: "1h",
        side: "long",
        candidate_type: "runtime_monitor",
        evidence_type: "monitor_config",
        score: null,
        reason: null,
        is_active: true,
        raw: {
          label: "EMA 크로스 추세추종",
          paramsByInterval: { "1h": { tp_pct: 0.05 } },
          source: "quant_trading",
        },
      },
    ]);

    expect(universe).toEqual({
      source: "quant_trading",
      updatedAt: "2026-06-16T00:00:00Z",
      symbols: ["BTCUSDT", "ETHUSDT"],
      intervals: ["1h"],
      strategies: [
        {
          key: "S1_EMA_Cross",
          label: "EMA 크로스 추세추종",
          intervals: ["1h"],
          symbols: ["BTCUSDT", "ETHUSDT"],
          symbolsByInterval: { "1h": ["BTCUSDT", "ETHUSDT"] },
          paramsByInterval: { "1h": { tp_pct: 0.05 } },
        },
      ],
      combinations: [
        { strategy: "S1_EMA_Cross", symbol: "BTCUSDT", timeframe: "1h" },
        { strategy: "S1_EMA_Cross", symbol: "ETHUSDT", timeframe: "1h" },
      ],
    });
  });
});
