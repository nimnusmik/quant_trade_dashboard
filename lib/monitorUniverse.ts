import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadMonitorUniverseFromSupabase } from "@/lib/supabaseData";
import type { MonitorCoverage, MonitorUniverse } from "@/lib/types";

export async function readMonitorUniverseFile(filePath: string): Promise<MonitorUniverse> {
  const raw = await readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!isMonitorUniverse(parsed)) {
    throw new Error("Expected monitor universe data with symbols, intervals, and strategies");
  }

  return parsed;
}

export async function loadMonitorUniverse(): Promise<MonitorUniverse> {
  try {
    const supabaseUniverse = await loadMonitorUniverseFromSupabase();
    if (supabaseUniverse) {
      return supabaseUniverse;
    }
  } catch (error) {
    console.warn(error);
  }

  const universePath = join(process.cwd(), "public", "data", "monitor-universe.json");
  const samplePath = join(process.cwd(), "public", "data", "monitor-universe.sample.json");

  try {
    return await readMonitorUniverseFile(universePath);
  } catch {
    return readMonitorUniverseFile(samplePath);
  }
}

export function calculateMonitorCoverage(universe: MonitorUniverse): MonitorCoverage {
  return {
    symbolCount: universe.symbols.length,
    strategyCount: universe.strategies.length,
    intervalCount: universe.intervals.length,
    combinationCount: universe.combinations?.length ?? universe.strategies.reduce(
      (total, strategy) => total + strategy.symbols.length * strategy.intervals.length,
      0,
    ),
  };
}

function isMonitorUniverse(value: unknown): value is MonitorUniverse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MonitorUniverse>;
  return (
    Array.isArray(candidate.symbols) &&
    Array.isArray(candidate.intervals) &&
    Array.isArray(candidate.strategies) &&
    candidate.strategies.every((strategy) => (
      Boolean(strategy) &&
      typeof strategy.key === "string" &&
      typeof strategy.label === "string" &&
      Array.isArray(strategy.symbols) &&
      Array.isArray(strategy.intervals) &&
      typeof strategy.paramsByInterval === "object"
    ))
  );
}
