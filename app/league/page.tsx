import { AppShell } from "@/components/AppShell";
import { StrategyLeaguePanel } from "@/components/StrategyLeaguePanel";
import { diagnosePaperLeagueTeams, loadStrategyLeagueData, summarizeByTimeframe } from "@/lib/strategyLeague";

export const dynamic = "force-dynamic";

export default async function StrategyLeaguePage() {
  const data = await loadStrategyLeagueData();
  const teams = diagnosePaperLeagueTeams(data.paperLeague);
  const summaries = summarizeByTimeframe(teams);

  return (
    <AppShell>
      <StrategyLeaguePanel
        teams={teams}
        summaries={summaries}
        strictCandidates={data.strictCandidates}
        updatedAt={data.updatedAt}
      />
    </AppShell>
  );
}
