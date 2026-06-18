import { AppShell } from "@/components/AppShell";
import { TradeExplorer } from "@/components/TradeExplorer";
import { loadDashboardTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const trades = await loadDashboardTrades();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-cyan-300">거래 내역</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">전체 거래 내역</h2>
          <p className="mt-2 text-slate-400">정규화된 오픈/종료 페이퍼 거래 기록입니다.</p>
        </div>
        <TradeExplorer trades={trades} />
      </div>
    </AppShell>
  );
}
