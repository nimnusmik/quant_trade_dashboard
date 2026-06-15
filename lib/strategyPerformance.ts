import type { StrategyPerformance, SymbolPerformance, Trade, TradeSide } from "@/lib/types";

const DEFAULT_SIDE_COUNTS: Record<TradeSide, number> = { long: 0, short: 0 };

type MutableStrategyPerformance = Omit<StrategyPerformance, "symbols"> & {
  symbols: Set<string>;
};

export function calculateStrategyLeaderboard(trades: Trade[]): StrategyPerformance[] {
  const byStrategy = new Map<string, MutableStrategyPerformance>();

  for (const trade of trades) {
    if (trade.status !== "closed" || trade.realizedPnl === undefined) {
      continue;
    }

    const strategy = trade.strategy ?? "Unknown";
    const current = byStrategy.get(strategy) ?? {
      strategy,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalRealizedPnl: 0,
      averagePnl: 0,
      profitFactor: 0,
      grossWin: 0,
      grossLoss: 0,
      symbols: new Set<string>(),
      sides: { ...DEFAULT_SIDE_COUNTS },
      lastExitTime: undefined,
    };

    current.trades += 1;
    current.totalRealizedPnl += trade.realizedPnl;
    current.symbols.add(trade.symbol);
    current.sides[trade.side] += 1;
    if (!current.lastExitTime || (trade.exitTime && trade.exitTime > current.lastExitTime)) {
      current.lastExitTime = trade.exitTime;
    }

    if (trade.realizedPnl > 0) {
      current.wins += 1;
      current.grossWin += trade.realizedPnl;
    } else {
      current.losses += 1;
      current.grossLoss += Math.abs(trade.realizedPnl);
    }

    byStrategy.set(strategy, current);
  }

  return Array.from(byStrategy.values())
    .map((strategy) => ({
      ...strategy,
      symbols: Array.from(strategy.symbols).sort(),
      winRate: strategy.trades > 0 ? strategy.wins / strategy.trades : 0,
      averagePnl: strategy.trades > 0 ? strategy.totalRealizedPnl / strategy.trades : 0,
      profitFactor: calculateProfitFactor(strategy.grossWin, strategy.grossLoss),
    }))
    .sort((a, b) => (
      b.totalRealizedPnl - a.totalRealizedPnl ||
      b.profitFactor - a.profitFactor ||
      b.winRate - a.winRate
    ));
}

export function getBestStrategy(trades: Trade[]): StrategyPerformance | undefined {
  return calculateStrategyLeaderboard(trades)[0];
}

export function calculateSymbolLeaderboard(trades: Trade[]): SymbolPerformance[] {
  const bySymbol = new Map<string, SymbolPerformance>();

  for (const trade of trades) {
    if (trade.status !== "closed" || trade.realizedPnl === undefined) {
      continue;
    }

    const current = bySymbol.get(trade.symbol) ?? {
      symbol: trade.symbol,
      trades: 0,
      wins: 0,
      winRate: 0,
      totalRealizedPnl: 0,
      averagePnl: 0,
    };

    current.trades += 1;
    current.totalRealizedPnl += trade.realizedPnl;
    if (trade.realizedPnl > 0) {
      current.wins += 1;
    }
    current.winRate = current.trades > 0 ? current.wins / current.trades : 0;
    current.averagePnl = current.trades > 0 ? current.totalRealizedPnl / current.trades : 0;
    bySymbol.set(trade.symbol, current);
  }

  return Array.from(bySymbol.values()).sort((a, b) => b.totalRealizedPnl - a.totalRealizedPnl);
}

function calculateProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0) {
    return grossWin > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return grossWin / grossLoss;
}
