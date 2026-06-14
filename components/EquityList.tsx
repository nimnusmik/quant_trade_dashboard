import type { EquityPoint } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function EquityList({ points }: { points: EquityPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
        No closed trades yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Equity Curve</h2>
        <p className="text-sm text-slate-500">Closed trades only</p>
      </div>
      <div className="space-y-3">
        {points.map((point) => (
          <div key={point.tradeId} className="flex items-center justify-between rounded-xl bg-slate-950 px-4 py-3">
            <div>
              <p className="font-medium text-slate-100">{formatCurrency(point.equity)}</p>
              <p className="text-xs text-slate-500">{formatDateTime(point.timestamp)}</p>
            </div>
            <p className={point.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {formatCurrency(point.pnl)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
