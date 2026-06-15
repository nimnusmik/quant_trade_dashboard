import { AppShell } from "@/components/AppShell";
import { MonitorUniversePanel } from "@/components/MonitorUniversePanel";
import { loadMonitorUniverse } from "@/lib/monitorUniverse";

export default async function MonitorPage() {
  const universe = await loadMonitorUniverse();

  return (
    <AppShell>
      <MonitorUniversePanel universe={universe} />
    </AppShell>
  );
}
