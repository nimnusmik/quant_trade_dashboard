import type { Trade } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function TradesTable({ trades }: { trades: Trade[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">시간</th>
            <th className="px-4 py-3">종목</th>
            <th className="px-4 py-3">방향</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3 text-right">진입</th>
            <th className="px-4 py-3 text-right">청산</th>
            <th className="px-4 py-3 text-right">손익</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {trades.map((trade) => {
            const pnl = trade.status === "closed" ? trade.realizedPnl : trade.unrealizedPnl;
            const pnlClass = (pnl ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300";

            return (
              <tr key={trade.id} className="text-slate-200">
                <td className="px-4 py-3 text-slate-400">
                  {formatDateTime(trade.exitTime ?? trade.entryTime)}
                </td>
                <td className="px-4 py-3 font-medium text-white">{trade.symbol}</td>
                <td className="px-4 py-3">{trade.side === "long" ? "롱" : "숏"}</td>
                <td className="px-4 py-3">{trade.status === "open" ? "오픈" : "종료"}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(trade.entryPrice)}</td>
                <td className="px-4 py-3 text-right">
                  {trade.exitPrice === undefined ? "—" : formatCurrency(trade.exitPrice)}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${pnlClass}`}>
                  {pnl === undefined ? "—" : formatCurrency(pnl)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
