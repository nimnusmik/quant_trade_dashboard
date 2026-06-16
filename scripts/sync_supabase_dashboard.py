#!/usr/bin/env python3
"""Sync local dashboard JSON artifacts into Supabase via PostgREST.

Expected environment:
  SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY

This script is intended for the host-side cron refresh path. It does not print
secrets and stays quiet on success so no-agent cron jobs remain silent.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
BATCH_SIZE = 300


def load_json(name: str) -> Any:
    with (DATA_DIR / name).open("r", encoding="utf-8") as f:
        return json.load(f)


def finite_number(value: Any) -> int | float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return value
    return None


def sanitize_json(value: Any) -> Any:
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_json(item) for key, item in value.items()}
    return value


def trade_payloads(trades: list[dict[str, Any]]) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []
    for trade in trades:
        quantity = finite_number(trade.get("quantity"))
        entry_price = finite_number(trade.get("entryPrice"))
        status = trade.get("status") or "open"
        payloads.append(
            {
                "trade_id": trade.get("id"),
                "ts": trade.get("entryTime"),
                "event_type": "trade",
                "strategy": trade.get("strategy") or "unknown",
                "symbol": trade.get("symbol") or "UNKNOWN",
                "timeframe": trade.get("timeframe"),
                "side": trade.get("side"),
                "action": "closed" if status == "closed" else "open",
                "quantity": quantity,
                "price": entry_price,
                "notional": quantity * entry_price if quantity is not None and entry_price is not None else None,
                "pnl": finite_number(trade.get("realizedPnl") if status == "closed" else trade.get("unrealizedPnl")),
                "pnl_pct": finite_number(trade.get("realizedPnlPct") if status == "closed" else trade.get("unrealizedPnlPct")),
                "fee": finite_number(trade.get("fee")),
                "status": status,
                "reason": trade.get("exitReason") or trade.get("entryReason"),
                "raw": sanitize_json(trade),
            }
        )
    return payloads


def strategy_metric_payloads(league: dict[str, Any]) -> list[dict[str, Any]]:
    updated_at = league.get("updatedAt")
    payloads: list[dict[str, Any]] = []
    for item in league.get("paperLeague", []):
        total_trades = finite_number(item.get("trades")) or 0
        win_rate = finite_number(item.get("winRate")) or 0
        wins = round(total_trades * win_rate)
        payloads.append(
            {
                "ts": updated_at,
                "strategy": item.get("strategy") or "unknown",
                "symbol": item.get("symbol") or "UNKNOWN",
                "timeframe": item.get("timeframe") or "unknown",
                "side": item.get("side") or "both",
                "total_trades": total_trades,
                "wins": wins,
                "losses": total_trades - wins,
                "win_rate": finite_number(item.get("winRate")),
                "total_pnl": finite_number(item.get("totalPnlPct")),
                "avg_pnl": finite_number(item.get("averagePnlPct")),
                "max_drawdown": None,
                "profit_factor": finite_number(item.get("profitFactor")),
                "sharpe": None,
                "score": finite_number(item.get("score")),
                "evidence_type": "paper",
                "raw": sanitize_json(item),
            }
        )
    for item in league.get("strictCandidates", []):
        payloads.append(
            {
                "ts": updated_at,
                "strategy": item.get("strategy") or "unknown",
                "symbol": item.get("symbol") or "UNKNOWN",
                "timeframe": item.get("timeframe") or "unknown",
                "side": "both",
                "total_trades": finite_number(item.get("fullTrades")),
                "wins": None,
                "losses": None,
                "win_rate": None,
                "total_pnl": finite_number(item.get("fullReturnPct")),
                "avg_pnl": None,
                "max_drawdown": None,
                "profit_factor": finite_number(item.get("fullProfitFactor")),
                "sharpe": None,
                "score": finite_number(item.get("minReturnPct")),
                "evidence_type": "strict_backtest",
                "raw": sanitize_json(item),
            }
        )
    return payloads


def monitor_universe_payloads(universe: dict[str, Any]) -> list[dict[str, Any]]:
    source = universe.get("source")
    updated_at = universe.get("updatedAt")
    payloads: list[dict[str, Any]] = []
    for strategy in universe.get("strategies", []):
        raw = {
            "label": strategy.get("label") or strategy.get("key"),
            "paramsByInterval": strategy.get("paramsByInterval") or {},
            "source": source,
        }
        symbols_by_interval = strategy.get("symbolsByInterval") or {}
        if isinstance(symbols_by_interval, dict) and symbols_by_interval:
            pairs = [
                (symbol, timeframe)
                for timeframe in strategy.get("intervals", [])
                for symbol in symbols_by_interval.get(timeframe, [])
            ]
        else:
            pairs = [
                (symbol, timeframe)
                for symbol in strategy.get("symbols", [])
                for timeframe in strategy.get("intervals", [])
            ]
        for symbol, timeframe in pairs:
            payloads.append(
                {
                    "ts": updated_at,
                    "strategy": strategy.get("key") or "unknown",
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "side": "both",
                    "candidate_type": "runtime_monitor",
                    "evidence_type": "monitor_config",
                    "score": None,
                    "reason": strategy.get("label") or strategy.get("key"),
                    "is_active": True,
                    "raw": sanitize_json(raw),
                }
            )
    return payloads


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.url = url.rstrip("/")
        self.key = key

    def request(self, method: str, path: str, *, body: Any | None = None, query: dict[str, str] | None = None) -> Any:
        qs = f"?{urllib.parse.urlencode(query or {})}" if query else ""
        req = urllib.request.Request(f"{self.url}/rest/v1/{path}{qs}", method=method)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=minimal")
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        try:
            with urllib.request.urlopen(req, data=data, timeout=60) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase {method} {path} failed: HTTP {exc.code} {detail}") from exc

    def delete_all(self, table: str, not_null_col: str) -> None:
        self.request("DELETE", table, query={not_null_col: "not.is.null"})

    def upsert(self, table: str, rows: list[dict[str, Any]], on_conflict: str) -> None:
        for i in range(0, len(rows), BATCH_SIZE):
            self.request(
                "POST",
                table,
                body=rows[i : i + BATCH_SIZE],
                query={"on_conflict": on_conflict},
            )

    def count(self, table: str) -> int:
        req = urllib.request.Request(f"{self.url}/rest/v1/{table}?select=*&limit=1", method="GET")
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Range-Unit", "items")
        req.add_header("Range", "0-0")
        req.add_header("Prefer", "count=exact")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                content_range = resp.headers.get("content-range") or resp.headers.get("Content-Range") or "0-0/0"
                return int(content_range.rsplit("/", 1)[-1])
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase count {table} failed: HTTP {exc.code} {detail}") from exc


def resolve_config() -> tuple[str | None, str | None]:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    return url, key


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-config", action="store_true", help="fail if Supabase env vars are missing")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    url, key = resolve_config()
    if not url or not key:
        msg = "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY"
        if args.require_config:
            print(msg, file=sys.stderr)
            return 2
        return 0

    trades = trade_payloads(load_json("trades.json"))
    metrics = strategy_metric_payloads(load_json("strategy-league.json"))
    universe = monitor_universe_payloads(load_json("monitor-universe.json"))

    client = SupabaseRest(url, key)
    # Full snapshot semantics, matching import-current-dashboard-data.sql.
    client.delete_all("trades", "trade_id")
    client.delete_all("strategy_metrics", "strategy")
    client.delete_all("monitor_universe", "strategy")
    client.upsert("trades", trades, "trade_id")
    client.upsert("strategy_metrics", metrics, "strategy,symbol,timeframe,side,evidence_type")
    client.upsert("monitor_universe", universe, "strategy,symbol,timeframe,side,candidate_type,evidence_type")

    counts = {
        "trades": client.count("trades"),
        "strategy_metrics": client.count("strategy_metrics"),
        "monitor_universe": client.count("monitor_universe"),
    }
    expected = {"trades": len(trades), "strategy_metrics": len(metrics), "monitor_universe": len(universe)}
    if counts != expected:
        raise RuntimeError(f"Supabase counts mismatch: expected={expected} actual={counts}")
    if args.verbose:
        print(f"Synced Supabase dashboard data: {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
