import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { TradesTable } from "@/components/TradesTable";
import { formatCurrency } from "@/lib/format";
import { calculateEquityCurve, calculateMaxDrawdown, getClosedTrades } from "@/lib/metrics";
import { loadDashboardTrades } from "@/lib/trades";

export default async function RiskPage() {
  const trades = await loadDashboardTrades();
  const closedTrades = getClosedTrades(trades);
  const equityCurve = calculateEquityCurve(trades);
  const maxDrawdown = calculateMaxDrawdown(equityCurve);
  const sortedByPnl = [...closedTrades].sort((left, right) => (left.realizedPnl ?? 0) - (right.realizedPnl ?? 0));
  const worstTrade = sortedByPnl[0];
  const bestTrade = sortedByPnl.at(-1);

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <p className="text-sm text-cyan-300">Risk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Risk snapshot</h2>
          <p className="mt-2 text-slate-400">Early risk metrics from closed paper trades.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Max Drawdown" value={formatCurrency(maxDrawdown)} helper="Peak-to-trough realized equity" />
          <MetricCard label="Worst Trade" value={formatCurrency(worstTrade?.realizedPnl ?? 0)} helper={worstTrade?.symbol ?? "No closed trades"} />
          <MetricCard label="Best Trade" value={formatCurrency(bestTrade?.realizedPnl ?? 0)} helper={bestTrade?.symbol ?? "No closed trades"} />
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Closed trades by PnL</h3>
          <div className="overflow-x-auto">
            <TradesTable trades={sortedByPnl} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
