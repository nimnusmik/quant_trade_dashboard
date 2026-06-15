import { AppShell } from "@/components/AppShell";
import { StrategyCompetitionPanel } from "@/components/StrategyCompetitionPanel";
import { calculateStrategyLeaderboard, calculateSymbolLeaderboard } from "@/lib/strategyPerformance";
import { loadDashboardTrades } from "@/lib/trades";

export default async function StrategiesPage() {
  const trades = await loadDashboardTrades();
  const strategies = calculateStrategyLeaderboard(trades);
  const symbols = calculateSymbolLeaderboard(trades);

  return (
    <AppShell>
      <StrategyCompetitionPanel strategies={strategies} symbols={symbols} />
    </AppShell>
  );
}
