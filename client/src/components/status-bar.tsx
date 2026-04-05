import { useState, useEffect, type ReactNode } from "react";
import { Wifi, Database, Cpu, BarChart3, Signal } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface StatusItem {
  key: string;
  icon: ReactNode;
  status: "green" | "amber" | "red";
}

const statusItems: StatusItem[] = [
  { key: "Health API", icon: <Wifi className="w-3 h-3" />, status: "green" },
  { key: "GPS Stream", icon: <Signal className="w-3 h-3" />, status: "green" },
  { key: "Vitals DB", icon: <Database className="w-3 h-3" />, status: "amber" },
  { key: "Analytics Engine", icon: <BarChart3 className="w-3 h-3" />, status: "green" },
  { key: "Edge Computing", icon: <Cpu className="w-3 h-3" />, status: "green" },
];

export function StatusBar() {
  const [syncText, setSyncText] = useState("just now");
  const [uptime, setUptime] = useState("00:00:00");
  const { t } = useI18n();

  useEffect(() => {
    let seconds = 0;
    const id = setInterval(() => {
      seconds += 1;
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      setUptime(`${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      if (seconds % 5 === 0) {
        if (seconds < 60) setSyncText(`${seconds}s ago`);
        else setSyncText(`${Math.floor(seconds / 60)}m ago`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const dotColors = {
    green: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-rose-500",
  };

  const statusLabels = {
    green: "Online",
    amber: "Syncing",
    red: "Offline",
  };

  return (
    <div className="h-8 glass-panel-strong border-t border-h-border flex items-center px-5 gap-6 flex-shrink-0 relative overflow-hidden" data-testid="status-bar">
      <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
        <div className="h-full w-1/4 bg-gradient-to-r from-transparent via-teal-400/30 to-transparent animate-data-stream" />
      </div>

      {statusItems.map((item) => (
        <div key={item.key} className="font-mono text-[10px] text-h-text-dim flex items-center gap-1.5 tracking-[0.5px]">
          <span className={dotColors[item.status]}>{item.icon}</span>
          <span className="text-h-text">{t(item.key)}</span>
          <span className={`text-[9px] ${dotColors[item.status]} font-semibold uppercase`}>{t(statusLabels[item.status])}</span>
        </div>
      ))}

      <div className="ml-auto flex items-center gap-4">
        <div className="font-mono text-[10px] text-h-text-dim tracking-[0.5px]" data-testid="text-uptime">
          {t("Uptime")}: <span className="text-h-teal font-semibold">{uptime}</span>
        </div>
        <div className="font-mono text-[10px] text-h-text-dim tracking-[0.5px]" data-testid="text-last-sync">
          {t("Last sync")}: <span className="text-h-text font-semibold">{syncText}</span>
        </div>
      </div>
    </div>
  );
}
