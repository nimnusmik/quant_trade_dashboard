import { AppShell } from "@/components/AppShell";
import { TradeExplorer } from "@/components/TradeExplorer";
import { loadDashboardTrades } from "@/lib/trades";

export default async function TradesPage() {
  const trades = await loadDashboardTrades();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-cyan-300">Trades</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">All trades</h2>
          <p className="mt-2 text-slate-400">Normalized open and closed paper-trade records.</p>
        </div>
        <TradeExplorer trades={trades} />
      </div>
    </AppShell>
  );
}
