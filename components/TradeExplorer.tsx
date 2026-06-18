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
  const optionLabel = (option: string) => {
    if (option === "open") return "오픈";
    if (option === "closed") return "종료";
    if (option === "long") return "롱";
    if (option === "short") return "숏";
    return option;
  };

  return (
    <label className="space-y-2 text-sm">
      <span className="block text-xs font-medium uppercase text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
      >
        <option value="all">전체</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TradeExplorer({ trades }: { trades: Trade[] }) {
  const options = useMemo(() => getTradeFilterOptions(trades), [trades]);
  const [status, set상태] = useState<TradeStatus | "all">("all");
  const [side, set방향] = useState<TradeSide | "all">("all");
  const [symbol, set종목] = useState("all");
  const [strategy, set전략] = useState("all");
  const [timeframe, set주기] = useState("all");
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
            <h2 className="text-lg font-semibold text-white">거래 필터</h2>
            <p className="text-sm text-slate-500">
              총 {trades.length}건 중 {filteredTrades.length}건 표시
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              set상태("all");
              set방향("all");
              set종목("all");
              set전략("all");
              set주기("all");
              setSearch("");
            }}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            필터 초기화
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-2 text-sm md:col-span-2 xl:col-span-2">
            <span className="block text-xs font-medium uppercase text-slate-500">검색</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="종목, 전략, 사유, ID"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
            />
          </label>
          <SelectField label="상태" value={status} options={["open", "closed"]} onChange={(value) => set상태(value as TradeStatus | "all")} />
          <SelectField label="방향" value={side} options={["long", "short"]} onChange={(value) => set방향(value as TradeSide | "all")} />
          <SelectField label="종목" value={symbol} options={options.symbols} onChange={set종목} />
          <SelectField label="전략" value={strategy} options={options.strategies} onChange={set전략} />
          <SelectField label="주기" value={timeframe} options={options.timeframes} onChange={set주기} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <TradesTable trades={filteredTrades} />
      </div>
    </div>
  );
}
