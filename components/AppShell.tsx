import Link from "next/link";

const navItems = [
  { href: "/", label: "개요" },
  { href: "/monitor", label: "감시 현황" },
  { href: "/strategies", label: "전략 분석" },
  { href: "/trades", label: "거래 내역" },
  { href: "/symbols", label: "종목 차트" },
  { href: "/risk", label: "리스크" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-300">Paper Trading 감시 현황</p>
            <h1 className="text-2xl font-semibold tracking-tight">퀀트 트레이딩 대시보드</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
