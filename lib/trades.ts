import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadTradesFromSupabase } from "@/lib/supabaseData";
import type { Trade } from "@/lib/types";

export async function readTradesFile(filePath: string): Promise<Trade[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected trade data to be an array");
  }

  return parsed as Trade[];
}

export async function loadDashboardTrades(): Promise<Trade[]> {
  const tradesPath = join(process.cwd(), "public", "data", "trades.json");
  const samplePath = join(process.cwd(), "public", "data", "trades.sample.json");

  try {
    const supabaseTrades = await loadTradesFromSupabase();
    if (supabaseTrades) {
      return supabaseTrades;
    }
  } catch (error) {
    console.warn(error);
  }

  try {
    return await readTradesFile(tradesPath);
  } catch {
    return readTradesFile(samplePath);
  }
}
