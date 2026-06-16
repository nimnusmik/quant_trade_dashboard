import { AppShell } from "@/components/AppShell";
import { SymbolCharts } from "@/components/SymbolCharts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { calculateSymbolStats } from "@/lib/metrics";
import { buildSymbolChartModels } from "@/lib/symbolCharts";
import { loadDashboardTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function SymbolsPage() {
  const trades = await loadDashboardTrades();
  const stats = calculateSymbolStats(trades);
  const charts = await buildSymbolChartModels(trades);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-cyan-300">종목 차트</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">종목별 성과</h2>
          <p className="mt-2 text-slate-400">
            활성 종목 차트에서 현재 가격 흐름과 진입가, 익절가, 손절가 기준선을 함께 확인합니다.
          </p>
        </div>
        <SymbolCharts charts={charts} />
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">종목</th>
                <th className="px-4 py-3 text-right">종료</th>
                <th className="px-4 py-3 text-right">오픈</th>
                <th className="px-4 py-3 text-right">실현손익</th>
                <th className="px-4 py-3 text-right">승률</th>
                <th className="px-4 py-3 text-right">평균손익</th>
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
