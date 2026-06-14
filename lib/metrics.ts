import type { EquityPoint, SummaryMetrics, SymbolStats, Trade } from "@/lib/types";

export function getClosedTrades(trades: Trade[]): Trade[] {
  return trades.filter((trade) => trade.status === "closed");
}

export function getOpenTrades(trades: Trade[]): Trade[] {
  return trades.filter((trade) => trade.status === "open");
}

function getRealizedPnl(trade: Trade): number {
  return trade.realizedPnl ?? 0;
}

export function calculateTotalRealizedPnl(trades: Trade[]): number {
  return getClosedTrades(trades).reduce(
    (total, trade) => total + getRealizedPnl(trade),
    0,
  );
}

export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  const winningTrades = closedTrades.filter((trade) => getRealizedPnl(trade) > 0);
  return winningTrades.length / closedTrades.length;
}

export function calculateAveragePnl(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  return calculateTotalRealizedPnl(closedTrades) / closedTrades.length;
}

export function calculateSummaryMetrics(trades: Trade[]): SummaryMetrics {
  return {
    totalTrades: trades.length,
    closedTrades: getClosedTrades(trades).length,
    openTrades: getOpenTrades(trades).length,
    totalRealizedPnl: calculateTotalRealizedPnl(trades),
    winRate: calculateWinRate(trades),
    averagePnl: calculateAveragePnl(trades),
  };
}

export function calculateSymbolStats(trades: Trade[]): SymbolStats[] {
  const symbols = Array.from(new Set(trades.map((trade) => trade.symbol))).sort();

  return symbols.map((symbol) => {
    const symbolTrades = trades.filter((trade) => trade.symbol === symbol);

    return {
      symbol,
      closedTrades: getClosedTrades(symbolTrades).length,
      openTrades: getOpenTrades(symbolTrades).length,
      totalRealizedPnl: calculateTotalRealizedPnl(symbolTrades),
      winRate: calculateWinRate(symbolTrades),
      averagePnl: calculateAveragePnl(symbolTrades),
    };
  });
}

export function calculateEquityCurve(trades: Trade[]): EquityPoint[] {
  let equity = 0;

  return getClosedTrades(trades)
    .filter((trade) => trade.exitTime !== undefined)
    .toSorted((left, right) => left.exitTime!.localeCompare(right.exitTime!))
    .map((trade) => {
      const pnl = getRealizedPnl(trade);
      equity += pnl;

      return {
        tradeId: trade.id,
        timestamp: trade.exitTime!,
        pnl,
        equity,
      };
    });
}

export function calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
  let peak = 0;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, peak - point.equity);
  }

  return maxDrawdown;
}
