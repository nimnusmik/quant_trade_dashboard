import { formatCurrency, formatPercent } from "@/lib/format";
import type { StrategyPerformance, StrategySymbolPerformance, SymbolPerformance } from "@/lib/types";

function formatProfitFactor(value: number): string {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return value.toFixed(2);
}

function pnlColor(value: number): string {
  if (value > 0) {
    return "text-emerald-300";
  }
  if (value < 0) {
    return "text-rose-300";
  }
  return "text-slate-200";
}

function StrategyRow({ strategy, rank }: { strategy: StrategyPerformance; rank: number }) {
  return (
    <tr className="border-t border-slate-800">
      <td className="px-4 py-4 align-top text-sm text-slate-400">#{rank}</td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-white">{strategy.strategy}</p>
        <p className="mt-1 text-xs text-slate-500">
          {strategy.symbols.length} symbols · {strategy.sides.long} long / {strategy.sides.short} short
        </p>
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-300">{strategy.trades}</td>
      <td className="px-4 py-4 align-top text-sm text-slate-300">{formatPercent(strategy.winRate)}</td>
      <td className={`px-4 py-4 align-top text-sm font-semibold ${pnlColor(strategy.totalRealizedPnl)}`}>
        {formatCurrency(strategy.totalRealizedPnl)}
      </td>
      <td className={`px-4 py-4 align-top text-sm ${pnlColor(strategy.averagePnl)}`}>
        {formatCurrency(strategy.averagePnl)}
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-300">{formatProfitFactor(strategy.profitFactor)}</td>
      <td className="px-4 py-4 align-top text-sm text-slate-300">
        <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200">
          {strategy.diagnosis.verdict}
        </span>
        <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">{strategy.diagnosis.suggestedAction}</p>
      </td>
      <td className="px-4 py-4 align-top text-xs text-slate-500">{strategy.lastExitTime ?? "—"}</td>
    </tr>
  );
}

function StrategyDiagnosisCard({ strategy }: { strategy: StrategyPerformance }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-300">{strategy.diagnosis.verdict}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{strategy.strategy}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {strategy.trades} trades · {formatPercent(strategy.winRate)} win · PF {formatProfitFactor(strategy.profitFactor)}
          </p>
        </div>
        <div className={`text-lg font-semibold ${pnlColor(strategy.totalRealizedPnl)}`}>
          {formatCurrency(strategy.totalRealizedPnl)}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-200">왜 잘 먹혔나</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {strategy.diagnosis.worksBecause.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-semibold text-rose-200">왜 안 먹혔나 / 리스크</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {strategy.diagnosis.failsBecause.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Action</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{strategy.diagnosis.suggestedAction}</p>
      </div>
    </article>
  );
}

function SymbolPill({ symbol }: { symbol: SymbolPerformance }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white">{symbol.symbol}</span>
        <span className={`text-sm font-semibold ${pnlColor(symbol.totalRealizedPnl)}`}>
          {formatCurrency(symbol.totalRealizedPnl)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {symbol.trades} trades · {formatPercent(symbol.winRate)} win · avg {formatCurrency(symbol.averagePnl)}
      </p>
    </div>
  );
}

function verdictColor(verdict: StrategySymbolPerformance["verdict"]): string {
  if (verdict === "Strong") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (verdict === "Promising") {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }
  if (verdict === "Weak") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  }
  return "border-slate-700 bg-slate-950 text-slate-200";
}

function StrategySymbolMatrix({ pairs }: { pairs: StrategySymbolPerformance[] }) {
  const strongPairs = pairs.filter((pair) => pair.verdict === "Strong" || pair.verdict === "Promising");
  const weakPairs = [...pairs].reverse().filter((pair) => pair.verdict === "Weak");

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Strategy × Symbol fit</h3>
        <p className="text-sm text-slate-500">
          전략 전체 평균이 아니라, 어떤 전략이 어떤 종목에서 실제로 통했는지 조합별로 봅니다.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900 p-5">
          <h4 className="font-semibold text-emerald-200">잘 통한 조합</h4>
          <div className="mt-4 space-y-3">
            {strongPairs.slice(0, 12).map((pair) => (
              <div key={`${pair.strategy}-${pair.symbol}`} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{pair.strategy}</p>
                    <p className="text-sm text-cyan-200">{pair.symbol}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${verdictColor(pair.verdict)}`}>
                    {pair.verdict}
                  </span>
                </div>
                <p className={`mt-2 text-sm font-semibold ${pnlColor(pair.totalRealizedPnl)}`}>
                  {formatCurrency(pair.totalRealizedPnl)} · {pair.trades} trades · {formatPercent(pair.winRate)} win · PF {formatProfitFactor(pair.profitFactor)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-slate-900 p-5">
          <h4 className="font-semibold text-rose-200">안 맞는 조합</h4>
          <div className="mt-4 space-y-3">
            {weakPairs.slice(0, 12).map((pair) => (
              <div key={`${pair.strategy}-${pair.symbol}`} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{pair.strategy}</p>
                    <p className="text-sm text-cyan-200">{pair.symbol}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${verdictColor(pair.verdict)}`}>
                    {pair.verdict}
                  </span>
                </div>
                <p className={`mt-2 text-sm font-semibold ${pnlColor(pair.totalRealizedPnl)}`}>
                  {formatCurrency(pair.totalRealizedPnl)} · {pair.trades} trades · {formatPercent(pair.winRate)} win · PF {formatProfitFactor(pair.profitFactor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <h4 className="font-semibold text-white">All combinations</h4>
          <p className="text-sm text-slate-500">Sorted by realized PnL. Use this to decide strategy-symbol allowlists.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Strategy</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Verdict</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3">Win</th>
                <th className="px-4 py-3">PnL</th>
                <th className="px-4 py-3">Avg</th>
                <th className="px-4 py-3">PF</th>
                <th className="px-4 py-3">Side</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair) => (
                <tr key={`${pair.strategy}-${pair.symbol}`} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-sm font-semibold text-white">{pair.strategy}</td>
                  <td className="px-4 py-3 text-sm text-cyan-200">{pair.symbol}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${verdictColor(pair.verdict)}`}>{pair.verdict}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{pair.trades}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{formatPercent(pair.winRate)}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${pnlColor(pair.totalRealizedPnl)}`}>{formatCurrency(pair.totalRealizedPnl)}</td>
                  <td className={`px-4 py-3 text-sm ${pnlColor(pair.averagePnl)}`}>{formatCurrency(pair.averagePnl)}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{formatProfitFactor(pair.profitFactor)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{pair.sides.long}L / {pair.sides.short}S</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function StrategyCompetitionPanel({
  strategies,
  symbols,
  pairs,
}: {
  strategies: StrategyPerformance[];
  symbols: SymbolPerformance[];
  pairs: StrategySymbolPerformance[];
}) {
  const best = strategies[0];
  const worst = strategies.at(-1);
  const positiveStrategies = strategies.filter((strategy) => strategy.totalRealizedPnl > 0).length;
  const totalPnl = strategies.reduce((sum, strategy) => sum + strategy.totalRealizedPnl, 0);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-cyan-300">Strategy Competition</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Which strategy is winning?
        </h2>
        <p className="mt-2 max-w-3xl text-slate-400">
          종료된 paper trade 기준으로 전략별 PnL, 승률, 평균 손익, Profit Factor와 왜 먹혔는지/왜 안 먹혔는지를 같이 비교합니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Best Strategy</p>
          <p className="mt-2 text-xl font-semibold text-emerald-300">{best?.strategy ?? "—"}</p>
          <p className="mt-1 text-sm text-slate-400">{best ? formatCurrency(best.totalRealizedPnl) : "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Total Realized PnL</p>
          <p className={`mt-2 text-3xl font-semibold ${pnlColor(totalPnl)}`}>{formatCurrency(totalPnl)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Positive Strategies</p>
          <p className="mt-2 text-3xl font-semibold text-white">{positiveStrategies}/{strategies.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">Worst Drag</p>
          <p className="mt-2 text-xl font-semibold text-rose-300">{worst?.strategy ?? "—"}</p>
          <p className="mt-1 text-sm text-slate-400">{worst ? formatCurrency(worst.totalRealizedPnl) : "—"}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">Strategy leaderboard</h3>
          <p className="text-sm text-slate-500">Ranked by realized PnL, then profit factor and win rate.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Strategy</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3">Win</th>
                <th className="px-4 py-3">PnL</th>
                <th className="px-4 py-3">Avg</th>
                <th className="px-4 py-3">PF</th>
                <th className="px-4 py-3">Diagnosis</th>
                <th className="px-4 py-3">Last exit</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy, index) => (
                <StrategyRow key={strategy.strategy} strategy={strategy} rank={index + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Why each strategy is working or failing</h3>
          <p className="text-sm text-slate-500">
            Rule-based diagnosis from realized PnL, win rate, profit factor, side bias, and the best/worst contributing symbols.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {strategies.map((strategy) => (
            <StrategyDiagnosisCard key={strategy.strategy} strategy={strategy} />
          ))}
        </div>
      </section>

      <StrategySymbolMatrix pairs={pairs} />

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Symbol race</h3>
          <p className="text-sm text-slate-500">Which symbols contributed or dragged total paper PnL.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {symbols.map((symbol) => (
            <SymbolPill key={symbol.symbol} symbol={symbol} />
          ))}
        </div>
      </section>
    </div>
  );
}
