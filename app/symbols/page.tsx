import { AppShell } from "@/components/AppShell";
import { formatCurrency, formatPercent } from "@/lib/format";
import { calculateSymbolStats } from "@/lib/metrics";
import { loadDashboardTrades } from "@/lib/trades";

export default async function SymbolsPage() {
  const trades = await loadDashboardTrades();
  const stats = calculateSymbolStats(trades);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-cyan-300">Symbols</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Symbol performance</h2>
          <p className="mt-2 text-slate-400">Closed-trade realized performance grouped by symbol.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3 text-right">Closed</th>
                <th className="px-4 py-3 text-right">Open</th>
                <th className="px-4 py-3 text-right">Realized PnL</th>
                <th className="px-4 py-3 text-right">Win Rate</th>
                <th className="px-4 py-3 text-right">Avg PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.map((stat) => (
                <tr key={stat.symbol} className="text-slate-200">
                  <td className="px-4 py-3 font-medium text-white">{stat.symbol}</td>
                  <td className="px-4 py-3 text-right">{stat.closedTrades}</td>
                  <td className="px-4 py-3 text-right">{stat.openTrades}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(stat.totalRealizedPnl)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(stat.winRate)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(stat.averagePnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
