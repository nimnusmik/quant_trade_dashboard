import { AppShell } from "@/components/AppShell";
import { EquityChart } from "@/components/EquityChart";
import { GlowSparkline } from "@/components/GlowSparkline";
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

export const dynamic = "force-dynamic";

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
        {/* 히어로 — 실현손익 빅넘버 + 글로우 차트 + 정밀 KPI (design-lab 합성안 F) */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-800 p-6"
          style={{ background: "radial-gradient(120% 80% at 0% 0%, rgba(52,211,153,0.14), transparent 55%), #0b1120" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                실현손익 · 종료 거래 누적
              </p>
              <p
                className="mt-1 text-5xl font-extrabold leading-none tabular-nums text-emerald-300"
                style={{ textShadow: "0 0 26px rgba(52,211,153,0.45)" }}
              >
                {formatCurrency(summary.totalRealizedPnl)}
              </p>
              <p className="mt-2 max-w-xl text-pretty text-sm text-slate-400">
                실현 지표는 종료된 거래만 기준입니다. 미실현 손익이 승률·실현손익을 왜곡하지 않도록 오픈 포지션은 따로 봅니다.
              </p>
            </div>
            {/* 정밀 미니 KPI */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-right tabular-nums">
              {[
                { l: "승률", v: formatPercent(summary.winRate) },
                { l: "오픈 포지션", v: String(summary.openTrades) },
                { l: "평균 손익", v: formatCurrency(summary.averagePnl) },
                { l: "종료 거래", v: String(summary.closedTrades) },
              ].map((m) => (
                <div key={m.l}>
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">{m.l}</dt>
                  <dd className="text-sm font-semibold text-white">{m.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-5 h-20 w-full">
            <GlowSparkline points={equityCurve.map((point) => point.equity)} className="h-full w-full" />
          </div>

          {/* KPI 스트립 — 감시 범위 */}
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-800 sm:grid-cols-4">
            {[
              { l: "감시 종목", v: String(coverage.symbolCount) },
              { l: "가동 전략", v: String(coverage.strategyCount) },
              { l: "신호 주기", v: universe.intervals.join(" · ") },
              { l: "신호 조합", v: String(coverage.combinationCount), accent: true },
            ].map((m) => (
              <div key={m.l} className="bg-slate-950/70 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{m.l}</p>
                <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${m.accent ? "text-emerald-300" : "text-white"}`}>
                  {m.v}
                </p>
              </div>
            ))}
          </div>
        </section>

        <OverviewSymbolTabs charts={overviewCharts} />

        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <EquityChart points={equityCurve} />
          <div className="space-y-4">
            <div>
              <h2 className="text-balance text-lg font-semibold text-white">오픈 포지션</h2>
              <p className="text-sm text-slate-500">현재 보유 중인 페이퍼 포지션</p>
            </div>
            <div className="overflow-x-auto">
              <TradesTable trades={openTrades} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-balance text-lg font-semibold text-white">최근 종료 거래</h2>
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
