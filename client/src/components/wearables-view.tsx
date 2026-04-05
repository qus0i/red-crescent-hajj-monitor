import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Watch, Heart, Droplets, Wind, Thermometer, Activity, Zap, Footprints, Brain, Wifi, WifiOff, Plus, Trash2, TestTube2, CheckCircle, AlertCircle, XCircle, Edit2, Save, X } from "lucide-react";
import type { WatchReading, WebhookConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type WatchData = {
  id: number;
  watchId: string;
  model: string;
  batteryLevel: number;
  lastSync: string;
  isActive: boolean;
  person: {
    id: number;
    name: string;
    age: number;
    gender: string;
    bloodType: string | null;
    zone: string | null;
    status: string;
    nationality: string | null;
    medicalHistory: string | null;
    illnesses: string | null;
    medications: string | null;
  } | null;
  latestReading: WatchReading | null;
};

type VStatus = "ok" | "warning" | "critical" | "unknown";

function getVitalStatus(value: number | null | undefined, thresholds: { warnLow?: number; warnHigh?: number; critLow?: number; critHigh?: number }): VStatus {
  if (value == null) return "unknown";
  if ((thresholds.critLow != null && value < thresholds.critLow) || (thresholds.critHigh != null && value > thresholds.critHigh)) return "critical";
  if ((thresholds.warnLow != null && value < thresholds.warnLow) || (thresholds.warnHigh != null && value > thresholds.warnHigh)) return "warning";
  return "ok";
}

const STATUS_COLOR: Record<VStatus, string> = {
  ok: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-rose-400",
  unknown: "text-slate-500",
};
const STATUS_BG: Record<VStatus, string> = {
  ok: "bg-emerald-500/15 border-emerald-500/30",
  warning: "bg-amber-500/15 border-amber-500/30",
  critical: "bg-rose-500/15 border-rose-500/30",
  unknown: "bg-slate-500/10 border-slate-500/20",
};

function statusLabel(s: VStatus) {
  if (s === "ok") return "Normal";
  if (s === "warning") return "Elevated";
  if (s === "critical") return "Critical";
  return "—";
}

function overallStatus(r: WatchReading | null): VStatus {
  if (!r) return "unknown";
  const checks: VStatus[] = [
    getVitalStatus(r.heartRate, { warnLow: 60, warnHigh: 100, critLow: 50, critHigh: 150 }),
    getVitalStatus(r.bloodSugar, { warnLow: 80, warnHigh: 180, critLow: 70, critHigh: 250 }),
    getVitalStatus(r.spo2, { warnLow: 95, critLow: 90 }),
    getVitalStatus(r.temperature, { warnLow: 36, warnHigh: 38, critLow: 35, critHigh: 39 }),
    getVitalStatus(r.systolic, { warnLow: 90, warnHigh: 140, critLow: 80, critHigh: 180 }),
    getVitalStatus(r.respirationRate, { warnHigh: 20, critLow: 10, critHigh: 30 }),
    getVitalStatus(r.stressLevel, { warnHigh: 65, critHigh: 85 }),
  ];
  if (r.fallDetected) return "critical";
  if (checks.includes("critical")) return "critical";
  if (checks.includes("warning")) return "warning";
  return "ok";
}

function VitalRow({ icon: Icon, label, value, unit, status }: { icon: any; label: string; value: string; unit: string; status: VStatus }) {
  return (
    <div className={`flex items-center justify-between rounded px-2.5 py-1.5 border ${STATUS_BG[status]}`} data-testid={`vital-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${STATUS_COLOR[status]}`} />
        <span className="font-mono text-[10px] text-h-text-dim truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`font-mono text-[11px] font-bold ${STATUS_COLOR[status]}`}>{value}</span>
        <span className="font-mono text-[9px] text-h-text-dim">{unit}</span>
        <span className={`text-[8px] font-bold uppercase px-1 py-px rounded ${status === "ok" ? "bg-emerald-500/20 text-emerald-400" : status === "warning" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>
          {statusLabel(status)}
        </span>
      </div>
    </div>
  );
}

function MiniSparkline({ readings, field }: { readings: WatchReading[]; field: keyof WatchReading }) {
  const vals = readings.map((r) => (r[field] as number) ?? 0).reverse();
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 80, H = 24;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} className="opacity-70">
      <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function WatchCard({ watch }: { watch: WatchData }) {
  const r = watch.latestReading;
  const { data: readings = [] } = useQuery<WatchReading[]>({
    queryKey: ["/api/watches", watch.id, "readings"],
    queryFn: () => fetch(`/api/watches/${watch.id}/readings?limit=12`).then((res) => res.json()),
    refetchInterval: 30000,
  });

  const deviceStatus = overallStatus(r);
  const syncedAgo = watch.lastSync
    ? Math.round((Date.now() - new Date(watch.lastSync).getTime()) / 60000)
    : null;

  const personStatus = watch.person?.status as VStatus ?? "unknown";

  return (
    <div className={`glass-panel-strong rounded-xl border flex flex-col overflow-hidden ${
      deviceStatus === "critical" ? "border-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      : deviceStatus === "warning" ? "border-amber-500/40 shadow-[0_0_14px_rgba(245,158,11,0.10)]"
      : "border-h-border"
    }`} data-testid={`watch-card-${watch.watchId}`}>

      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between flex-shrink-0 ${
        deviceStatus === "critical" ? "bg-rose-500/10" : deviceStatus === "warning" ? "bg-amber-500/10" : "bg-h-surface2/50"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
            deviceStatus === "critical" ? "bg-rose-500/20 border-rose-500/40" : deviceStatus === "warning" ? "bg-amber-500/20 border-amber-500/40" : "bg-emerald-500/20 border-emerald-500/40"
          }`}>
            <Watch className={`w-4.5 h-4.5 ${STATUS_COLOR[deviceStatus]}`} />
          </div>
          <div>
            <div className="font-mono text-[11px] font-bold text-h-text-bright">{watch.watchId}</div>
            <div className="font-mono text-[9px] text-h-text-dim">{watch.model}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
            deviceStatus === "critical" ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
            : deviceStatus === "warning" ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
            : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
          }`}>
            {deviceStatus === "critical" ? "⚠ CRITICAL" : deviceStatus === "warning" ? "⚡ WARNING" : "✓ NORMAL"}
          </span>
          <div className="flex items-center gap-1">
            {watch.isActive ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Person info */}
      {watch.person && (
        <div className="px-4 py-2.5 border-b border-h-border bg-h-surface2/30 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0 ${
            personStatus === "critical" ? "bg-rose-600" : personStatus === "warning" ? "bg-amber-600" : "bg-emerald-600"
          }`}>
            {watch.person.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans text-[11px] font-semibold text-h-text-bright truncate">{watch.person.name}</div>
            <div className="font-mono text-[9px] text-h-text-dim">
              {watch.person.age}y · {watch.person.gender === "M" ? "Male" : "Female"} · {watch.person.bloodType || "??"} · {watch.person.zone}
            </div>
            {watch.person.illnesses && (
              <div className="font-mono text-[9px] text-amber-400 truncate mt-0.5">{watch.person.illnesses}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-[9px] text-h-text-dim">Battery</div>
            <div className={`font-mono text-[11px] font-bold ${watch.batteryLevel < 25 ? "text-rose-400" : watch.batteryLevel < 50 ? "text-amber-400" : "text-emerald-400"}`}>
              {watch.batteryLevel}%
            </div>
            <div className="font-mono text-[8px] text-h-text-dim">
              {syncedAgo != null ? `${syncedAgo}m ago` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Vitals grid */}
      <div className="px-4 py-3 flex flex-col gap-1.5 flex-1">
        {r ? (
          <>
            <VitalRow icon={Heart} label="Heart Rate" value={String(r.heartRate ?? "—")} unit="bpm"
              status={getVitalStatus(r.heartRate, { warnLow: 60, warnHigh: 100, critLow: 50, critHigh: 150 })} />
            <VitalRow icon={Droplets} label="Blood Glucose" value={r.bloodSugar != null ? r.bloodSugar.toFixed(0) : "—"} unit="mg/dL"
              status={getVitalStatus(r.bloodSugar, { warnLow: 80, warnHigh: 180, critLow: 70, critHigh: 250 })} />
            <VitalRow icon={Wind} label="SpO₂" value={String(r.spo2 ?? "—")} unit="%"
              status={getVitalStatus(r.spo2, { warnLow: 95, critLow: 90 })} />
            <VitalRow icon={Thermometer} label="Temperature" value={r.temperature != null ? r.temperature.toFixed(1) : "—"} unit="°C"
              status={getVitalStatus(r.temperature, { warnLow: 36, warnHigh: 38, critLow: 35, critHigh: 39 })} />
            <VitalRow icon={Activity} label="Blood Pressure" value={r.systolic != null ? `${r.systolic}/${r.diastolic}` : "—"} unit="mmHg"
              status={getVitalStatus(r.systolic, { warnLow: 90, warnHigh: 140, critLow: 80, critHigh: 180 })} />
            <VitalRow icon={Zap} label="Respiration" value={String(r.respirationRate ?? "—")} unit="/min"
              status={getVitalStatus(r.respirationRate, { warnHigh: 20, critLow: 10, critHigh: 30 })} />
            <VitalRow icon={Brain} label="Stress Level" value={String(r.stressLevel ?? "—")} unit="/100"
              status={getVitalStatus(r.stressLevel, { warnHigh: 65, critHigh: 85 })} />
            <VitalRow icon={Footprints} label="Steps Today" value={r.steps != null ? r.steps.toLocaleString() : "—"} unit="steps" status="ok" />
            {r.ecgStatus && r.ecgStatus !== "normal" && (
              <VitalRow icon={Activity} label="ECG" value={r.ecgStatus.toUpperCase()} unit="" status="critical" />
            )}
            {r.fallDetected && (
              <div className="flex items-center gap-2 rounded px-2.5 py-1.5 bg-rose-500/20 border border-rose-500/50 animate-pulse">
                <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span className="font-mono text-[10px] text-rose-400 font-bold">FALL DETECTED</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-h-text-dim font-mono text-[11px]">No readings available</div>
        )}
      </div>

      {/* Sparkline trends */}
      {readings.length >= 3 && (
        <div className="px-4 py-2 border-t border-h-border bg-h-surface2/20">
          <div className="font-mono text-[8px] text-h-text-dim uppercase tracking-widest mb-1.5">60-min trend</div>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <div className="font-mono text-[8px] text-rose-300 mb-0.5">HR</div>
              <MiniSparkline readings={readings} field="heartRate" />
            </div>
            <div>
              <div className="font-mono text-[8px] text-blue-300 mb-0.5">Glucose</div>
              <MiniSparkline readings={readings} field="bloodSugar" />
            </div>
            <div>
              <div className="font-mono text-[8px] text-cyan-300 mb-0.5">SpO₂</div>
              <MiniSparkline readings={readings} field="spo2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WebhookPanel() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; status?: number; error?: string } | null>>({});

  const { data: configs = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["/api/webhook-configs"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; url: string }) =>
      apiRequest("POST", "/api/webhook-configs", { name: data.name, url: data.url, isActive: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/webhook-configs"] }); setShowAdd(false); setNewName(""); setNewUrl(""); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/webhook-configs/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/webhook-configs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/webhook-configs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/webhook-configs"] }),
  });

  const testWebhook = async (id: number) => {
    setTestResults((prev) => ({ ...prev, [id]: null }));
    const resp = await fetch(`/api/webhook-configs/${id}/test`, { method: "POST" });
    const result = await resp.json();
    setTestResults((prev) => ({ ...prev, [id]: result }));
    setTimeout(() => setTestResults((prev) => ({ ...prev, [id]: undefined })), 6000);
  };

  return (
    <div className="glass-panel-strong rounded-xl border border-h-border p-4" data-testid="webhook-panel">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-[13px] text-h-text-bright">Webhook Automations</h3>
          <p className="font-mono text-[10px] text-h-text-dim mt-0.5">Connect Zapier, Pabbly, or any endpoint. Fires automatically when vitals cross thresholds.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          data-testid="button-add-webhook"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wide cursor-pointer transition-all"
          style={{ background: "#b71c1c", color: "white" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Webhook
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 rounded-lg border border-h-teal/30 bg-h-teal/5 flex flex-col gap-2">
          <div className="font-mono text-[10px] text-h-teal-bright font-bold uppercase tracking-wider">New Webhook</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (e.g. Zapier — Emergency Alert)"
            data-testid="input-webhook-name"
            className="w-full px-3 py-1.5 rounded bg-h-surface2 border border-h-border text-[11px] font-mono text-h-text-bright placeholder-h-text-dim focus:outline-none focus:border-h-teal"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            data-testid="input-webhook-url"
            className="w-full px-3 py-1.5 rounded bg-h-surface2 border border-h-border text-[11px] font-mono text-h-text-bright placeholder-h-text-dim focus:outline-none focus:border-h-teal"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate({ name: newName, url: newUrl })}
              disabled={!newName || !newUrl || createMutation.isPending}
              data-testid="button-save-webhook"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold font-mono cursor-pointer disabled:opacity-50"
              style={{ background: "#556b2f", color: "white" }}
            >
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono text-h-text-dim bg-h-surface2 cursor-pointer">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {isLoading && <div className="font-mono text-[10px] text-h-text-dim">Loading…</div>}
        {configs.map((cfg) => {
          const tr = testResults[cfg.id];
          return (
            <div key={cfg.id} className="flex items-start gap-3 p-3 rounded-lg border border-h-border bg-h-surface2/30" data-testid={`webhook-row-${cfg.id}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.isActive ? "bg-emerald-400" : "bg-slate-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] font-bold text-h-text-bright">{cfg.name}</div>
                <div className="font-mono text-[9px] text-h-text-dim truncate">{cfg.url}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-px rounded ${cfg.triggerOnCritical ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-500"}`}>Critical</span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-px rounded ${cfg.triggerOnWarning ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-500"}`}>Warning</span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-px rounded ${cfg.triggerOnFall ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/20 text-slate-500"}`}>Fall</span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-px rounded ${cfg.triggerOnBloodSugar ? "bg-purple-500/20 text-purple-400" : "bg-slate-500/20 text-slate-500"}`}>Glucose</span>
                  {cfg.lastTriggered && (
                    <span className="text-[8px] text-h-text-dim">Last: {new Date(cfg.lastTriggered).toLocaleTimeString()}</span>
                  )}
                </div>
                {tr !== undefined && (
                  <div className={`mt-1.5 flex items-center gap-1.5 font-mono text-[9px] ${tr === null ? "text-slate-400" : tr.success ? "text-emerald-400" : "text-rose-400"}`}>
                    {tr === null ? "Sending test payload…" : tr.success ? `✓ Delivered (HTTP ${tr.status})` : `✗ Failed — ${tr.error}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => testWebhook(cfg.id)}
                  data-testid={`button-test-webhook-${cfg.id}`}
                  title="Send test payload"
                  className="w-7 h-7 rounded flex items-center justify-center cursor-pointer bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30"
                >
                  <TestTube2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleMutation.mutate({ id: cfg.id, isActive: !cfg.isActive })}
                  data-testid={`button-toggle-webhook-${cfg.id}`}
                  title={cfg.isActive ? "Disable" : "Enable"}
                  className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer border ${
                    cfg.isActive ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30" : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/30"
                  }`}
                >
                  {cfg.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(cfg.id)}
                  data-testid={`button-delete-webhook-${cfg.id}`}
                  title="Delete"
                  className="w-7 h-7 rounded flex items-center justify-center cursor-pointer bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg border border-h-border bg-h-surface2/20">
        <div className="font-mono text-[10px] text-h-text-dim font-bold uppercase tracking-wider mb-2">Science-Based Alert Thresholds</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          {[
            ["Heart Rate", "Warn >100 or <60 bpm", "Critical >150 or <50 bpm"],
            ["Blood Glucose", "Warn >180 or <80 mg/dL", "Critical >250 or <70 mg/dL"],
            ["SpO₂", "Warn <95%", "Critical <90%"],
            ["Temperature", "Warn >38°C or <36°C", "Critical >39°C or <35°C"],
            ["Blood Pressure", "Warn >140 systolic", "Critical >180 systolic"],
            ["Respiration", "Warn >20 /min", "Critical >30 or <10 /min"],
            ["Stress", "Warn >65/100", "Critical >85/100"],
            ["Fall Detected", "—", "Always CRITICAL"],
          ].map(([metric, warn, crit]) => (
            <div key={metric} className="flex flex-col gap-0.5 py-1 border-b border-h-border/50 last:border-0">
              <div className="font-mono text-[9px] font-bold text-h-text-bright">{metric}</div>
              <div className="font-mono text-[8px] text-amber-400">⚡ {warn}</div>
              <div className="font-mono text-[8px] text-rose-400">⚠ {crit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WearablesView() {
  const { data: watchList = [], isLoading } = useQuery<WatchData[]>({
    queryKey: ["/api/watches"],
    refetchInterval: 30000,
  });

  const criticalCount = watchList.filter((w) => overallStatus(w.latestReading) === "critical").length;
  const warningCount = watchList.filter((w) => overallStatus(w.latestReading) === "warning").length;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="wearables-view">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-[16px] text-h-text-bright flex items-center gap-2">
            <Watch className="w-5 h-5 text-h-teal-bright" />
            Wearable Health Monitors
          </h2>
          <p className="font-mono text-[10px] text-h-text-dim mt-0.5">
            {watchList.length} device{watchList.length !== 1 ? "s" : ""} connected · Live vitals with auto webhook triggers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 animate-pulse">
              {criticalCount} CRITICAL
            </span>
          )}
          {warningCount > 0 && (
            <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
              {warningCount} WARNING
            </span>
          )}
        </div>
      </div>

      {/* Watch cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel-strong rounded-xl border border-h-border h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {watchList.map((w) => (
            <WatchCard key={w.id} watch={w} />
          ))}
        </div>
      )}

      {/* Webhook panel */}
      <WebhookPanel />
    </div>
  );
}
