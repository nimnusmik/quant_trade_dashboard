#!/usr/bin/env python3
"""Export the live paper-monitor strategy/symbol universe for the dashboard.

This intentionally uses static parsing instead of importing quant_trading modules so
it can run from the dashboard environment without pandas/APScheduler installed.
"""

from __future__ import annotations

import ast
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_TRADING_ROOT = "/Users/sunminkim/Desktop/projects/quant_trading"
DEFAULT_OUTPUT = "public/data/monitor-universe.json"


def find_python_assignment_node(path: Path, name: str) -> ast.AST:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return node.value
    raise KeyError(f"{name} assignment not found in {path}")


def read_python_assignment(path: Path, name: str) -> Any:
    return ast.literal_eval(find_python_assignment_node(path, name))


def read_dict_string_keys(path: Path, name: str) -> list[str]:
    node = find_python_assignment_node(path, name)
    if not isinstance(node, ast.Dict):
        raise TypeError(f"{name} in {path} is not a dict")
    keys = []
    for key_node in node.keys:
        if isinstance(key_node, ast.Constant) and isinstance(key_node.value, str):
            keys.append(key_node.value)
    return keys


def read_scheduler_default_intervals(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    needle = 'os.getenv("ACTIVE_SIGNAL_INTERVALS", "'
    start = text.find(needle)
    if start == -1:
        return ["1m", "5m", "30m", "1h"]
    start += len(needle)
    end = text.find('"', start)
    raw_default = text[start:end]
    active_raw = os.getenv("ACTIVE_SIGNAL_INTERVALS", raw_default)
    allowed = {"1m", "5m", "15m", "30m", "1h"}
    return [item.strip() for item in active_raw.split(",") if item.strip() in allowed]


def parse_strategy_allowlist() -> dict[str, set[str]]:
    raw = os.getenv("STRATEGY_SYMBOL_ALLOWLIST", "").strip()
    parsed: dict[str, set[str]] = {}
    if not raw:
        return parsed
    for chunk in raw.split(";"):
        if not chunk.strip() or ":" not in chunk:
            continue
        strategy, symbols = chunk.split(":", 1)
        allowed = {symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()}
        if strategy.strip() and allowed:
            parsed[strategy.strip()] = allowed
    return parsed


def parse_strategy_timeframe_allowlist() -> dict[tuple[str, str], set[str]]:
    raw = os.getenv("STRATEGY_TIMEFRAME_SYMBOL_ALLOWLIST", "").strip()
    parsed: dict[tuple[str, str], set[str]] = {}
    if not raw:
        return parsed
    for chunk in raw.split(";"):
        if not chunk.strip() or ":" not in chunk or "@" not in chunk:
            continue
        strategy_tf, symbols = chunk.split(":", 1)
        strategy, timeframe = strategy_tf.split("@", 1)
        allowed = {symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()}
        if strategy.strip() and timeframe.strip() and allowed:
            parsed[(strategy.strip(), timeframe.strip())] = allowed
    return parsed


def active_strategy_keys(all_keys: list[str]) -> list[str]:
    raw = os.getenv("ACTIVE_STRATEGIES", "").strip()
    if not raw:
        return all_keys
    # Runtime may include generated S9~S100 keys added after the static STRATEGIES
    # dict literal, so preserve explicit env keys instead of intersecting them away.
    return [item.strip() for item in raw.split(",") if item.strip()]


def load_live_params(path: Path) -> dict[str, dict[str, dict[str, Any]]]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    timeframes = payload.get("timeframes", {})
    return timeframes if isinstance(timeframes, dict) else {}


def build_universe(trading_root: Path) -> dict[str, Any]:
    signal_monitor = trading_root / "monitor" / "signal_monitor.py"
    scheduler = trading_root / "monitor" / "scheduler.py"
    strategies_file = trading_root / "strategies.py"
    live_params_file = trading_root / "config" / "live_best_params.json"

    watch_symbols = read_python_assignment(signal_monitor, "WATCH_SYMBOLS")
    strategy_labels = read_python_assignment(strategies_file, "STRATEGY_LABELS")
    all_strategy_keys = read_dict_string_keys(strategies_file, "STRATEGIES")
    active_keys = active_strategy_keys(all_strategy_keys)
    intervals = read_scheduler_default_intervals(scheduler)
    live_params = load_live_params(live_params_file)
    allowlist = parse_strategy_allowlist()
    timeframe_allowlist = parse_strategy_timeframe_allowlist()

    strategies = []
    for key in active_keys:
        params_by_interval = {
            interval: params_by_strategy[key]
            for interval, params_by_strategy in live_params.items()
            if interval in intervals and isinstance(params_by_strategy, dict) and key in params_by_strategy
        }
        if timeframe_allowlist:
            strategy_intervals = [interval for interval in intervals if (key, interval) in timeframe_allowlist]
        else:
            strategy_intervals = [interval for interval in intervals if interval in params_by_interval]
        if not strategy_intervals:
            # Strategy exists in runtime registry but has no optimized params for the active interval.
            # Keep it visible rather than hiding monitored code paths.
            strategy_intervals = intervals

        if timeframe_allowlist:
            symbols = sorted({
                symbol
                for interval in strategy_intervals
                for symbol in timeframe_allowlist.get((key, interval), set())
            })
        else:
            symbols = sorted(allowlist.get(key, set(watch_symbols)))
        strategies.append({
            "key": key,
            "label": strategy_labels.get(key, key),
            "intervals": strategy_intervals,
            "symbols": symbols,
            "paramsByInterval": params_by_interval,
        })

    return {
        "source": str(trading_root),
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "symbols": sorted(watch_symbols),
        "intervals": intervals,
        "strategies": strategies,
    }


def main() -> None:
    root = Path.cwd()
    trading_root = Path(os.environ.get("QUANT_TRADING_ROOT", DEFAULT_TRADING_ROOT)).expanduser()
    output = Path(os.environ.get("DASHBOARD_MONITOR_UNIVERSE_JSON", DEFAULT_OUTPUT)).expanduser()
    if not output.is_absolute():
        output = root / output

    universe = build_universe(trading_root)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(universe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "Exported monitor universe: {} symbols, {} strategies, {} intervals to {}".format(
            len(universe["symbols"]),
            len(universe["strategies"]),
            len(universe["intervals"]),
            output,
        )
    )


if __name__ == "__main__":
    main()
