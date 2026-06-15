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

    const strategy = trade.strategy ?? "알 수 없음";
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

    const strategy = trade.strategy ?? "알 수 없음";
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
      verdict: "대기",
      worksBecause: [],
      failsBecause: [],
      suggestedAction: "판단할 거래가 더 쌓일 때까지 기다립니다.",
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
    `${strategy.totalRealizedPnl >= 0 ? "플러스" : "마이너스"} 손익 ${strategy.totalRealizedPnl.toFixed(2)} USDT, 종료 거래 ${strategy.trades}건 기준입니다.`,
    `Profit Factor ${formatNumber(strategy.profitFactor)}, 승률 ${(strategy.winRate * 100).toFixed(1)}%라서 이긴 거래가 손실을 충분히 상쇄하는지 확인할 수 있습니다.`,
  ];

  if (best) {
    worksBecause.push(`가장 크게 기여한 종목은 ${best}입니다.`);
  }
  const strategyLens = getStrategyLens(strategy.strategy, dominantSide);
  if (strategyLens.works) {
    worksBecause.push(strategyLens.works);
  }

  const failsBecause = [];
  if (strategy.winRate < 0.3) {
    failsBecause.push("승률이 낮아서, 이기는 거래가 전략을 끌고 가기 전에 많은 신호가 먼저 손절됩니다.");
  }
  if (strategy.profitFactor < 1) {
    failsBecause.push("Profit Factor가 1.00 아래라서 전체적으로 수익보다 손실이 더 큽니다.");
  }
  if (worst) {
    failsBecause.push(`가장 크게 손실을 낸 종목은 ${worst}입니다.`);
  }
  if (strategyLens.fails) {
    failsBecause.push(strategyLens.fails);
  }
  if (failsBecause.length === 0) {
    failsBecause.push("주요 리스크는 표본 안정성입니다. 새 거래에서도 같은 우위가 유지되는지 계속 확인해야 합니다.");
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
    return "선두";
  }
  if (strategy.totalRealizedPnl > 0 && strategy.profitFactor >= 1.2) {
    return "작동 중";
  }
  if (strategy.totalRealizedPnl > 0) {
    return "소폭 우위";
  }
  if (strategy.profitFactor < 0.7 || strategy.totalRealizedPnl < -5) {
    return "손실 주범";
  }
  return "약함 / 필터 필요";
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
    return "현재 1위 전략으로 유지하되, 강한 종목 위주로 좁히고 새 거래에서도 우위가 유지되는지 계속 확인합니다.";
  }
  if (strategy.totalRealizedPnl > 0) {
    return "계속 돌리되, 플러스 손익에 기여하는 종목만 우선 승격합니다.";
  }
  if (strategy.totalRealizedPnl < -5) {
    return "최근 구간 검증이 좋아질 때까지 watch-only로 내리거나 약한 전략-종목 조합을 제외합니다.";
  }
  return "넓게 켜기보다는 관찰용 증거로만 두고, 거래 수가 더 쌓인 뒤 판단합니다.";
}

function getStrategyLens(strategy: string, dominantSide: TradeSide): { works?: string; fails?: string } {
  if (strategy.includes("Relative_Strength")) {
    return {
      works: `상대강도 로테이션은 종목 간 힘 차이가 벌어지는 장에서 유리합니다. 특히 ${dominantSide === "short" ? "숏" : "롱"} 신호가 전체 장세와 맞을 때 성과가 좋아집니다.`,
      fails: "다만 알트 전체가 동시에 반등하거나 급락하면 상대강도 신호가 늦게 반응해서 실패할 수 있습니다.",
    };
  }
  if (strategy.includes("VWAP")) {
    return {
      works: "VWAP 바운스는 가격이 공정가치 근처를 반복적으로 지키는 평균회귀 장에서 잘 작동합니다.",
      fails: "한 방향 추세나 risk-off 급락장에서는 반등이 유지되지 않아 손절이 빠르게 모일 수 있습니다.",
    };
  }
  if (strategy.includes("EMA_Cross") || strategy.includes("Triple_EMA")) {
    return {
      works: "EMA 추세 로직은 교차 확인 이후에도 움직임이 계속 이어질 때 잘 작동합니다.",
      fails: "횡보장에서는 확인 신호가 늦게 나와 잦은 속임수 진입이 생기기 쉽습니다.",
    };
  }
  if (strategy.includes("RSI")) {
    return {
      works: "RSI 극단값 전략은 과열/과매도 이후 실제 반전이 나올 때 잘 맞습니다.",
      fails: "강한 추세에서는 너무 빨리 들어갈 수 있습니다. 과매도는 더 과매도로, 과매수는 더 상승으로 이어질 수 있습니다.",
    };
  }
  if (strategy.includes("BB_Squeeze")) {
    return {
      works: "볼린저 스퀴즈는 변동성 확장이 돌파 방향으로 이어질 때 잘 작동합니다.",
      fails: "가짜 돌파가 핵심 약점입니다. 변동성 확장이 바로 식지 않는지 확인이 필요합니다.",
    };
  }
  if (strategy.includes("MACD")) {
    return {
      works: "MACD+거래량 전략은 모멘텀과 참여가 같이 커질 때 잘 작동합니다.",
      fails: "거래량 급증이 지속 신호가 아니라 마지막 소진 움직임이면 약해집니다.",
    };
  }
  if (strategy.includes("Retest")) {
    return {
      works: "리테스트 돌파 로직은 깨진 가격대가 이후 지지/저항으로 바뀔 때 잘 작동합니다.",
      fails: "리테스트가 지속 진입이 아니라 완전한 반전으로 바뀌면 실패합니다.",
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
