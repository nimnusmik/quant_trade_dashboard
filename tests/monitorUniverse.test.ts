import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  calculateMonitorCoverage,
  readMonitorUniverseFile,
} from "@/lib/monitorUniverse";

const sampleUniverse = {
  source: "quant_trading",
  updatedAt: "2026-06-15T00:00:00Z",
  symbols: ["BTCUSDT", "ETHUSDT", "XRPUSDT"],
  intervals: ["1m", "5m", "1h"],
  strategies: [
    {
      key: "S1_EMA_Cross",
      label: "EMA 크로스 추세추종",
      intervals: ["1m", "5m", "1h"],
      symbols: ["BTCUSDT", "ETHUSDT", "XRPUSDT"],
      paramsByInterval: {
        "1h": { tp_pct: 0.05, sl_pct: 0.002, ema_fast: 5, ema_slow: 13 },
      },
    },
    {
      key: "S8_Relative_Strength_Rotation",
      label: "BTC 대비 상대강도 로테이션",
      intervals: ["1h"],
      symbols: ["BTCUSDT", "ETHUSDT", "XRPUSDT"],
      paramsByInterval: {
        "1h": { tp_pct: 0.02, sl_pct: 0.005, rs_window: 24 },
      },
    },
  ],
};

describe("monitor universe", () => {
  it("reads the full monitored symbol and strategy universe", async () => {
    const dir = await mkdtemp(join(tmpdir(), "monitor-universe-"));
    const filePath = join(dir, "monitor-universe.json");
    await writeFile(filePath, JSON.stringify(sampleUniverse));

    await expect(readMonitorUniverseFile(filePath)).resolves.toEqual(sampleUniverse);
  });

  it("calculates coverage across symbols, strategies, intervals, and combinations", () => {
    expect(calculateMonitorCoverage(sampleUniverse)).toEqual({
      symbolCount: 3,
      strategyCount: 2,
      intervalCount: 3,
      combinationCount: 12,
    });
  });
});
