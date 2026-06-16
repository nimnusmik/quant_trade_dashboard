#!/usr/bin/env python3
"""Export paper strategy league CSVs into normalized dashboard JSON."""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DASHBOARD_ROOT = Path(__file__).resolve().parents[1]
TRADING_ROOT = DASHBOARD_ROOT.parent / "quant_trading"
REPORTS_DIR = TRADING_ROOT / "reports"
OUTPUT_DIR = DASHBOARD_ROOT / "public" / "data"

PAPER_LEAGUE_CSV = REPORTS_DIR / "paper_strategy_timeframe_leaderboard.csv"
STRICT_CANDIDATES_CSV = REPORTS_DIR / "s1_to_s100_multisymbol_multitimeframe_strict.csv"


def as_int(value: str | None) -> int:
    if value is None or value == "":
        return 0
    return int(float(value))


def as_float(value: str | None) -> float:
    if value is None or value == "":
        return 0.0
    return float(value)


def read_paper_league(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    entries: list[dict[str, Any]] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            strategy = row.get("strategy_name", "")
            symbol = row.get("symbol", "")
            timeframe = row.get("timeframe", "")
            side = row.get("side", "")
            entries.append(
                {
                    "rank": as_int(row.get("rank")),
                    "teamKey": f"{strategy}@{timeframe}:{symbol}:{side}",
                    "strategy": strategy,
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "side": side,
                    "trades": as_int(row.get("trades")),
                    "winRate": as_float(row.get("win_rate")) / 100,
                    "totalPnlPct": as_float(row.get("total_pnl_pct")),
                    "averagePnlPct": as_float(row.get("avg_pnl_pct")),
                    "profitFactor": as_float(row.get("profit_factor")),
                    "score": as_float(row.get("score")),
                }
            )
    return entries


def read_strict_candidates(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    entries: list[dict[str, Any]] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            entries.append(
                {
                    "timeframe": row.get("timeframe", ""),
                    "strategy": row.get("strategy", ""),
                    "symbol": row.get("symbol", ""),
                    "label": row.get("label", ""),
                    "verdict": row.get("verdict", ""),
                    "fullTrades": as_int(row.get("full_trades")),
                    "fullReturnPct": as_float(row.get("full_return_pct")),
                    "fullProfitFactor": as_float(row.get("full_pf")),
                    "holdoutTrades": as_int(row.get("holdout_trades")),
                    "holdoutReturnPct": as_float(row.get("holdout_return_pct")),
                    "holdoutProfitFactor": as_float(row.get("holdout_pf")),
                    "recentTrades": as_int(row.get("recent_trades")),
                    "recentReturnPct": as_float(row.get("recent_return_pct")),
                    "recentProfitFactor": as_float(row.get("recent_pf")),
                    "minReturnPct": as_float(row.get("min_return_pct")),
                    "minProfitFactor": as_float(row.get("min_pf")),
                }
            )
    return entries


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": {
            "paperLeagueCsv": str(PAPER_LEAGUE_CSV),
            "strictCandidatesCsv": str(STRICT_CANDIDATES_CSV),
        },
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "paperLeague": read_paper_league(PAPER_LEAGUE_CSV),
        "strictCandidates": read_strict_candidates(STRICT_CANDIDATES_CSV),
    }
    out = OUTPUT_DIR / "strategy-league.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out} ({len(payload['paperLeague'])} paper teams, {len(payload['strictCandidates'])} strict candidates)")


if __name__ == "__main__":
    main()
