import { describe, expect, it } from "vitest";
import {
  diagnosePaperLeagueTeams,
  groupStrictCandidatesByTimeframe,
  summarizeByTimeframe,
} from "@/lib/strategyLeague";
import type { PaperLeagueTeam, StrictCandidate } from "@/lib/types";

const teams: PaperLeagueTeam[] = [
  {
    rank: 1,
    teamKey: "S8@1h:ETHUSDT:short",
    strategy: "S8_Relative_Strength_Rotation",
    symbol: "ETHUSDT",
    timeframe: "1h",
    side: "short",
    trades: 7,
    winRate: 0.7143,
    totalPnlPct: 8.83,
    averagePnlPct: 1.26,
    profitFactor: 5.17,
    score: 9.0,
  },
  {
    rank: 2,
    teamKey: "S1@1h:BTCUSDT:short",
    strategy: "S1_EMA_Cross",
    symbol: "BTCUSDT",
    timeframe: "1h",
    side: "short",
    trades: 3,
    winRate: 0.6667,
    totalPnlPct: 10.33,
    averagePnlPct: 3.44,
    profitFactor: 32.29,
    score: 6.14,
  },
  {
    rank: 3,
    teamKey: "S2@5m:XRPUSDT:long",
    strategy: "S2_VWAP_Bounce",
    symbol: "XRPUSDT",
    timeframe: "5m",
    side: "long",
    trades: 9,
    winRate: 0.222,
    totalPnlPct: -3.2,
    averagePnlPct: -0.35,
    profitFactor: 0.55,
    score: -2,
  },
];

const candidates: StrictCandidate[] = [
  {
    timeframe: "5m",
    strategy: "S45_MeanReversion_01",
    symbol: "XRPUSDT",
    label: "S45 평균회귀 #01",
    verdict: "STRICT",
    fullTrades: 265,
    fullReturnPct: 0.66,
    fullProfitFactor: 1.01,
    holdoutTrades: 60,
    holdoutReturnPct: 3.16,
    holdoutProfitFactor: 1.26,
    recentTrades: 35,
    recentReturnPct: 6.47,
    recentProfitFactor: 2.22,
    minReturnPct: 3.16,
    minProfitFactor: 1.26,
  },
];

describe("strategy league", () => {
  it("diagnoses strategy × symbol × timeframe × side teams with sample warnings", () => {
    const diagnosed = diagnosePaperLeagueTeams(teams);
    expect(diagnosed[0]).toMatchObject({ teamKey: "S8@1h:ETHUSDT:short", verdict: "유지 후보" });
    expect(diagnosed[1]).toMatchObject({ teamKey: "S1@1h:BTCUSDT:short", verdict: "더 관찰" });
    expect(diagnosed[1].sampleWarning).toContain("표본 부족");
    expect(diagnosed[2]).toMatchObject({ teamKey: "S2@5m:XRPUSDT:long", verdict: "제외 후보" });
  });

  it("summarizes paper league by timeframe", () => {
    const summaries = summarizeByTimeframe(diagnosePaperLeagueTeams(teams));
    expect(summaries).toMatchObject([
      { timeframe: "5m", teams: 1, totalTrades: 9 },
      { timeframe: "1h", teams: 2, totalTrades: 10 },
    ]);
    expect(summaries[1].bestTeam?.teamKey).toBe("S8@1h:ETHUSDT:short");
  });

  it("groups STRICT backtest candidates separately from paper league", () => {
    expect(groupStrictCandidatesByTimeframe(candidates)).toMatchObject({
      "5m": [{ strategy: "S45_MeanReversion_01", verdict: "STRICT" }],
    });
  });
});
