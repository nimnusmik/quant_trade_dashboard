import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { readTradesFile } from "@/lib/trades";

describe("readTradesFile", () => {
  it("reads normalized trade json from disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trades-"));
    const filePath = join(dir, "trades.json");
    await writeFile(
      filePath,
      JSON.stringify([
        {
          id: "trade-1",
          symbol: "BTCUSDT",
          side: "long",
          status: "closed",
          entryTime: "2026-06-14T09:00:00Z",
          exitTime: "2026-06-14T10:00:00Z",
          entryPrice: 100,
          exitPrice: 110,
          realizedPnl: 10,
        },
      ]),
    );

    await expect(readTradesFile(filePath)).resolves.toEqual([
      {
        id: "trade-1",
        symbol: "BTCUSDT",
        side: "long",
        status: "closed",
        entryTime: "2026-06-14T09:00:00Z",
        exitTime: "2026-06-14T10:00:00Z",
        entryPrice: 100,
        exitPrice: 110,
        realizedPnl: 10,
      },
    ]);
  });

  it("throws a helpful error when the json root is not an array", async () => {
    const dir = await mkdtemp(join(tmpdir(), "trades-"));
    const filePath = join(dir, "trades.json");
    await writeFile(filePath, JSON.stringify({ id: "not-array" }));

    await expect(readTradesFile(filePath)).rejects.toThrow(
      "Expected trade data to be an array",
    );
  });
});
