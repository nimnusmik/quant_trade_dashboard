import type { DiagnosedPaperLeagueTeam, StrictCandidate, TimeframeLeagueSummary } from "@/lib/types";
import { cn } from "@/lib/cn";

function pct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function ratio(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(2);
}

function winRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function sideLabel(side: string): string {
  if (side === "long") return "롱";
  if (side === "short") return "숏";
  return side;
}

function verdictClass(verdict: string): string {
  if (verdict === "유지 후보") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (verdict === "더 관찰") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  if (verdict === "제외 후보") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function pnlClass(value: number): string {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-200";
}

function TeamCard({ team }: { team: DiagnosedPaperLeagueTeam }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-slate-500">#{team.rank} · {team.timeframe} · {team.symbol} · {sideLabel(team.side)}</p>
          <h3 className="text-balance mt-1 text-base font-semibold text-white">{team.strategy}</h3>
          <p className="mt-1 text-xs text-cyan-200">{team.teamKey}</p>
        </div>
        <span className={cn("w-fit rounded-full border px-3 py-1 text-xs", verdictClass(team.verdict))}>{team.verdict}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        <Metric label="거래" value={`${team.trades}건`} />
        <Metric label="승률" value={winRate(team.winRate)} />
        <Metric label="총손익" value={pct(team.totalPnlPct)} className={pnlClass(team.totalPnlPct)} />
        <Metric label="평균손익" value={pct(team.averagePnlPct)} className={pnlClass(team.averagePnlPct)} />
        <Metric label="손익비" value={ratio(team.profitFactor)} />
      </div>
      {team.sampleWarning ? <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">{team.sampleWarning}</p> : null}
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
        {team.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
      </ul>
      <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">추천: {team.action}</p>
    </article>
  );
}

function Metric({ label, value, className = "text-white" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 font-semibold", className)}>{value}</p>
    </div>
  );
}

function TimeframeSummary({ summaries }: { summaries: TimeframeLeagueSummary[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-balance text-lg font-semibold text-white">분봉별 경쟁 구도</h3>
        <p className="text-sm text-slate-500">같은 전략이라도 1m/5m/15m/30m/1h는 완전히 다른 팀으로 판단합니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaries.map((summary) => (
          <div key={summary.timeframe} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-cyan-300">{summary.timeframe}</p>
            <p className={cn("mt-2 text-2xl font-semibold", pnlClass(summary.totalPnlPct))}>{pct(summary.totalPnlPct)}</p>
            <p className="mt-1 text-xs text-slate-500">팀 {summary.teams}개 · 거래 {summary.totalTrades}건 · 평균점수 {summary.averageScore.toFixed(2)}</p>
            {summary.bestTeam ? <p className="mt-3 text-xs leading-5 text-slate-300">대표: {summary.bestTeam.strategy} × {summary.bestTeam.symbol} × {sideLabel(summary.bestTeam.side)}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function LeagueTable({ teams }: { teams: DiagnosedPaperLeagueTeam[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h3 className="text-balance text-lg font-semibold text-white">전체 실전 페이퍼 리그</h3>
        <p className="text-sm text-slate-500">단위는 반드시 전략 × 종목 × 분봉 × 방향입니다. 전략 단독 평균으로 뭉개지 않습니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">순위</th>
              <th className="px-4 py-3">팀</th>
              <th className="px-4 py-3">분봉</th>
              <th className="px-4 py-3">종목</th>
              <th className="px-4 py-3">방향</th>
              <th className="px-4 py-3">거래</th>
              <th className="px-4 py-3">승률</th>
              <th className="px-4 py-3">총손익</th>
              <th className="px-4 py-3">손익비</th>
              <th className="px-4 py-3">판정</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.teamKey} className="border-t border-slate-800">
                <td className="px-4 py-3 text-slate-400">#{team.rank}</td>
                <td className="px-4 py-3 font-semibold text-white">{team.strategy}</td>
                <td className="px-4 py-3 text-cyan-200">{team.timeframe}</td>
                <td className="px-4 py-3 text-slate-300">{team.symbol}</td>
                <td className="px-4 py-3 text-slate-300">{sideLabel(team.side)}</td>
                <td className="px-4 py-3 text-slate-300">{team.trades}</td>
                <td className="px-4 py-3 text-slate-300">{winRate(team.winRate)}</td>
                <td className={cn("px-4 py-3 font-semibold", pnlClass(team.totalPnlPct))}>{pct(team.totalPnlPct)}</td>
                <td className="px-4 py-3 text-slate-300">{ratio(team.profitFactor)}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full border px-2.5 py-1 text-xs", verdictClass(team.verdict))}>{team.verdict}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StrictCandidateTable({ candidates }: { candidates: StrictCandidate[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <h3 className="text-balance text-lg font-semibold text-white">백테스트 STRICT 후보</h3>
        <p className="text-sm text-amber-200">S1~S100 후보군입니다. 백테스트 STRICT가 좋더라도 실전 페이퍼에서 아직 검증된 것은 아니므로, 위 실전 리그와 분리해서 판단합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">분봉</th>
              <th className="px-4 py-3">전략</th>
              <th className="px-4 py-3">종목</th>
              <th className="px-4 py-3">Holdout</th>
              <th className="px-4 py-3">최근</th>
              <th className="px-4 py-3">최소 기준</th>
              <th className="px-4 py-3">해석</th>
            </tr>
          </thead>
          <tbody>
            {candidates.slice(0, 80).map((candidate) => (
              <tr key={`${candidate.timeframe}-${candidate.strategy}-${candidate.symbol}`} className="border-t border-slate-800">
                <td className="px-4 py-3 text-cyan-200">{candidate.timeframe}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{candidate.strategy}</p>
                  <p className="text-xs text-slate-500">{candidate.label}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">{candidate.symbol}</td>
                <td className={cn("px-4 py-3", pnlClass(candidate.holdoutReturnPct))}>{pct(candidate.holdoutReturnPct)} · PF {ratio(candidate.holdoutProfitFactor)} · {candidate.holdoutTrades}건</td>
                <td className={cn("px-4 py-3", pnlClass(candidate.recentReturnPct))}>{pct(candidate.recentReturnPct)} · PF {ratio(candidate.recentProfitFactor)} · {candidate.recentTrades}건</td>
                <td className={cn("px-4 py-3", pnlClass(candidate.minReturnPct))}>{pct(candidate.minReturnPct)} · PF {ratio(candidate.minProfitFactor)}</td>
                <td className="px-4 py-3 text-xs leading-5 text-slate-400">실전 페이퍼 리그에서 같은 조합이 확인되기 전까지는 후보/관찰 단계입니다.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StrategyLeaguePanel({
  teams,
  summaries,
  strictCandidates,
  updatedAt,
}: {
  teams: DiagnosedPaperLeagueTeam[];
  summaries: TimeframeLeagueSummary[];
  strictCandidates: StrictCandidate[];
  updatedAt: string;
}) {
  const keep = teams.filter((team) => team.verdict === "유지 후보");
  const watch = teams.filter((team) => team.verdict === "더 관찰" || team.verdict === "Watch-only");
  const excluded = teams.filter((team) => team.verdict === "제외 후보");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-cyan-300">S1~S100 확장 리그</p>
        <h2 className="text-balance mt-2 text-3xl font-semibold text-white">전략 × 종목 × 분봉 × 방향 리그보드</h2>
        <p className="mt-2 max-w-4xl text-slate-400 text-pretty">선민님이 실제로 결정해야 하는 단위에 맞춰, S53@30m:XRPUSDT:숏과 S53@1h:XRPUSDT:숏을 서로 다른 팀으로 봅니다.</p>
        <p className="mt-2 text-xs text-slate-600">업데이트: {updatedAt || "데이터 없음"}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="유지 후보" value={`${keep.length}개`} className="text-emerald-300" />
        <Metric label="관찰 / Watch-only" value={`${watch.length}개`} className="text-cyan-300" />
        <Metric label="제외 후보" value={`${excluded.length}개`} className="text-rose-300" />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-balance text-lg font-semibold text-white">상위 유지 후보</h3>
          <p className="text-sm text-slate-500">표본 수가 작은 팀은 수익이 커도 과대평가 경고를 붙였습니다.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {teams.slice(0, 8).map((team) => <TeamCard key={team.teamKey} team={team} />)}
        </div>
      </section>

      <TimeframeSummary summaries={summaries} />
      <LeagueTable teams={teams} />
      <StrictCandidateTable candidates={strictCandidates} />
    </div>
  );
}
