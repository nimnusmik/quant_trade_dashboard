import type { StrategyPerformance, StrategySymbolPerformance, SymbolPerformance, Trade, TradeSide } from "@/lib/types";

const DEFAULT_SIDE_COUNTS: Record<TradeSide, number> = { long: 0, short: 0 };

type MutableStrategyPerformance = Omit<
  StrategyPerformance,
  "symbols" | "bestSymbols" | "worstSymbols" | "diagnosis"
> & {
  symbols: Set<string>;
  bySymbol: Map<string, SymbolPerformance>;
};

export function calculateStrategyLeaderboard(trades: Trade[]): StrategyPerformance[] {
  const byStrategy = new Map<string, MutableStrategyPerformance>();

  for (const trade of trades) {
    if (trade.status !== "closed" || trade.realizedPnl === undefined) {
      continue;
    }

    const strategy = trade.strategy ?? "Unknown";
    const current = byStrategy.get(strategy) ?? createMutableStrategy(strategy);

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

    updateSymbolPerformance(current.bySymbol, trade);
    byStrategy.set(strategy, current);
  }

  const ranked = Array.from(byStrategy.values())
    .map(toStrategyPerformanceWithoutDiagnosis)
    .sort((a, b) => (
      b.totalRealizedPnl - a.totalRealizedPnl ||
      b.profitFactor - a.profitFactor ||
      b.winRate - a.winRate
    ));

  return ranked.map((strategy, index) => ({
    ...strategy,
    diagnosis: diagnoseStrategy(strategy, index),
  }));
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
    updateSymbolPerformance(bySymbol, trade);
  }

  return rankSymbols(Array.from(bySymbol.values()));
}

export function calculateStrategySymbolMatrix(trades: Trade[]): StrategySymbolPerformance[] {
  const byPair = new Map<string, StrategySymbolPerformance>();

  for (const trade of trades) {
    if (trade.status !== "closed" || trade.realizedPnl === undefined) {
      continue;
    }

    const strategy = trade.strategy ?? "Unknown";
    const key = `${strategy}::${trade.symbol}`;
    const current = byPair.get(key) ?? {
      strategy,
      symbol: trade.symbol,
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalRealizedPnl: 0,
      averagePnl: 0,
      profitFactor: 0,
      grossWin: 0,
      grossLoss: 0,
      sides: { ...DEFAULT_SIDE_COUNTS },
      verdict: "Mixed",
    };

    current.trades += 1;
    current.totalRealizedPnl += trade.realizedPnl;
    current.sides[trade.side] += 1;
    if (trade.realizedPnl > 0) {
      current.wins += 1;
      current.grossWin += trade.realizedPnl;
    } else {
      current.losses += 1;
      current.grossLoss += Math.abs(trade.realizedPnl);
    }

    current.winRate = current.trades > 0 ? current.wins / current.trades : 0;
    current.averagePnl = current.trades > 0 ? current.totalRealizedPnl / current.trades : 0;
    current.profitFactor = calculateProfitFactor(current.grossWin, current.grossLoss);
    current.verdict = getPairVerdict(current);
    byPair.set(key, current);
  }

  return Array.from(byPair.values()).sort((a, b) => (
    b.totalRealizedPnl - a.totalRealizedPnl ||
    b.profitFactor - a.profitFactor ||
    a.strategy.localeCompare(b.strategy) ||
    a.symbol.localeCompare(b.symbol)
  ));
}

function createMutableStrategy(strategy: string): MutableStrategyPerformance {
  return {
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
    bySymbol: new Map<string, SymbolPerformance>(),
  };
}

function toStrategyPerformanceWithoutDiagnosis(strategy: MutableStrategyPerformance): StrategyPerformance {
  const symbolStats = rankSymbols(Array.from(strategy.bySymbol.values()));
  return {
    ...strategy,
    symbols: Array.from(strategy.symbols).sort(),
    winRate: strategy.trades > 0 ? strategy.wins / strategy.trades : 0,
    averagePnl: strategy.trades > 0 ? strategy.totalRealizedPnl / strategy.trades : 0,
    profitFactor: calculateProfitFactor(strategy.grossWin, strategy.grossLoss),
    bestSymbols: symbolStats.filter((symbol) => symbol.totalRealizedPnl > 0).slice(0, 3),
    worstSymbols: [...symbolStats].reverse().filter((symbol) => symbol.totalRealizedPnl < 0).slice(0, 3),
    diagnosis: {
      verdict: "Pending",
      worksBecause: [],
      failsBecause: [],
      suggestedAction: "Wait for more evidence.",
    },
  };
}

function updateSymbolPerformance(bySymbol: Map<string, SymbolPerformance>, trade: Trade): void {
  if (trade.realizedPnl === undefined) {
    return;
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

function rankSymbols(symbols: SymbolPerformance[]): SymbolPerformance[] {
  return symbols.sort((a, b) => b.totalRealizedPnl - a.totalRealizedPnl || b.winRate - a.winRate);
}

function diagnoseStrategy(strategy: StrategyPerformance, rankIndex: number): StrategyPerformance["diagnosis"] {
  const verdict = getVerdict(strategy, rankIndex);
  const best = strategy.bestSymbols.map((symbol) => symbol.symbol).join(", ");
  const worst = strategy.worstSymbols.map((symbol) => symbol.symbol).join(", ");
  const dominantSide = strategy.sides.short > strategy.sides.long ? "short" : "long";

  const worksBecause = [
    `${strategy.totalRealizedPnl >= 0 ? "Positive" : "Negative"} PnL ${strategy.totalRealizedPnl.toFixed(2)} USDT with ${strategy.trades} closed trades.`,
    `Profit factor ${formatNumber(strategy.profitFactor)} and win rate ${(strategy.winRate * 100).toFixed(1)}% show whether wins are large enough to offset losses.`,
  ];

  if (best) {
    worksBecause.push(`Best contribution came from ${best}.`);
  }
  const strategyLens = getStrategyLens(strategy.strategy, dominantSide);
  if (strategyLens.works) {
    worksBecause.push(strategyLens.works);
  }

  const failsBecause = [];
  if (strategy.winRate < 0.3) {
    failsBecause.push("Low win rate means many signals are being stopped out before the winners can carry the strategy.");
  }
  if (strategy.profitFactor < 1) {
    failsBecause.push("Profit factor below 1.00 means losses are larger than wins overall.");
  }
  if (worst) {
    failsBecause.push(`Worst drag came from ${worst}.`);
  }
  if (strategyLens.fails) {
    failsBecause.push(strategyLens.fails);
  }
  if (failsBecause.length === 0) {
    failsBecause.push("Main risk is sample stability: keep checking whether the same edge persists on new trades.");
  }

  return {
    verdict,
    worksBecause,
    failsBecause,
    suggestedAction: getSuggestedAction(strategy, rankIndex),
  };
}

function getVerdict(strategy: StrategyPerformance, rankIndex: number): string {
  if (rankIndex === 0 && strategy.totalRealizedPnl > 0) {
    return "Leading";
  }
  if (strategy.totalRealizedPnl > 0 && strategy.profitFactor >= 1.2) {
    return "Working";
  }
  if (strategy.totalRealizedPnl > 0) {
    return "Marginally positive";
  }
  if (strategy.profitFactor < 0.7 || strategy.totalRealizedPnl < -5) {
    return "Dragging";
  }
  return "Weak / needs filtering";
}

function getPairVerdict(pair: StrategySymbolPerformance): StrategySymbolPerformance["verdict"] {
  if (pair.totalRealizedPnl > 0 && pair.profitFactor >= 1.5 && pair.winRate >= 0.4) {
    return "Strong";
  }
  if (pair.totalRealizedPnl > 0) {
    return "Promising";
  }
  if (pair.totalRealizedPnl < 0 && pair.profitFactor < 1) {
    return "Weak";
  }
  return "Mixed";
}

function getSuggestedAction(strategy: StrategyPerformance, rankIndex: number): string {
  if (rankIndex === 0 && strategy.totalRealizedPnl > 0) {
    return "keep as the current champion, but narrow it to its strongest symbols and continue monitoring fresh trades.";
  }
  if (strategy.totalRealizedPnl > 0) {
    return "keep running, but promote only the symbols that are contributing positive PnL.";
  }
  if (strategy.totalRealizedPnl < -5) {
    return "move to watch-only or cut weak symbol pairs until a recent-window validation improves.";
  }
  return "keep as watchlist evidence only; require more trades before broad enablement.";
}

function getStrategyLens(strategy: string, dominantSide: TradeSide): { works?: string; fails?: string } {
  if (strategy.includes("Relative_Strength")) {
    return {
      works: `Relative-strength rotation is benefiting from cross-asset dispersion, especially when ${dominantSide} signals align with the broader regime.`,
      fails: "It can still fail on sudden reversals because relative strength often lags when the whole alt basket snaps back together.",
    };
  }
  if (strategy.includes("VWAP")) {
    return {
      works: "VWAP bounce can work in mean-reverting sessions where price repeatedly respects fair value.",
      fails: "It struggles in one-directional trend or risk-off dumps because bounces do not hold and stops cluster quickly.",
    };
  }
  if (strategy.includes("EMA_Cross") || strategy.includes("Triple_EMA")) {
    return {
      works: "EMA trend logic works when moves persist after crossover confirmation.",
      fails: "It tends to whipsaw in choppy ranges because confirmation arrives after part of the move has already happened.",
    };
  }
  if (strategy.includes("RSI")) {
    return {
      works: "RSI extreme logic can catch stretched markets when exhaustion actually reverses.",
      fails: "It can be early in strong trends: oversold can stay oversold and overbought can keep grinding higher.",
    };
  }
  if (strategy.includes("BB_Squeeze")) {
    return {
      works: "Bollinger squeeze works when volatility expansion follows the breakout direction.",
      fails: "False breakouts are the main weakness; it needs confirmation that expansion is not immediately fading.",
    };
  }
  if (strategy.includes("MACD")) {
    return {
      works: "MACD plus volume works when momentum and participation expand together.",
      fails: "It weakens when volume spikes are exhaustion moves instead of continuation signals.",
    };
  }
  if (strategy.includes("Retest")) {
    return {
      works: "Retest breakout logic works when broken levels turn into support/resistance after the first move.",
      fails: "It fails when retests become full reversals rather than continuation entries.",
    };
  }
  return {};
}

function calculateProfitFactor(grossWin: number, grossLoss: number): number {
  if (grossLoss === 0) {
    return grossWin > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return grossWin / grossLoss;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(2);
}
