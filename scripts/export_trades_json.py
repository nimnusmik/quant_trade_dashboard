#!/usr/bin/env python3
"""Export raw paper-trade CSV rows into dashboard trade JSON.

The source ledger uses ENTRY/EXIT events keyed by trade_id. This script pairs
those events into one normalized dashboard Trade object per trade.
"""

import csv
import json
import os
from pathlib import Path
from typing import Dict, Iterable, List, Optional

DEFAULT_SOURCE = "/Users/sunminkim/Desktop/projects/quant_trading/logs/paper_trades.csv"
DEFAULT_OUTPUT = "public/data/trades.json"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def parse_float(value: Optional[str]) -> Optional[float]:
    if value is None or value == "":
        return None
    return float(value)


def first_present(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if value not in (None, ""):
            return value
    return None


def normalize_side(value: Optional[str]) -> str:
    side = (value or "").lower()
    if side not in {"long", "short"}:
        raise ValueError("Unsupported trade side: {}".format(value))
    return side


def build_trade(trade_id: str, rows: List[Dict[str, str]]) -> Dict[str, object]:
    entries = [row for row in rows if row.get("event") == "ENTRY"]
    exits = [row for row in rows if row.get("event") == "EXIT"]
    entry = entries[0] if entries else rows[0]
    exit_row = exits[-1] if exits else None

    output: Dict[str, object] = {
        "id": trade_id,
        "symbol": entry["symbol"],
        "side": normalize_side(entry.get("side")),
        "status": "closed" if exit_row else "open",
        "entryTime": entry["timestamp"],
        "entryPrice": parse_float(entry.get("entry_price")) or 0,
        "source": "paper_trades_csv",
    }

    quantity = parse_float(first_present(entry.get("size"), exit_row.get("size") if exit_row else None))
    if quantity is not None:
        output["quantity"] = quantity

    strategy = first_present(entry.get("strategy_name"), exit_row.get("strategy_name") if exit_row else None)
    if strategy:
        output["strategy"] = strategy

    timeframe = first_present(entry.get("timeframe"), exit_row.get("timeframe") if exit_row else None)
    if timeframe:
        output["timeframe"] = timeframe

    if exit_row:
        output["exitTime"] = exit_row["timestamp"]
        exit_price = parse_float(exit_row.get("exit_price"))
        if exit_price is not None:
            output["exitPrice"] = exit_price
        pnl_usdt = parse_float(exit_row.get("pnl_usdt"))
        if pnl_usdt is not None:
            output["realizedPnl"] = pnl_usdt
        pnl_pct = parse_float(exit_row.get("pnl_pct"))
        if pnl_pct is not None:
            output["realizedPnlPct"] = pnl_pct
        exit_reason = exit_row.get("exit_reason")
        if exit_reason:
            output["exitReason"] = exit_reason

    return output


def convert_rows(rows: Iterable[Dict[str, str]]) -> List[Dict[str, object]]:
    grouped: Dict[str, List[Dict[str, str]]] = {}
    for row in rows:
        trade_id = row.get("trade_id")
        if not trade_id:
            continue
        grouped.setdefault(trade_id, []).append(row)

    trades = [build_trade(trade_id, group) for trade_id, group in grouped.items()]
    trades.sort(key=lambda trade: str(trade.get("exitTime") or trade.get("entryTime") or ""))
    return trades


def main() -> None:
    root = Path.cwd()
    load_dotenv(root / ".env")

    source = Path(os.environ.get("PAPER_TRADES_CSV", DEFAULT_SOURCE)).expanduser()
    output = Path(os.environ.get("DASHBOARD_TRADES_JSON", DEFAULT_OUTPUT)).expanduser()
    if not output.is_absolute():
        output = root / output

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    trades = convert_rows(rows)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(trades, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Exported {} trades to {}".format(len(trades), output))


if __name__ == "__main__":
    main()
