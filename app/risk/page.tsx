import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { TradesTable } from "@/components/TradesTable";
import { formatCurrency } from "@/lib/format";
import { calculateEquityCurve, calculateMaxDrawdown, getClosedTrades } from "@/lib/metrics";
import { loadDashboardTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

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
          <p className="text-sm text-cyan-300">리스크</p>
          <h2 className="text-balance mt-2 text-3xl font-semibold text-white">리스크 스냅샷</h2>
          <p className="mt-2 text-pretty text-slate-400">종료된 페이퍼 거래 기준 초기 리스크 지표입니다.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="최대 낙폭" value={formatCurrency(maxDrawdown)} helper="실현 자산 고점 대비 저점 낙폭" />
          <MetricCard label="최악 거래" value={formatCurrency(worstTrade?.realizedPnl ?? 0)} helper={worstTrade?.symbol ?? "종료 거래 없음"} />
          <MetricCard label="최고 거래" value={formatCurrency(bestTrade?.realizedPnl ?? 0)} helper={bestTrade?.symbol ?? "종료 거래 없음"} />
        </section>

        <section className="space-y-4">
          <h3 className="text-balance text-lg font-semibold text-white">손익순 종료 거래</h3>
          <div className="overflow-x-auto">
            <TradesTable trades={sortedByPnl} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
