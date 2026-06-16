import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadStrategyLeagueFromSupabase } from "@/lib/supabaseData";
import type {
  DiagnosedPaperLeagueTeam,
  LeagueVerdict,
  PaperLeagueTeam,
  StrategyLeagueData,
  StrictCandidate,
  TimeframeLeagueSummary,
} from "@/lib/types";

const EMPTY_LEAGUE: StrategyLeagueData = {
  source: {},
  updatedAt: "",
  paperLeague: [],
  strictCandidates: [],
};

export async function readStrategyLeagueFile(filePath: string): Promise<StrategyLeagueData> {
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Expected strategy league data to be an object");
  }

  const data = parsed as Partial<StrategyLeagueData>;
  return {
    source: data.source ?? {},
    updatedAt: data.updatedAt ?? "",
    paperLeague: Array.isArray(data.paperLeague) ? data.paperLeague : [],
    strictCandidates: Array.isArray(data.strictCandidates) ? data.strictCandidates : [],
  };
}

export async function loadStrategyLeagueData(): Promise<StrategyLeagueData> {
  try {
    const supabaseData = await loadStrategyLeagueFromSupabase();
    if (supabaseData) {
      return supabaseData;
    }
  } catch (error) {
    console.warn(error);
  }

  const leaguePath = join(process.cwd(), "public", "data", "strategy-league.json");
  try {
    return await readStrategyLeagueFile(leaguePath);
  } catch {
    return EMPTY_LEAGUE;
  }
}

export function diagnosePaperLeagueTeams(teams: PaperLeagueTeam[]): DiagnosedPaperLeagueTeam[] {
  return [...teams]
    .sort((a, b) => a.rank - b.rank || b.score - a.score)
    .map((team) => ({
      ...team,
      verdict: getLeagueVerdict(team),
      reasons: getLeagueReasons(team),
      action: getLeagueAction(team),
      sampleWarning: getSampleWarning(team),
    }));
}

export function summarizeByTimeframe(teams: DiagnosedPaperLeagueTeam[]): TimeframeLeagueSummary[] {
  const byTimeframe = new Map<string, DiagnosedPaperLeagueTeam[]>();
  for (const team of teams) {
    const current = byTimeframe.get(team.timeframe) ?? [];
    current.push(team);
    byTimeframe.set(team.timeframe, current);
  }

  const order = ["1m", "5m", "15m", "30m", "1h"];
  return Array.from(byTimeframe.entries())
    .map(([timeframe, rows]) => ({
      timeframe,
      teams: rows.length,
      totalTrades: rows.reduce((sum, row) => sum + row.trades, 0),
      totalPnlPct: rows.reduce((sum, row) => sum + row.totalPnlPct, 0),
      averageScore: rows.length > 0 ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : 0,
      bestTeam: rows[0],
    }))
    .sort((a, b) => {
      const ai = order.indexOf(a.timeframe);
      const bi = order.indexOf(b.timeframe);
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
      }
      return a.timeframe.localeCompare(b.timeframe);
    });
}

export function groupStrictCandidatesByTimeframe(candidates: StrictCandidate[]): Record<string, StrictCandidate[]> {
  return candidates.reduce<Record<string, StrictCandidate[]>>((groups, candidate) => {
    groups[candidate.timeframe] = groups[candidate.timeframe] ?? [];
    groups[candidate.timeframe].push(candidate);
    return groups;
  }, {});
}

function getLeagueVerdict(team: PaperLeagueTeam): LeagueVerdict {
  if (team.trades < 3) {
    return "더 관찰";
  }
  if (team.totalPnlPct > 0 && team.profitFactor >= 1.5 && team.winRate >= 0.45 && team.trades >= 5) {
    return "유지 후보";
  }
  if (team.totalPnlPct > 0 && team.profitFactor >= 1) {
    return "더 관찰";
  }
  if (team.totalPnlPct < 0 && team.profitFactor < 1) {
    return "제외 후보";
  }
  return "Watch-only";
}

function getLeagueReasons(team: PaperLeagueTeam): string[] {
  const reasons = [
    `${team.strategy}@${team.timeframe}:${team.symbol}:${team.side} 단위로 독립 평가합니다.`,
    `페이퍼 거래 ${team.trades}건, 총손익 ${team.totalPnlPct.toFixed(2)}%, 승률 ${(team.winRate * 100).toFixed(1)}%, 손익비 ${formatProfitFactor(team.profitFactor)}입니다.`,
  ];

  if (team.trades < 5) {
    reasons.push("표본이 작아 1~2번의 거래가 순위를 크게 흔들 수 있습니다.");
  } else if (team.profitFactor >= 1.5 && team.totalPnlPct > 0) {
    reasons.push("손익비와 누적손익이 같이 플러스라서 단순 1회성 수익보다 신뢰도가 높습니다.");
  }

  if (team.side === "short") {
    reasons.push("숏 조합이므로 하락/위험회피 구간에서 우위가 생겼는지 추가 확인이 필요합니다.");
  }

  return reasons;
}

function getLeagueAction(team: PaperLeagueTeam): string {
  const verdict = getLeagueVerdict(team);
  if (verdict === "유지 후보") {
    return "현재 allowlist 유지 후보입니다. 다만 같은 전략이라도 다른 분봉/종목/방향은 별도 판단합니다.";
  }
  if (verdict === "더 관찰") {
    return "바로 확대하지 말고 새 페이퍼 거래가 더 쌓일 때까지 관찰합니다.";
  }
  if (verdict === "제외 후보") {
    return "실전 후보에서는 제외하거나 watch-only로 내리는 쪽이 안전합니다.";
  }
  return "백테스트/최근 구간과 같이 비교하기 전까지는 watch-only로 둡니다.";
}

function getSampleWarning(team: PaperLeagueTeam): string | undefined {
  if (team.trades < 5) {
    return "표본 부족: 5건 미만이라 순위가 과대평가될 수 있습니다.";
  }
  if (team.trades < 10) {
    return "표본 주의: 10건 미만이라 추가 검증이 필요합니다.";
  }
  return undefined;
}

function formatProfitFactor(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(2);
}
