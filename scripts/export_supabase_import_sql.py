#!/usr/bin/env python3
"""Generate a Supabase SQL import from the dashboard's local JSON files.

This deliberately avoids service-role keys: paste the generated SQL into the
Supabase SQL Editor to seed the hosted database from current local snapshots.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
OUT_PATH = ROOT / "supabase" / "import-current-dashboard-data.sql"


def load_json(name: str) -> Any:
    with (DATA_DIR / name).open("r", encoding="utf-8") as f:
        return json.load(f)


def sql_string(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def sql_number(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)) and math.isfinite(value):
        return repr(value)
    return "null"


def sql_bool(value: bool | None) -> str:
    if value is None:
        return "null"
    return "true" if value else "false"


def sanitize_json(value: Any) -> Any:
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_json(item) for key, item in value.items()}
    return value


def sql_json(value: Any) -> str:
    safe_value = sanitize_json(value)
    return sql_string(json.dumps(safe_value, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"


def q(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, str):
        return sql_string(value)
    if isinstance(value, bool):
        return sql_bool(value)
    if isinstance(value, (int, float)):
        return sql_number(value)
    return sql_json(value)


def batched(values: list[str], size: int) -> list[list[str]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def trade_rows(trades: list[dict[str, Any]]) -> list[str]:
    rows = []
    for trade in trades:
        rows.append(
            "(" + ", ".join(
                [
                    q(trade.get("id")),
                    q(trade.get("entryTime")),
                    q("trade"),
                    q(trade.get("strategy") or "unknown"),
                    q(trade.get("symbol") or "UNKNOWN"),
                    q(trade.get("timeframe")),
                    q(trade.get("side")),
                    q("closed" if trade.get("status") == "closed" else "open"),
                    sql_number(trade.get("quantity")),
                    sql_number(trade.get("entryPrice")),
                    sql_number((trade.get("quantity") or 0) * (trade.get("entryPrice") or 0) if trade.get("quantity") and trade.get("entryPrice") else None),
                    sql_number(trade.get("realizedPnl") if trade.get("status") == "closed" else trade.get("unrealizedPnl")),
                    sql_number(trade.get("realizedPnlPct") if trade.get("status") == "closed" else trade.get("unrealizedPnlPct")),
                    sql_number(trade.get("fee")),
                    q(trade.get("status")),
                    q(trade.get("exitReason") or trade.get("entryReason")),
                    sql_json(trade),
                ]
            ) + ")"
        )
    return rows


def paper_metric_rows(league: dict[str, Any]) -> list[str]:
    updated_at = league.get("updatedAt")
    rows = []
    for item in league.get("paperLeague", []):
        rows.append(
            "(" + ", ".join(
                [
                    q(updated_at),
                    q(item.get("strategy") or "unknown"),
                    q(item.get("symbol") or "UNKNOWN"),
                    q(item.get("timeframe") or "unknown"),
                    q(item.get("side") or "both"),
                    sql_number(item.get("trades")),
                    sql_number(round((item.get("trades") or 0) * (item.get("winRate") or 0))),
                    sql_number((item.get("trades") or 0) - round((item.get("trades") or 0) * (item.get("winRate") or 0))),
                    sql_number(item.get("winRate")),
                    sql_number(item.get("totalPnlPct")),
                    sql_number(item.get("averagePnlPct")),
                    "null",
                    sql_number(item.get("profitFactor")),
                    "null",
                    sql_number(item.get("score")),
                    q("paper"),
                    sql_json(item),
                ]
            ) + ")"
        )
    for item in league.get("strictCandidates", []):
        rows.append(
            "(" + ", ".join(
                [
                    q(updated_at),
                    q(item.get("strategy") or "unknown"),
                    q(item.get("symbol") or "UNKNOWN"),
                    q(item.get("timeframe") or "unknown"),
                    q("both"),
                    sql_number(item.get("fullTrades")),
                    "null",
                    "null",
                    "null",
                    sql_number(item.get("fullReturnPct")),
                    "null",
                    "null",
                    sql_number(item.get("fullProfitFactor")),
                    "null",
                    sql_number(item.get("minReturnPct")),
                    q("strict_backtest"),
                    sql_json(item),
                ]
            ) + ")"
        )
    return rows


def monitor_rows(universe: dict[str, Any]) -> list[str]:
    rows = []
    source = universe.get("source")
    updated_at = universe.get("updatedAt")
    for strategy in universe.get("strategies", []):
        raw = {
            "label": strategy.get("label") or strategy.get("key"),
            "paramsByInterval": strategy.get("paramsByInterval") or {},
            "source": source,
        }
        for symbol in strategy.get("symbols", []):
            for timeframe in strategy.get("intervals", []):
                rows.append(
                    "(" + ", ".join(
                        [
                            q(updated_at),
                            q(strategy.get("key") or "unknown"),
                            q(symbol),
                            q(timeframe),
                            q("both"),
                            q("runtime_monitor"),
                            q("monitor_config"),
                            "null",
                            q(strategy.get("label") or strategy.get("key")),
                            "true",
                            sql_json(raw),
                        ]
                    ) + ")"
                )
    return rows


def insert_statement(table: str, columns: list[str], rows: list[str], conflict: str) -> str:
    chunks = []
    for batch in batched(rows, 300):
        chunks.append(
            f"insert into public.{table} ({', '.join(columns)})\nvalues\n"
            + ",\n".join(batch)
            + f"\non conflict {conflict} do update set\n"
            + ",\n".join([f"  {col} = excluded.{col}" for col in columns if col not in {"trade_id"}])
            + ";"
        )
    return "\n\n".join(chunks)


def main() -> None:
    trades = load_json("trades.json")
    league = load_json("strategy-league.json")
    universe = load_json("monitor-universe.json")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    sections = [
        "-- Generated by scripts/export_supabase_import_sql.py",
        "-- Paste this whole file into Supabase SQL Editor and run it.",
        "begin;",
        "truncate table public.trades restart identity;",
        "truncate table public.strategy_metrics restart identity;",
        "truncate table public.monitor_universe restart identity;",
        insert_statement(
            "trades",
            ["trade_id", "ts", "event_type", "strategy", "symbol", "timeframe", "side", "action", "quantity", "price", "notional", "pnl", "pnl_pct", "fee", "status", "reason", "raw"],
            trade_rows(trades),
            "(trade_id)",
        ),
        insert_statement(
            "strategy_metrics",
            ["ts", "strategy", "symbol", "timeframe", "side", "total_trades", "wins", "losses", "win_rate", "total_pnl", "avg_pnl", "max_drawdown", "profit_factor", "sharpe", "score", "evidence_type", "raw"],
            paper_metric_rows(league),
            "(strategy, symbol, timeframe, side, evidence_type)",
        ),
        insert_statement(
            "monitor_universe",
            ["ts", "strategy", "symbol", "timeframe", "side", "candidate_type", "evidence_type", "score", "reason", "is_active", "raw"],
            monitor_rows(universe),
            "(strategy, symbol, timeframe, side, candidate_type, evidence_type)",
        ),
        "commit;",
        "select 'trades' as table_name, count(*) from public.trades\nunion all select 'strategy_metrics', count(*) from public.strategy_metrics\nunion all select 'monitor_universe', count(*) from public.monitor_universe;",
    ]
    OUT_PATH.write_text("\n\n".join(section for section in sections if section) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print(f"trades={len(trades)} strategy_metrics={len(paper_metric_rows(league))} monitor_universe={len(monitor_rows(universe))}")


if __name__ == "__main__":
    main()
