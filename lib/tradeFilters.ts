import type { Trade, TradeSide, TradeStatus } from "@/lib/types";

export type TradeFilters = {
  status?: TradeStatus | "all";
  symbol?: string;
  side?: TradeSide | "all";
  strategy?: string;
  timeframe?: string;
  search?: string;
};

export type TradeFilterOptions = {
  symbols: string[];
  strategies: string[];
  timeframes: string[];
};

function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getTradeFilterOptions(trades: Trade[]): TradeFilterOptions {
  return {
    symbols: uniqueSorted(trades.map((trade) => trade.symbol)),
    strategies: uniqueSorted(trades.map((trade) => trade.strategy)),
    timeframes: uniqueSorted(trades.map((trade) => trade.timeframe)),
  };
}

function matchesOptionalFilter(actual: string | undefined, expected: string | undefined): boolean {
  if (!expected || expected === "all") {
    return true;
  }

  return actual === expected;
}

function searchableText(trade: Trade): string {
  return [
    trade.id,
    trade.symbol,
    trade.side,
    trade.status,
    trade.strategy,
    trade.timeframe,
    trade.entryReason,
    trade.exitReason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  const search = filters.search?.trim().toLowerCase();

  return trades.filter((trade) => {
    if (!matchesOptionalFilter(trade.status, filters.status)) {
      return false;
    }
    if (!matchesOptionalFilter(trade.symbol, filters.symbol)) {
      return false;
    }
    if (!matchesOptionalFilter(trade.side, filters.side)) {
      return false;
    }
    if (!matchesOptionalFilter(trade.strategy, filters.strategy)) {
      return false;
    }
    if (!matchesOptionalFilter(trade.timeframe, filters.timeframe)) {
      return false;
    }
    if (search && !searchableText(trade).includes(search)) {
      return false;
    }

    return true;
  });
}
