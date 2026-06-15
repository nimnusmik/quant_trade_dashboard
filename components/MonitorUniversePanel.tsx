import type { MonitorStrategy, MonitorUniverse } from "@/lib/types";
import { calculateMonitorCoverage } from "@/lib/monitorUniverse";

const PARAM_LABELS: Record<string, string> = {
  ema_fast: "EMA fast",
  ema_slow: "EMA slow",
  rsi_period: "RSI",
  tp_pct: "TP",
  sl_pct: "SL",
  max_hold: "Max hold",
  cooldown: "Cooldown",
  vwap_tol: "VWAP tol",
  vol_mult: "Vol ×",
  retest_bars: "Retest bars",
  rs_window: "RS window",
  rel_long_threshold: "RS long",
  rel_short_threshold: "RS short",
};

function formatParamValue(key: string, value: string | number | boolean | null): string {
  if (value === null) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "on" : "off";
  }
  if (typeof value === "number" && (key.endsWith("_pct") || key.includes("threshold") || key.includes("tol"))) {
    return `${(value * 100).toFixed(2)}%`;
  }
  return String(value);
}

function strategyTotalCombinations(strategy: MonitorStrategy): number {
  return strategy.symbols.length * strategy.intervals.length;
}

function StrategyCard({ strategy }: { strategy: MonitorStrategy }) {
  const primaryInterval = strategy.intervals.includes("1h") ? "1h" : strategy.intervals[0];
  const params = primaryInterval ? strategy.paramsByInterval[primaryInterval] ?? {} : {};
  const importantParams = Object.entries(params).filter(([key]) => key in PARAM_LABELS).slice(0, 8);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">{strategy.key}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{strategy.label}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {strategy.symbols.length} symbols × {strategy.intervals.length} intervals = {strategyTotalCombinations(strategy)} checks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategy.intervals.map((interval) => (
            <span key={interval} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
              {interval}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {strategy.symbols.map((symbol) => (
          <span key={symbol} className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
            {symbol}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          대표 파라미터 {primaryInterval ? `· ${primaryInterval}` : ""}
        </p>
        {importantParams.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {importantParams.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-slate-500">{PARAM_LABELS[key]}</dt>
                <dd className="mt-1 font-semibold text-slate-100">{formatParamValue(key, value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No optimized params found for this active interval.</p>
        )}
      </div>
    </article>
  );
}

export function MonitorUniversePanel({ universe }: { universe: MonitorUniverse }) {
  const coverage = calculateMonitorCoverage(universe);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-cyan-300">Monitor Universe</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Running strategies and symbols
        </h2>
        <p className="mt-2 max-w-3xl text-slate-400">
          실시간 모니터가 훑는 전체 범위입니다. 종목, 타임프레임, 전략, 대표 TP/SL 파라미터를 한 화면에서 확인합니다.
        </p>
        <p className="mt-2 text-xs text-slate-600">Source: {universe.source} · Updated: {universe.updatedAt}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Symbols</p>
          <p className="mt-2 text-3xl font-semibold text-white">{coverage.symbolCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Strategies</p>
          <p className="mt-2 text-3xl font-semibold text-white">{coverage.strategyCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Intervals</p>
          <p className="mt-2 text-3xl font-semibold text-white">{coverage.intervalCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Signal Checks</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-200">{coverage.combinationCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">All monitored symbols</h3>
            <p className="text-sm text-slate-500">Price check and signal monitor watchlist</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {universe.intervals.map((interval) => (
              <span key={interval} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
                {interval}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {universe.symbols.map((symbol) => (
            <div key={symbol} className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 font-semibold text-white">
              {symbol}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">All running strategies</h3>
          <p className="text-sm text-slate-500">Each card shows its active intervals, covered symbols, and representative optimized params.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {universe.strategies.map((strategy) => (
            <StrategyCard key={strategy.key} strategy={strategy} />
          ))}
        </div>
      </section>
    </div>
  );
}
