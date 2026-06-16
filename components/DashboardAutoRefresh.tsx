"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WATCHED_TABLES = ["trades", "strategy_metrics", "monitor_universe"] as const;
const DEFAULT_POLL_MS = 15_000;
const REALTIME_REFRESH_DEBOUNCE_MS = 800;

type RefreshMode = "realtime" | "polling" | "local";

function getPollMs(): number {
  const configured = Number(process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_MS);
  return Number.isFinite(configured) && configured >= 5_000 ? configured : DEFAULT_POLL_MS;
}

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function DashboardAutoRefresh() {
  const router = useRouter();
  const [mode, setMode] = useState<RefreshMode>("local");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      router.refresh();
      setLastUpdatedAt(new Date());
    };

    const refreshSoon = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(refresh, REALTIME_REFRESH_DEBOUNCE_MS);
    };

    const pollTimer = setInterval(refresh, getPollMs());
    const config = getSupabaseBrowserConfig();

    if (!config) {
      return () => {
        clearInterval(pollTimer);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      };
    }

    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = client.channel("dashboard-auto-refresh");
    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => refreshSoon(),
      );
    }

    channel.subscribe((status) => {
      setMode(status === "SUBSCRIBED" ? "realtime" : "polling");
    });

    return () => {
      clearInterval(pollTimer);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      void client.removeChannel(channel);
    };
  }, [router]);

  const label = mode === "realtime" ? "실시간 반영" : mode === "polling" ? "자동 새로고침" : "로컬 자동 새로고침";
  const helper = lastUpdatedAt
    ? `최근 확인 ${lastUpdatedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : mode === "realtime"
      ? "거래 변경 감지 대기 중"
      : "주기적으로 최신 데이터 확인 중";

  return (
    <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
      <span className="font-medium">{label}</span>
      <span className="ml-2 text-cyan-200/70">{helper}</span>
    </div>
  );
}
