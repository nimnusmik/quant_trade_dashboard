import { createClient } from "@supabase/supabase-js";
import type {
  MonitorStrategy,
  MonitorUniverse,
  PaperLeagueTeam,
  StrategyLeagueData,
  StrategyParams,
  StrictCandidate,
  Trade,
  TradeSide,
  TradeSource,
  TradeStatus,
} from "@/lib/types";

type JsonObject = Record<string, unknown>;

export type SupabaseTradeRow = {
  trade_id: string | null;
  ts: string;
  event_type?: string | null;
  strategy: string;
  symbol: string;
  timeframe: string | null;
  side: string | null;
  action: string | null;
  quantity: number | null;
  price: number | null;
  notional?: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  fee: number | null;
  status: string | null;
  reason?: string | null;
  raw: JsonObject | null;
};

export type SupabaseStrategyMetricRow = {
  ts: string;
  strategy: string;
  symbol: string;
  timeframe: string;
  side: string;
  total_trades: number | null;
  wins?: number | null;
  losses?: number | null;
  win_rate: number | null;
  total_pnl: number | null;
  avg_pnl: number | null;
  max_drawdown?: number | null;
  profit_factor: number | null;
  sharpe?: number | null;
  score: number | null;
  evidence_type: string | null;
  raw: JsonObject | null;
};

export type SupabaseMonitorUniverseRow = {
  ts: string;
  strategy: string;
  symbol: string;
  timeframe: string;
  side: string;
  candidate_type: string | null;
  evidence_type: string | null;
  score: number | null;
  reason: string | null;
  is_active: boolean | null;
  raw: JsonObject | null;
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function loadTradesFromSupabase(): Promise<Trade[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("trades")
    .select("trade_id, ts, event_type, strategy, symbol, timeframe, side, action, quantity, price, notional, pnl, pnl_pct, fee, status, reason, raw")
    .order("ts", { ascending: false });

  if (error) {
    throw new Error(`Failed to load trades from Supabase: ${error.message}`);
  }

  return (data ?? []).map((row) => mapTradeRow(row as SupabaseTradeRow));
}

export async function loadStrategyLeagueFromSupabase(): Promise<StrategyLeagueData | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("strategy_metrics")
    .select("ts, strategy, symbol, timeframe, side, total_trades, wins, losses, win_rate, total_pnl, avg_pnl, max_drawdown, profit_factor, sharpe, score, evidence_type, raw")
    .order("score", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to load strategy metrics from Supabase: ${error.message}`);
  }

  return mapStrategyMetricRows((data ?? []) as SupabaseStrategyMetricRow[]);
}

export async function loadMonitorUniverseFromSupabase(): Promise<MonitorUniverse | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("monitor_universe")
    .select("ts, strategy, symbol, timeframe, side, candidate_type, evidence_type, score, reason, is_active, raw")
    .eq("is_active", true)
    .order("strategy", { ascending: true })
    .order("symbol", { ascending: true })
    .order("timeframe", { ascending: true });

  if (error) {
    throw new Error(`Failed to load monitor universe from Supabase: ${error.message}`);
  }

  return mapMonitorUniverseRows((data ?? []) as SupabaseMonitorUniverseRow[]);
}

export function mapTradeRow(row: SupabaseTradeRow): Trade {
  const raw = row.raw ?? {};
  const status = asTradeStatus(row.status ?? raw.status, raw.exitTime ? "closed" : "open");
  const entryTime = asString(raw.entryTime) ?? row.ts;
  const entryPrice = asNumber(raw.entryPrice) ?? row.price ?? 0;
  const exitPrice = asNumber(raw.exitPrice);
  const realizedPnl = asNumber(raw.realizedPnl) ?? row.pnl ?? undefined;
  const realizedPnlPct = asNumber(raw.realizedPnlPct) ?? row.pnl_pct ?? undefined;

  return compactUndefined({
    id: row.trade_id ?? asString(raw.id) ?? `${row.strategy}:${row.symbol}:${row.ts}`,
    symbol: row.symbol,
    side: asTradeSide(row.side ?? raw.side),
    status,
    entryTime,
    exitTime: asString(raw.exitTime),
    entryPrice,
    exitPrice,
    quantity: row.quantity ?? asNumber(raw.quantity),
    realizedPnl: status === "closed" ? realizedPnl : undefined,
    realizedPnlPct: status === "closed" ? realizedPnlPct : undefined,
    unrealizedPnl: status === "open" ? realizedPnl : asNumber(raw.unrealizedPnl),
    unrealizedPnlPct: status === "open" ? realizedPnlPct : asNumber(raw.unrealizedPnlPct),
    takeProfit: asNumber(raw.takeProfit),
    stopLoss: asNumber(raw.stopLoss),
    fee: row.fee ?? asNumber(raw.fee),
    strategy: row.strategy,
    timeframe: row.timeframe ?? asString(raw.timeframe),
    entryReason: asString(raw.entryReason),
    exitReason: asString(raw.exitReason) ?? row.reason ?? undefined,
    source: asTradeSource(raw.source),
  });
}

export function mapStrategyMetricRows(rows: SupabaseStrategyMetricRow[]): StrategyLeagueData {
  const latestTs = rows.map((row) => row.ts).sort().at(-1) ?? "";
  const paperLeague: PaperLeagueTeam[] = [];
  const strictCandidates: StrictCandidate[] = [];

  for (const row of rows) {
    const raw = row.raw ?? {};
    if ((row.evidence_type ?? "paper") === "strict_backtest") {
      strictCandidates.push({
        timeframe: row.timeframe,
        strategy: row.strategy,
        symbol: row.symbol,
        label: asString(raw.label) ?? row.strategy,
        verdict: asString(raw.verdict) ?? "STRICT",
        fullTrades: asNumber(raw.fullTrades) ?? row.total_trades ?? 0,
        fullReturnPct: asNumber(raw.fullReturnPct) ?? 0,
        fullProfitFactor: asNumber(raw.fullProfitFactor) ?? 0,
        holdoutTrades: asNumber(raw.holdoutTrades) ?? 0,
        holdoutReturnPct: asNumber(raw.holdoutReturnPct) ?? 0,
        holdoutProfitFactor: asNumber(raw.holdoutProfitFactor) ?? 0,
        recentTrades: asNumber(raw.recentTrades) ?? 0,
        recentReturnPct: asNumber(raw.recentReturnPct) ?? 0,
        recentProfitFactor: asNumber(raw.recentProfitFactor) ?? 0,
        minReturnPct: asNumber(raw.minReturnPct) ?? 0,
        minProfitFactor: asNumber(raw.minProfitFactor) ?? 0,
      });
      continue;
    }

    paperLeague.push({
      rank: asNumber(raw.rank) ?? paperLeague.length + 1,
      teamKey: asString(raw.teamKey) ?? `${row.strategy}@${row.timeframe}:${row.symbol}:${row.side}`,
      strategy: row.strategy,
      symbol: row.symbol,
      timeframe: row.timeframe,
      side: row.side,
      trades: row.total_trades ?? 0,
      winRate: row.win_rate ?? 0,
      totalPnlPct: row.total_pnl ?? 0,
      averagePnlPct: row.avg_pnl ?? 0,
      profitFactor: row.profit_factor ?? 0,
      score: row.score ?? 0,
    });
  }

  return {
    source: {},
    updatedAt: latestTs,
    paperLeague: paperLeague.sort((a, b) => a.rank - b.rank || b.score - a.score),
    strictCandidates,
  };
}

export function mapMonitorUniverseRows(rows: SupabaseMonitorUniverseRow[]): MonitorUniverse {
  const activeRows = rows.filter((row) => row.is_active !== false);
  const symbols = sortedUnique(activeRows.map((row) => row.symbol));
  const intervals = sortTimeframes(sortedUnique(activeRows.map((row) => row.timeframe)));
  const updatedAt = activeRows.map((row) => row.ts).sort().at(-1) ?? "";
  const source = activeRows.map((row) => asString(row.raw?.source)).find(Boolean) ?? "supabase";
  const byStrategy = new Map<string, MonitorStrategy>();

  for (const row of activeRows) {
    const raw = row.raw ?? {};
    const existing = byStrategy.get(row.strategy) ?? {
      key: row.strategy,
      label: asString(raw.label) ?? row.strategy,
      intervals: [],
      symbols: [],
      paramsByInterval: {},
    };

    if (!existing.symbols.includes(row.symbol)) existing.symbols.push(row.symbol);
    if (!existing.intervals.includes(row.timeframe)) existing.intervals.push(row.timeframe);

    const params = raw.paramsByInterval;
    if (isRecord(params)) {
      existing.paramsByInterval = {
        ...existing.paramsByInterval,
        ...(params as Record<string, StrategyParams>),
      };
    }

    byStrategy.set(row.strategy, existing);
  }

  return {
    source,
    updatedAt,
    symbols,
    intervals,
    strategies: Array.from(byStrategy.values()).map((strategy) => ({
      ...strategy,
      symbols: sortedUnique(strategy.symbols),
      intervals: sortTimeframes(sortedUnique(strategy.intervals)),
    })),
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asTradeSide(value: unknown): TradeSide {
  return value === "short" ? "short" : "long";
}

function asTradeStatus(value: unknown, fallback: TradeStatus): TradeStatus {
  return value === "closed" || value === "open" ? value : fallback;
}

function asTradeSource(value: unknown): TradeSource | undefined {
  return value === "paper_trades_csv" || value === "google_sheet" || value === "sample" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function sortTimeframes(values: string[]): string[] {
  const order = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
  return [...values].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    }
    return a.localeCompare(b);
  });
}

function compactUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
