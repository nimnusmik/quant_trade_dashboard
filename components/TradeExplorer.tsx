"use client";

import { useMemo, useState } from "react";
import { TradesTable } from "@/components/TradesTable";
import { filterTrades, getTradeFilterOptions, type TradeFilters } from "@/lib/tradeFilters";
import type { Trade, TradeSide, TradeStatus } from "@/lib/types";

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TradeExplorer({ trades }: { trades: Trade[] }) {
  const options = useMemo(() => getTradeFilterOptions(trades), [trades]);
  const [status, setStatus] = useState<TradeStatus | "all">("all");
  const [side, setSide] = useState<TradeSide | "all">("all");
  const [symbol, setSymbol] = useState("all");
  const [strategy, setStrategy] = useState("all");
  const [timeframe, setTimeframe] = useState("all");
  const [search, setSearch] = useState("");

  const filteredTrades = useMemo(() => {
    const filters: TradeFilters = {
      status,
      side,
      symbol,
      strategy,
      timeframe,
      search,
    };

    return filterTrades(trades, filters);
  }, [trades, status, side, symbol, strategy, timeframe, search]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Filter trades</h2>
            <p className="text-sm text-slate-500">
              Showing {filteredTrades.length} of {trades.length} normalized records
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("all");
              setSide("all");
              setSymbol("all");
              setStrategy("all");
              setTimeframe("all");
              setSearch("");
            }}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            Reset
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-2 text-sm md:col-span-2 xl:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="symbol, strategy, reason, id"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
            />
          </label>
          <SelectField label="Status" value={status} options={["open", "closed"]} onChange={(value) => setStatus(value as TradeStatus | "all")} />
          <SelectField label="Side" value={side} options={["long", "short"]} onChange={(value) => setSide(value as TradeSide | "all")} />
          <SelectField label="Symbol" value={symbol} options={options.symbols} onChange={setSymbol} />
          <SelectField label="Strategy" value={strategy} options={options.strategies} onChange={setStrategy} />
          <SelectField label="Timeframe" value={timeframe} options={options.timeframes} onChange={setTimeframe} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <TradesTable trades={filteredTrades} />
      </div>
    </div>
  );
}
