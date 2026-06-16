import { AppShell } from "@/components/AppShell";
import { EquityChart } from "@/components/EquityChart";
import { MetricCard } from "@/components/MetricCard";
import { OverviewSymbolTabs } from "@/components/OverviewSymbolTabs";
import { TradesTable } from "@/components/TradesTable";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  calculateEquityCurve,
  calculateSummaryMetrics,
  getClosedTrades,
  getOpenTrades,
} from "@/lib/metrics";
import { calculateMonitorCoverage, loadMonitorUniverse } from "@/lib/monitorUniverse";
import { buildOverviewSymbolChartModels } from "@/lib/symbolCharts";
import { loadDashboardTrades } from "@/lib/trades";

export default async function Home() {
  const trades = await loadDashboardTrades();
  const universe = await loadMonitorUniverse();
  const summary = calculateSummaryMetrics(trades);
  const coverage = calculateMonitorCoverage(universe);
  const equityCurve = calculateEquityCurve(trades);
  const overviewCharts = await buildOverviewSymbolChartModels(trades, universe);
  const openTrades = getOpenTrades(trades);
  const recentClosedTrades = getClosedTrades(trades).slice(-5).toReversed();

  return (
    <AppShell>
      <div className="space-y-8">
        <section>
          <p className="text-sm text-cyan-300">개요</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            트레이딩 상태 한눈에 보기
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            실현 지표는 종료된 거래만 기준으로 계산합니다. 미실현 손익이 승률이나 실현손익을 왜곡하지 않도록 오픈 포지션은 따로 봅니다.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="실현손익" value={formatCurrency(summary.totalRealizedPnl)} helper="종료 거래 기준" />
          <MetricCard label="승률" value={formatPercent(summary.winRate)} helper={`${summary.closedTrades} 개 종료 거래`} />
          <MetricCard label="오픈 포지션" value={String(summary.openTrades)} helper="미실현손익 제외" />
          <MetricCard label="평균 손익" value={formatCurrency(summary.averagePnl)} helper="종료 거래 1건당" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="감시 종목" value={String(coverage.symbolCount)} helper="현재 신호 감시 목록" />
          <MetricCard label="가동 전략" value={String(coverage.strategyCount)} helper="활성 전략 목록" />
          <MetricCard label="신호 주기" value={universe.intervals.join(", ")} helper="예약 감시 주기" />
          <MetricCard label="신호 체크 조합" value={String(coverage.combinationCount)} helper="종목 × 전략 × 주기" />
        </section>

        <OverviewSymbolTabs charts={overviewCharts} />

        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <EquityChart points={equityCurve} />
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">오픈 포지션</h2>
              <p className="text-sm text-slate-500">현재 보유 중인 페이퍼 포지션</p>
            </div>
            <div className="overflow-x-auto">
              <TradesTable trades={openTrades} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">최근 종료 거래</h2>
            <p className="text-sm text-slate-500">최근 청산 기록</p>
          </div>
          <div className="overflow-x-auto">
            <TradesTable trades={recentClosedTrades} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
