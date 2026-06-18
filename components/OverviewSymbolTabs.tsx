"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PricePoint, SymbolChartModel, SymbolRuntimeStrategy, TradeMarker } from "@/lib/types";

type ChartPoint = PricePoint & {
  label: string;
};

function toChartPoints(candles: PricePoint[]): ChartPoint[] {
  return candles.map((candle) => ({
    ...candle,
    label: formatDateTime(candle.timestamp),
  }));
}

function formatPrice(value: number): string {
  if (Math.abs(value) < 10) {
    return `$${value.toFixed(4)}`;
  }

  return formatCurrency(value);
}

function pnlColor(value: number): string {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-300";
}

function markerColor(marker: TradeMarker): string {
  return marker.side === "long" ? "#22c55e" : "#f97316";
}

function compactStrategies(strategies: SymbolRuntimeStrategy[] | undefined): SymbolRuntimeStrategy[] {
  return (strategies ?? []).slice(0, 18);
}

function StrategyChips({ strategies }: { strategies: SymbolRuntimeStrategy[] | undefined }) {
  const visible = compactStrategies(strategies);
  const extra = Math.max((strategies?.length ?? 0) - visible.length, 0);

  if (!strategies || strategies.length === 0) {
    return <p className="text-sm text-slate-500">현재 이 종목에 연결된 실시간 운영 전략이 없습니다.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((strategy) => (
        <span
          key={strategy.key}
          className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-2.5 py-1 text-xs font-semibold text-indigo-100"
          title={strategy.label}
        >
          {strategy.key} <span className="font-normal text-indigo-200/70">{strategy.intervals.join("/")}</span>
        </span>
      ))}
      {extra > 0 ? (
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
          +{extra}개 더
        </span>
      ) : null}
    </div>
  );
}

const PANEL_ID = "overview-symbol-tabpanel";

function TabButton({
  chart,
  active,
  panelId,
  tabRef,
  onSelect,
  onKeyDown,
}: {
  chart: SymbolChartModel;
  active: boolean;
  panelId: string;
  tabRef: (node: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const latest = chart.candles.at(-1);
  const first = chart.candles.at(0);
  const changePct = first && latest ? ((latest.close - first.close) / first.close) * 100 : 0;
  const strategyCount = chart.activeStrategies?.length ?? 0;
  const hasOpen = chart.markers.some((marker) => marker.status === "open");

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${chart.symbol}`}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      ref={tabRef}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`min-w-[148px] rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        active
          ? "border-cyan-300/70 bg-cyan-300/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white">{chart.symbol}</span>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${hasOpen ? "bg-emerald-400" : strategyCount > 0 ? "bg-cyan-300" : "bg-slate-600"}`} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="text-xs text-slate-500">전략 {strategyCount}개</span>
        <span className={`text-xs font-semibold ${pnlColor(changePct)}`}>{changePct.toFixed(2)}%</span>
      </div>
    </button>
  );
}

function MarkerPanel({ marker }: { marker: TradeMarker }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{marker.strategy ?? "전략 미기록"}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${marker.side === "long" ? "bg-emerald-400/10 text-emerald-200" : "bg-orange-400/10 text-orange-200"}`}>
          {marker.side.toUpperCase()} · {marker.status === "open" ? "진행중" : "종료"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{marker.timeframe ?? "분봉 미기록"}</p>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">진입</p>
          <p className="mt-1 font-semibold text-cyan-200">{formatPrice(marker.entryPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">익절</p>
          <p className="mt-1 font-semibold text-emerald-300">{marker.takeProfit ? formatPrice(marker.takeProfit) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">손절</p>
          <p className="mt-1 font-semibold text-rose-300">{marker.stopLoss ? formatPrice(marker.stopLoss) : "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function OverviewSymbolTabs({ charts }: { charts: SymbolChartModel[] }) {
  const [activeSymbol, setActiveSymbol] = useState(charts[0]?.symbol ?? "");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeChart = useMemo(
    () => charts.find((chart) => chart.symbol === activeSymbol) ?? charts[0],
    [activeSymbol, charts],
  );

  if (!activeChart) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-slate-400">
        표시할 종목 차트가 아직 없습니다.
      </section>
    );
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = charts.length;
    if (count === 0) return;
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (index + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (index - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveSymbol(charts[next].symbol);
    tabRefs.current[next]?.focus();
  };

  const chartPoints = toChartPoints(activeChart.candles);
  const latest = chartPoints.at(-1);
  const openMarkers = activeChart.markers.filter((marker) => marker.status === "open");
  const headlineMarker = openMarkers[0] ?? activeChart.markers[0];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">실시간 운영 종목</p>
          <h2 className="mt-2 text-2xl font-semibold text-white lg:text-3xl">
            종목 탭으로 보는 전략 가동 차트
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            탭을 누르면 해당 종목의 가격 흐름, 현재 진입/익절/손절 기준선, 그리고 실제 운영 중인 전략 심볼을 바로 확인합니다.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">선택 종목 최근가</p>
          <p className="mt-1 text-2xl font-semibold text-cyan-100">{latest ? formatPrice(latest.close) : "—"}</p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="종목 선택"
        aria-orientation="horizontal"
        className="mt-5 flex gap-3 overflow-x-auto pb-2"
      >
        {charts.map((chart, index) => (
          <TabButton
            key={chart.symbol}
            chart={chart}
            active={chart.symbol === activeChart.symbol}
            panelId={PANEL_ID}
            tabRef={(node) => {
              tabRefs.current[index] = node;
            }}
            onSelect={() => setActiveSymbol(chart.symbol)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
          />
        ))}
      </div>

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`tab-${activeChart.symbol}`}
        tabIndex={0}
        className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.9fr] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500">{activeChart.interval} candles</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{activeChart.symbol}</h3>
            </div>
            {headlineMarker ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-200">
                {headlineMarker.strategy ?? "최근 마커"} · {headlineMarker.side.toUpperCase()}
              </span>
            ) : null}
          </div>
          <div className="h-[430px] min-w-0">
            <LineChart
              data={chartPoints}
              margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
              responsive
              style={{ width: "100%", height: "100%" }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" minTickGap={44} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
              <YAxis
                domain={["auto", "auto"]}
                stroke="#64748b"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(value) => formatPrice(Number(value))}
                tickLine={false}
                width={86}
              />
              <Tooltip
                cursor={{ stroke: "#22d3ee", strokeOpacity: 0.35 }}
                contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "14px", color: "#e2e8f0" }}
                formatter={(value, name) => [formatPrice(Number(value)), name === "close" ? "종가" : name]}
                labelStyle={{ color: "#94a3b8" }}
              />
              {activeChart.markers.map((marker) => (
                <ReferenceLine
                  key={`${marker.id}-entry`}
                  y={marker.entryPrice}
                  stroke={markerColor(marker)}
                  strokeDasharray="5 5"
                  label={{ value: `${marker.side.toUpperCase()} 진입`, fill: markerColor(marker), fontSize: 11 }}
                />
              ))}
              {activeChart.markers.map((marker) =>
                marker.takeProfit !== undefined ? (
                  <ReferenceLine key={`${marker.id}-tp`} y={marker.takeProfit} stroke="#34d399" strokeDasharray="3 3" label={{ value: "익절", fill: "#34d399", fontSize: 11 }} />
                ) : null,
              )}
              {activeChart.markers.map((marker) =>
                marker.stopLoss !== undefined ? (
                  <ReferenceLine key={`${marker.id}-sl`} y={marker.stopLoss} stroke="#fb7185" strokeDasharray="3 3" label={{ value: "손절", fill: "#fb7185", fontSize: 11 }} />
                ) : null,
              )}
              <Line type="monotone" dataKey="close" dot={false} stroke="#22d3ee" strokeWidth={2.4} activeDot={{ r: 5, fill: "#67e8f9", stroke: "#020617" }} />
            </LineChart>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-slate-500">LIVE STRATEGIES</p>
                <h3 className="mt-1 text-lg font-semibold text-white">운영 전략 심볼</h3>
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">
                {activeChart.activeStrategies?.length ?? 0}개
              </span>
            </div>
            <div className="mt-4">
              <StrategyChips strategies={activeChart.activeStrategies} />
            </div>
          </div>

          <div className="space-y-3">
            {activeChart.markers.length > 0 ? (
              activeChart.markers.map((marker) => <MarkerPanel key={marker.id} marker={marker} />)
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                현재 이 종목에는 표시할 진입 기준선이 없습니다. 그래도 전략 감시는 계속 진행 중입니다.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
