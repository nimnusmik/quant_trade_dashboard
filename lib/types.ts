export type TradeSide = "long" | "short";

export type TradeStatus = "open" | "closed";

export type TradeSource = "paper_trades_csv" | "google_sheet" | "sample";

export type Trade = {
  id: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  entryTime: string;
  exitTime?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity?: number;
  realizedPnl?: number;
  realizedPnlPct?: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  fee?: number;
  strategy?: string;
  timeframe?: string;
  entryReason?: string;
  exitReason?: string;
  source?: TradeSource;
};

export type SummaryMetrics = {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  totalRealizedPnl: number;
  winRate: number;
  averagePnl: number;
};

export type SymbolStats = {
  symbol: string;
  closedTrades: number;
  openTrades: number;
  totalRealizedPnl: number;
  winRate: number;
  averagePnl: number;
};

export type EquityPoint = {
  tradeId: string;
  timestamp: string;
  equity: number;
  pnl: number;
};
