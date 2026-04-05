import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";
import {
  AlertTriangle, CircleAlert, Bell, Check, CheckCheck,
  Filter, Clock, Shield
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function EnhancedAlerts() {
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ackFilter, setAckFilter] = useState<string>("unacknowledged");

  const { data: alertsList = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?limit=500");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const bulkAckMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("POST", "/api/alerts/bulk-acknowledge", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const stats = useMemo(() => {
    const total = alertsList.length;
    const critical = alertsList.filter(a => a.type === "critical").length;
    const warning = alertsList.filter(a => a.type === "warning").length;
    const acknowledged = alertsList.filter(a => a.acknowledged).length;
    const unacknowledged = total - acknowledged;
    return { total, critical, warning, acknowledged, unacknowledged };
  }, [alertsList]);

  const filtered = useMemo(() => {
    let list = [...alertsList];
    if (typeFilter !== "all") list = list.filter(a => a.type === typeFilter);
    if (ackFilter === "unacknowledged") list = list.filter(a => !a.acknowledged);
    else if (ackFilter === "acknowledged") list = list.filter(a => a.acknowledged);
    return list;
  }, [alertsList, typeFilter, ackFilter]);

  const unacknowledgedIds = filtered.filter(a => !a.acknowledged).map(a => a.id);

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString("en-GB", { hour12: false, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const getTimeAgo = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="enhanced-alerts">
      <div className="grid grid-cols-5 gap-3 p-4 bg-h-surface border-b border-h-border flex-shrink-0">
        <StatCard label={t("Total Personnel")} value={stats.total} icon={<Bell className="w-4 h-4" />} color="text-h-text-bright" bg="bg-h-surface2" />
        <StatCard label={t("Critical")} value={stats.critical} icon={<CircleAlert className="w-4 h-4" />} color="text-h-rose" bg="bg-h-rose/5" />
        <StatCard label={t("Warning")} value={stats.warning} icon={<AlertTriangle className="w-4 h-4" />} color="text-h-amber" bg="bg-h-amber/5" />
        <StatCard label={t("Acknowledged")} value={stats.acknowledged} icon={<Check className="w-4 h-4" />} color="text-h-emerald" bg="bg-h-emerald/5" />
        <StatCard label={t("Pending Only")} value={stats.unacknowledged} icon={<Shield className="w-4 h-4" />} color={stats.unacknowledged > 0 ? "text-h-rose" : "text-h-emerald"} bg={stats.unacknowledged > 0 ? "bg-h-rose/5" : "bg-h-emerald/5"} />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 bg-h-surface border-b border-h-border flex-shrink-0">
        <Filter className="w-3.5 h-3.5 text-h-text-dim" />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          data-testid="select-alert-type"
          className="bg-h-surface2 border border-h-border rounded-md px-2 py-1.5 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
        >
          <option value="all">{t("All Types")}</option>
          <option value="critical">{t("Critical Only")}</option>
          <option value="warning">{t("Warning Only")}</option>
        </select>

        <select
          value={ackFilter}
          onChange={(e) => setAckFilter(e.target.value)}
          data-testid="select-alert-ack"
          className="bg-h-surface2 border border-h-border rounded-md px-2 py-1.5 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
        >
          <option value="all">{t("All Types")}</option>
          <option value="unacknowledged">{t("Pending Only")}</option>
          <option value="acknowledged">{t("Acknowledged")}</option>
        </select>

        {unacknowledgedIds.length > 0 && (
          <button
            onClick={() => bulkAckMutation.mutate(unacknowledgedIds)}
            disabled={bulkAckMutation.isPending}
            data-testid="button-bulk-ack"
            className="ml-auto font-mono text-[10px] px-3 py-1.5 rounded-md cursor-pointer uppercase tracking-[0.5px] border transition-all bg-h-teal/10 border-h-teal-dim text-h-teal hover-elevate flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t("Acknowledge All")} ({unacknowledgedIds.length})
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] text-h-text-dim">
          {filtered.length} alerts
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4" data-testid="alert-timeline">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-h-surface2 border border-h-border rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-h-surface3 rounded w-3/4 mb-2" />
                <div className="h-3 bg-h-surface3 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Check className="w-10 h-10 text-h-emerald" />
            <p className="font-mono text-sm text-h-text-dim">{t("No active alerts")}</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto">
            {filtered.map((a) => (
              <div
                key={a.id}
                data-testid={`alert-row-${a.id}`}
                className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition-all card-premium ${
                  a.acknowledged ? "opacity-50 border-slate-200" : "animate-fade-in-up"
                } ${
                  a.type === "critical"
                    ? "border-l-4 border-l-rose-500 border-slate-200"
                    : "border-l-4 border-l-amber-500 border-slate-200"
                } ${!a.acknowledged && a.type === "critical" ? "vital-glow-critical" : ""}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {a.type === "critical" ? (
                    <div className="w-8 h-8 rounded-full bg-h-rose/10 flex items-center justify-center">
                      <CircleAlert className="w-4 h-4 text-h-rose" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-h-amber/10 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-h-amber" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-display font-bold text-sm text-h-text-bright tracking-[0.5px]" data-testid={`text-alert-title-${a.id}`}>
                      {a.title}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        a.type === "critical" ? "bg-h-rose/10 text-h-rose" : "bg-h-amber/10 text-h-amber"
                      }`}>
                        {a.type}
                      </span>
                      {a.acknowledged && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-h-emerald/10 text-h-emerald uppercase">
                          ACK
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[12px] text-h-text-dim leading-relaxed mb-2">{a.description}</p>

                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-h-text-dim flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(a.createdAt)}
                      <span className="text-h-teal ml-1">({getTimeAgo(a.createdAt)})</span>
                    </span>

                    {!a.acknowledged && (
                      <button
                        onClick={() => ackMutation.mutate(a.id)}
                        disabled={ackMutation.isPending}
                        data-testid={`button-ack-${a.id}`}
                        className="font-mono text-[10px] px-2.5 py-1 rounded cursor-pointer uppercase tracking-[0.5px] border transition-all bg-h-teal/10 border-h-teal-dim text-h-teal hover-elevate flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        {t("Acknowledge")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: number; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div className={`${bg} border border-slate-200 rounded-xl p-3 flex items-center gap-3 card-premium`}>
      <div className={`${color} p-2 rounded-lg ${bg}`}>{icon}</div>
      <div>
        <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
        <div className="font-mono text-[10px] text-h-text-dim uppercase tracking-wider font-semibold">{label}</div>
      </div>
    </div>
  );
}
