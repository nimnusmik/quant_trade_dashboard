"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ChartPoint = EquityPoint & {
  label: string;
};

function toChartPoints(points: EquityPoint[]): ChartPoint[] {
  return points.map((point) => ({
    ...point,
    label: formatDateTime(point.timestamp),
  }));
}

export function EquityChart({ points }: { points: EquityPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
        아직 종료된 거래가 없습니다.
      </div>
    );
  }

  const chartPoints = toChartPoints(points);
  const latest = chartPoints.at(-1);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-balance text-lg font-semibold text-white">누적 손익 곡선</h2>
          <p className="text-sm text-slate-500">종료 거래 기준 · {points.length} exits</p>
        </div>
        {latest ? (
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase text-slate-500">최근 누적손익</p>
            <p className="text-xl font-semibold text-cyan-200">{formatCurrency(latest.equity)}</p>
          </div>
        ) : null}
      </div>

      <div className="h-72 min-w-0">
        <AreaChart
          data={chartPoints}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          responsive
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            minTickGap={32}
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => formatCurrency(Number(value))}
            tickLine={false}
            width={80}
          />
          <Tooltip
            cursor={{ stroke: "#22d3ee", strokeOpacity: 0.45 }}
            contentStyle={{
              background: "#020617",
              border: "1px solid #1e293b",
              borderRadius: "12px",
              color: "#e2e8f0",
            }}
            formatter={(value, name) => [formatCurrency(Number(value)), name === "equity" ? "Equity" : name]}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#equityGradient)"
            activeDot={{ r: 4, fill: "#67e8f9", stroke: "#0f172a" }}
          />
        </AreaChart>
      </div>
    </div>
  );
}
