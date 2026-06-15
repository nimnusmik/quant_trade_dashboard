import type { PricePoint, SymbolChartModel, Trade, TradeMarker } from "@/lib/types";

const DEFAULT_INTERVAL = "1h";
const DEFAULT_LIMIT = 96;

export function getActiveChartSymbols(trades: Trade[]): string[] {
  const openSymbols = uniqueSorted(trades.filter((trade) => trade.status === "open").map((trade) => trade.symbol));

  if (openSymbols.length > 0) {
    return openSymbols;
  }

  return uniqueSorted(trades.map((trade) => trade.symbol));
}

export function getSymbolTradeMarkers(trades: Trade[], symbol: string): TradeMarker[] {
  const symbolTrades = trades.filter((trade) => trade.symbol === symbol);
  const openTrades = symbolTrades.filter((trade) => trade.status === "open");
  const markerTrades = openTrades.length > 0 ? openTrades : symbolTrades.slice(-1);

  return markerTrades
    .toSorted((left, right) => left.entryTime.localeCompare(right.entryTime))
    .map((trade) => ({
      id: trade.id,
      side: trade.side,
      status: trade.status,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      takeProfit: trade.takeProfit,
      stopLoss: trade.stopLoss,
      strategy: trade.strategy,
      timeframe: trade.timeframe,
    }));
}

export async function buildSymbolChartModels(trades: Trade[]): Promise<SymbolChartModel[]> {
  const symbols = getActiveChartSymbols(trades);

  return Promise.all(
    symbols.map(async (symbol) => {
      const symbolTrades = trades.filter((trade) => trade.symbol === symbol);
      const markers = getSymbolTradeMarkers(trades, symbol);
      const interval = markers[0]?.timeframe ?? symbolTrades[0]?.timeframe ?? DEFAULT_INTERVAL;
      const candles = await loadSymbolCandles(symbol, interval, symbolTrades);

      return {
        symbol,
        interval,
        candles,
        markers,
      };
    }),
  );
}

async function loadSymbolCandles(symbol: string, interval: string, trades: Trade[]): Promise<PricePoint[]> {
  try {
    const candles = await fetchBinanceKlines(symbol, normalizeBinanceInterval(interval), DEFAULT_LIMIT);
    if (candles.length > 0) {
      return candles;
    }
  } catch {
    // Keep the dashboard useful even when public market data is unavailable.
  }

  return buildFallbackPriceSeries(trades);
}

export async function fetchBinanceKlines(
  symbol: string,
  interval = DEFAULT_INTERVAL,
  limit = DEFAULT_LIMIT,
): Promise<PricePoint[]> {
  const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
  const response = await fetch(`https://api.binance.com/api/v3/klines?${params.toString()}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`Binance kline request failed for ${symbol}: ${response.status}`);
  }

  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((row) => {
    if (!Array.isArray(row) || row.length < 5) {
      return [];
    }

    return [
      {
        timestamp: new Date(Number(row[0])).toISOString(),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
      },
    ];
  });
}

function buildFallbackPriceSeries(trades: Trade[]): PricePoint[] {
  const anchorTrade = trades.toSorted((left, right) => left.entryTime.localeCompare(right.entryTime))[0];
  if (!anchorTrade) {
    return [];
  }

  const levels = trades.flatMap((trade) => [
    trade.entryPrice,
    trade.exitPrice,
    trade.takeProfit,
    trade.stopLoss,
  ]).filter((level): level is number => typeof level === "number" && Number.isFinite(level));
  const anchor = anchorTrade.entryPrice;
  const min = Math.min(...levels, anchor);
  const max = Math.max(...levels, anchor);
  const spread = Math.max(max - min, Math.abs(anchor) * 0.01, 0.01);
  const start = new Date(anchorTrade.entryTime).getTime();

  return Array.from({ length: 24 }, (_, index) => {
    const wobble = Math.sin(index / 2) * spread * 0.18;
    const trend = (index / 23 - 0.5) * spread * 0.25;
    const close = anchor + wobble + trend;

    return {
      timestamp: new Date(start + index * 60 * 60 * 1000).toISOString(),
      open: close - spread * 0.03,
      high: close + spread * 0.08,
      low: close - spread * 0.08,
      close,
    };
  });
}

function normalizeBinanceInterval(interval: string): string {
  const trimmed = interval.trim().toLowerCase();
  const supported = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d"]);
  return supported.has(trimmed) ? trimmed : DEFAULT_INTERVAL;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}
