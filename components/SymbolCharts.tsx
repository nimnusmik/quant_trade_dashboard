"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint, SymbolChartModel, TradeMarker } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

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

function markerLabel(marker: TradeMarker): string {
  const strategy = marker.strategy ? ` · ${marker.strategy}` : "";
  return `${marker.side.toUpperCase()} ${marker.status}${strategy}`;
}

function markerColor(marker: TradeMarker): string {
  return marker.side === "long" ? "#22c55e" : "#f97316";
}

function MarkerSummary({ marker }: { marker: TradeMarker }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{markerLabel(marker)}</p>
        {marker.timeframe ? <span className="text-xs text-slate-500">{marker.timeframe}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="uppercase text-slate-500">진입</p>
          <p className="mt-1 font-semibold text-cyan-200">{formatPrice(marker.entryPrice)}</p>
        </div>
        <div>
          <p className="uppercase text-slate-500">익절</p>
          <p className="mt-1 font-semibold text-emerald-300">
            {marker.takeProfit !== undefined ? formatPrice(marker.takeProfit) : "—"}
          </p>
        </div>
        <div>
          <p className="uppercase text-slate-500">손절</p>
          <p className="mt-1 font-semibold text-rose-300">
            {marker.stopLoss !== undefined ? formatPrice(marker.stopLoss) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SymbolCharts({ charts }: { charts: SymbolChartModel[] }) {
  if (charts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        No active symbol charts yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {charts.map((chart) => {
        const chartPoints = toChartPoints(chart.candles);
        const latest = chartPoints.at(-1);

        return (
          <section key={chart.symbol} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase text-cyan-300">실시간 종목 차트</p>
                <h3 className="text-balance mt-1 text-xl font-semibold text-white">{chart.symbol}</h3>
                <p className="text-sm text-slate-500">
                  Binance {chart.interval} candles · 진입가 / 익절가 / 손절가 기준선
                </p>
              </div>
              {latest ? (
                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase text-slate-500">최근 종가</p>
                  <p className="text-xl font-semibold text-cyan-200">{formatPrice(latest.close)}</p>
                </div>
              ) : null}
            </div>

            <div className="h-80 min-w-0">
              <LineChart
                data={chartPoints}
                margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
                responsive
                style={{ width: "100%", height: "100%" }}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  minTickGap={36}
                  stroke="#64748b"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickLine={false}
                />
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
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    color: "#e2e8f0",
                  }}
                  formatter={(value, name) => [formatPrice(Number(value)), name === "close" ? "Close" : name]}
                  labelStyle={{ color: "#94a3b8" }}
                />
                {chart.markers.map((marker) => (
                  <ReferenceLine
                    key={`${marker.id}-entry`}
                    y={marker.entryPrice}
                    stroke={markerColor(marker)}
                    strokeDasharray="4 4"
                    label={{ value: `${marker.side.toUpperCase()} ENTRY`, fill: markerColor(marker), fontSize: 11 }}
                  />
                ))}
                {chart.markers.map((marker) =>
                  marker.takeProfit !== undefined ? (
                    <ReferenceLine
                      key={`${marker.id}-tp`}
                      y={marker.takeProfit}
                      stroke="#34d399"
                      strokeDasharray="3 3"
                      label={{ value: "익절", fill: "#34d399", fontSize: 11 }}
                    />
                  ) : null,
                )}
                {chart.markers.map((marker) =>
                  marker.stopLoss !== undefined ? (
                    <ReferenceLine
                      key={`${marker.id}-sl`}
                      y={marker.stopLoss}
                      stroke="#fb7185"
                      strokeDasharray="3 3"
                      label={{ value: "손절", fill: "#fb7185", fontSize: 11 }}
                    />
                  ) : null,
                )}
                <Line
                  type="monotone"
                  dataKey="close"
                  dot={false}
                  stroke="#22d3ee"
                  strokeWidth={2}
                  activeDot={{ r: 4, fill: "#67e8f9", stroke: "#0f172a" }}
                />
              </LineChart>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {chart.markers.length > 0 ? (
                chart.markers.map((marker) => <MarkerSummary key={marker.id} marker={marker} />)
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">
                  No open trade marker for this symbol.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
