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
  takeProfit?: number;
  stopLoss?: number;
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

export type PricePoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TradeMarker = {
  id: string;
  side: TradeSide;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  strategy?: string;
  timeframe?: string;
};

export type SymbolChartModel = {
  symbol: string;
  interval: string;
  candles: PricePoint[];
  markers: TradeMarker[];
};

export type StrategyParams = Record<string, string | number | boolean | null>;

export type MonitorStrategy = {
  key: string;
  label: string;
  intervals: string[];
  symbols: string[];
  paramsByInterval: Record<string, StrategyParams>;
};

export type MonitorUniverse = {
  source: string;
  updatedAt: string;
  symbols: string[];
  intervals: string[];
  strategies: MonitorStrategy[];
};

export type MonitorCoverage = {
  symbolCount: number;
  strategyCount: number;
  intervalCount: number;
  combinationCount: number;
};
