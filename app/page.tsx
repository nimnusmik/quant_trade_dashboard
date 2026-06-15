import { AppShell } from "@/components/AppShell";
import { EquityChart } from "@/components/EquityChart";
import { MetricCard } from "@/components/MetricCard";
import { TradesTable } from "@/components/TradesTable";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  calculateEquityCurve,
  calculateSummaryMetrics,
  getClosedTrades,
  getOpenTrades,
} from "@/lib/metrics";
import { calculateMonitorCoverage, loadMonitorUniverse } from "@/lib/monitorUniverse";
import { loadDashboardTrades } from "@/lib/trades";

export default async function Home() {
  const trades = await loadDashboardTrades();
  const universe = await loadMonitorUniverse();
  const summary = calculateSummaryMetrics(trades);
  const coverage = calculateMonitorCoverage(universe);
  const equityCurve = calculateEquityCurve(trades);
  const openTrades = getOpenTrades(trades);
  const recentClosedTrades = getClosedTrades(trades).slice(-5).toReversed();

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <p className="text-sm text-cyan-300">Overview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Trading health at a glance
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Realized metrics use closed trades only. Open positions are tracked separately so unrealized PnL does not pollute win rate or realized PnL.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Realized PnL" value={formatCurrency(summary.totalRealizedPnl)} helper="Closed trades only" />
          <MetricCard label="Win Rate" value={formatPercent(summary.winRate)} helper={`${summary.closedTrades} closed trades`} />
          <MetricCard label="Open Positions" value={String(summary.openTrades)} helper="Unrealized PnL excluded" />
          <MetricCard label="Avg PnL" value={formatCurrency(summary.averagePnl)} helper="Per closed trade" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Monitored Symbols" value={String(coverage.symbolCount)} helper="Current signal watchlist" />
          <MetricCard label="Running Strategies" value={String(coverage.strategyCount)} helper="Active strategy registry" />
          <MetricCard label="Signal Intervals" value={universe.intervals.join(", ")} helper="Scheduled checks" />
          <MetricCard label="Signal Checks" value={String(coverage.combinationCount)} helper="Symbol × strategy × interval" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <EquityChart points={equityCurve} />
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Open Positions</h2>
              <p className="text-sm text-slate-500">Current active paper trades</p>
            </div>
            <div className="overflow-x-auto">
              <TradesTable trades={openTrades} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent Closed Trades</h2>
            <p className="text-sm text-slate-500">Latest exits by sample/normalized data</p>
          </div>
          <div className="overflow-x-auto">
            <TradesTable trades={recentClosedTrades} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
