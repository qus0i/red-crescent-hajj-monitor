import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Personnel } from "@shared/schema";
import { Hexagon } from "lucide-react";
import { AdvancedMap, type MapCircle } from "@/components/ui/interactive-map";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface MapViewProps {
  personnel: Personnel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onOpenDetail?: (id: number) => void;
  stats: { ok: number; warning: number; critical: number; active: number };
}

function FlyToSelected({ personnel, selectedId }: { personnel: Personnel[]; selectedId: number | null }) {
  const map = useMap();
  const prevIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedId && selectedId !== prevIdRef.current) {
      prevIdRef.current = selectedId;
      const p = personnel.find((x) => x.id === selectedId);
      if (p?.lat && p?.lng) {
        map.flyTo([p.lat, p.lng], 13, { duration: 0.8 });
      }
    }
  }, [selectedId, personnel, map]);

  return null;
}

function buildActionTerminalPopup(p: Personnel) {
  const statusColor = p.status === "critical" ? "text-rose-600" : p.status === "warning" ? "text-amber-600" : "text-emerald-600";
  const statusBg = p.status === "critical" ? "bg-rose-50" : p.status === "warning" ? "bg-amber-50" : "bg-emerald-50";

  return `
    <div class="font-mono text-[11px] leading-tight text-slate-800" style="min-width:280px;">
      <div class="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
        <div>
          <div class="text-slate-400 uppercase tracking-tighter text-[9px]">Personnel ID</div>
          <div class="font-bold text-slate-900">${p.externalId}</div>
        </div>
        <div class="text-right">
          <div class="${statusBg} ${statusColor} px-2 py-0.5 rounded border border-current/20 font-bold uppercase">
            ${p.status}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 mb-4">
        <div class="bg-slate-50 p-2 rounded border border-slate-100">
          <div class="text-slate-400 text-[9px] uppercase">Heart Rate</div>
          <div class="text-lg font-bold ${p.hr > 100 ? "text-rose-600" : "text-slate-900"}">${p.hr}<span class="text-[10px] font-normal ml-1">BPM</span></div>
        </div>
        <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div class="text-slate-400 text-[9px] uppercase">SpO2 Level</div>
          <div class="text-lg font-bold ${p.spo2 < 94 ? "text-rose-600" : "text-slate-900"}">${p.spo2}<span class="text-[10px] font-normal ml-1">%</span></div>
        </div>
        <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div class="text-slate-400 text-[9px] uppercase">Temperature</div>
          <div class="text-lg font-bold ${p.temp > 37.5 ? "text-rose-600" : "text-slate-900"}">${p.temp}<span class="text-[10px] font-normal ml-1">C</span></div>
        </div>
        <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div class="text-slate-400 text-[9px] uppercase">Risk Score</div>
          <div class="text-lg font-bold ${p.riskScore > 70 ? "text-rose-600" : "text-slate-900"}">${p.riskScore}<span class="text-[10px] font-normal ml-1">/100</span></div>
        </div>
      </div>

      <div class="space-y-1 mb-4 text-slate-600">
        <div class="flex justify-between"><span>Blood Pressure:</span> <span class="text-slate-900">${p.bp}</span></div>
        <div class="flex justify-between"><span>Active Steps:</span> <span class="text-slate-900">${p.steps.toLocaleString()}</span></div>
        <div class="flex justify-between"><span>Device Battery:</span> <span class="${p.battery < 20 ? "text-red-600 font-bold" : "text-slate-900"}">${p.battery}%</span></div>
        <div class="flex justify-between"><span>Fall Detection:</span> <span class="${p.fallDetected ? "text-red-600 font-bold" : "text-slate-900"}">${p.fallDetected ? "[ TRIGGERED ]" : "[ STANDBY ]"}</span></div>
        <div class="flex justify-between"><span>Zone:</span> <span class="text-slate-900">${p.zone}</span></div>
      </div>

      <div class="grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-3">
        <button class="action-terminal-btn bg-rose-600 text-white p-1.5 rounded-lg transition-colors text-center font-semibold col-span-2" data-action="dispatch-paramedic" data-person-id="${p.id}" data-person-name="${p.name}">Dispatch Paramedic</button>
        <button class="action-terminal-btn bg-slate-100 text-slate-800 p-1.5 rounded-lg transition-colors text-center" data-action="emergency-contact" data-person-id="${p.id}" data-person-name="${p.name}">Emergency Contact</button>
        <button class="action-terminal-btn bg-slate-100 text-slate-800 p-1.5 rounded-lg transition-colors text-center" data-action="request-evac" data-person-id="${p.id}" data-person-name="${p.name}">Med-Evac</button>
        <button class="action-terminal-btn border border-emerald-300 text-emerald-700 bg-emerald-50 p-1.5 rounded-lg transition-colors text-center" data-action="share-vitals" data-person-id="${p.id}" data-person-name="${p.name}">Share Vitals</button>
        <button class="action-terminal-btn border border-emerald-300 text-emerald-700 bg-emerald-50 p-1.5 rounded-lg transition-colors text-center" data-action="increase-monitoring" data-person-id="${p.id}" data-person-name="${p.name}">Boost Sensor</button>
        <button class="action-terminal-btn bg-teal-600 text-white p-1.5 rounded-lg transition-colors text-center col-span-2 font-semibold" data-action="wellness-check" data-person-id="${p.id}" data-person-name="${p.name}">Request Wellness Check</button>
      </div>
    </div>
  `;
}

const ROLE_SVG: Record<string, string> = {
  paramedic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-svg"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17H3v-4a1 1 0 0 1 1-1h2"/><path d="M9 17h6"/><path d="M19 17h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-3.316-1.106V7a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v5"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="10" y1="9" x2="14" y2="9"/></svg>`,
  doctor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-svg"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
  nurse: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="role-svg"><path d="M12 2L12 6"/><path d="M10 4h4"/><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 12v6"/><path d="M8 18h8"/><circle cx="12" cy="20" r="2"/></svg>`,
};

const ROLE_LABEL: Record<string, string> = {
  paramedic: "EMT",
  doctor: "DR",
  nurse: "RN",
};

const ROLE_COLOR_CLASS: Record<string, string> = {
  paramedic: "staff-paramedic",
  doctor: "staff-doctor",
  nurse: "staff-nurse",
};

function createStatusIcon(p: Personnel, isSelected: boolean) {
  const colorClass = p.status === "critical" ? "marker-red" : p.status === "warning" ? "marker-amber" : "marker-green";
  const isStaff = p.role === "paramedic" || p.role === "doctor" || p.role === "nurse";

  if (isStaff) {
    const svg = ROLE_SVG[p.role] || "";
    const label = ROLE_LABEL[p.role] || "";
    const roleColor = ROLE_COLOR_CLASS[p.role] || "";
    return L.divIcon({
      className: "custom-marker-container",
      html: `<div class="staff-marker ${roleColor} ${isSelected ? "marker-selected" : ""}">${svg}<span class="staff-label">${label}</span></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

  const shortId = p.externalId?.replace("HC-", "") || "";
  return L.divIcon({
    className: "custom-marker-container",
    html: `<div class="custom-marker ${colorClass} ${isSelected ? "marker-selected" : ""}">${shortId}</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function MapView({ personnel, selectedId, onSelect, onOpenDetail, stats }: MapViewProps) {
  const { t } = useI18n();
  const [activeControl, setActiveControl] = useState("Live Track");
  const [showZones, setShowZones] = useState(true);
  const [useSatellite, setUseSatellite] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "warning" | "critical">("all");
  const controls = ["Live Track", "Heatmap", "Zones", "Satellite"];
  const { toast } = useToast();

  useEffect(() => {
    const actionMessages: Record<string, (name: string) => { title: string; description: string }> = {
      "dispatch-paramedic": (n) => ({ title: "Paramedic Dispatched", description: `Nearest available paramedic unit routed to ${n}'s location. ETA calculating...` }),
      "emergency-contact": (n) => ({ title: "Emergency Contact Notified", description: `Automated alert sent to ${n}'s registered emergency contact via SMS and call.` }),
      "request-evac": (n) => ({ title: "Medical Evacuation Requested", description: `Ground transport team dispatched to ${n}'s coordinates. Command notified.` }),
      "share-vitals": (n) => ({ title: "Live Vitals Streaming", description: `Real-time vitals feed for ${n} now streaming to on-call physician dashboard.` }),
      "increase-monitoring": (n) => ({ title: "Monitoring Frequency Increased", description: `Sensor polling for ${n} boosted to every 5 seconds. Data rate elevated.` }),
      "wellness-check": (n) => ({ title: "Wellness Check Sent", description: `Device vibration triggered for ${n}. Awaiting acknowledgment response...` }),
      "flag-review": (n) => ({ title: "Flagged for Priority Review", description: `${n} escalated to supervising physician queue. Review priority: URGENT.` }),
      "lock-zone": (n) => ({ title: "Zone Lockdown Activated", description: `Restricting access to ${n}'s zone. Security personnel and barriers alerted.` }),
      "gps-track": (n) => ({ title: "Live GPS Tracking Enabled", description: `Real-time location streaming activated for ${n}. Position updating every 2s.` }),
    };

    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.action-terminal-btn') as HTMLElement | null;
      if (!btn) return;
      const action = btn.dataset.action;
      const personName = btn.dataset.personName || "Unknown";
      if (action && actionMessages[action]) {
        const msg = actionMessages[action](personName);
        toast({ title: msg.title, description: msg.description });
      }
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [toast]);

  const markers = useMemo(() => {
    let filtered = personnel.filter((p) => p.lat && p.lng);
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    return filtered.map((p) => ({
      id: p.id,
      position: [p.lat!, p.lng!] as [number, number],
      icon: createStatusIcon(p, p.id === selectedId),
      popup: {
        title: `${p.name} (${p.externalId})`,
        content: `Zone: ${p.zone || "N/A"} · HR: ${p.hr} BPM · SpO2: ${p.spo2}% · Status: ${p.status.toUpperCase()}`,
        richHtml: buildActionTerminalPopup(p),
      },
    }));
  }, [personnel, selectedId, statusFilter]);

  const zoneSeverityData = useMemo(() => {
    const zoneMap = new Map<string, { lats: number[]; lngs: number[]; critical: number; warning: number; ok: number; total: number }>();
    for (const p of personnel) {
      if (!p.zone || !p.lat || !p.lng) continue;
      if (!zoneMap.has(p.zone)) zoneMap.set(p.zone, { lats: [], lngs: [], critical: 0, warning: 0, ok: 0, total: 0 });
      const z = zoneMap.get(p.zone)!;
      z.lats.push(p.lat);
      z.lngs.push(p.lng);
      z.total++;
      if (p.status === "critical") z.critical++;
      else if (p.status === "warning") z.warning++;
      else z.ok++;
    }
    return zoneMap;
  }, [personnel]);

  const zoneCircles: MapCircle[] = useMemo(() => {
    if (!showZones) return [];

    return Array.from(zoneSeverityData.entries()).map(([zone, data]) => {
      const centerLat = data.lats.reduce((a, b) => a + b, 0) / data.lats.length;
      const centerLng = data.lngs.reduce((a, b) => a + b, 0) / data.lngs.length;
      const critRatio = data.total > 0 ? data.critical / data.total : 0;
      const warnRatio = data.total > 0 ? data.warning / data.total : 0;

      let color = "#10b981";
      let fillOpacity = 0.12;
      let weight = 2;
      if (critRatio > 0.15 || data.critical >= 3) {
        color = "#e11d48";
        fillOpacity = 0.25;
        weight = 3;
      } else if (data.critical > 0) {
        color = "#f43f5e";
        fillOpacity = 0.18;
        weight = 2;
      } else if (warnRatio > 0.3) {
        color = "#d97706";
        fillOpacity = 0.18;
        weight = 2;
      } else if (data.warning > 0) {
        color = "#f59e0b";
        fillOpacity = 0.14;
      }

      const severityLabel = data.critical > 0 ? "CRITICAL" : data.warning > 0 ? "WARNING" : "NORMAL";
      const severityColor = data.critical > 0 ? "#e11d48" : data.warning > 0 ? "#d97706" : "#059669";

      return {
        id: zone,
        center: [centerLat, centerLng] as [number, number],
        radius: 1200,
        style: { color, weight, fillOpacity, dashArray: data.critical > 0 ? undefined : "6 3" },
        popup: `<div style="font-family:monospace;font-size:11px;min-width:200px;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${zone}</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#64748b;">Total:</span>
            <span style="font-weight:bold;">${data.total}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#e11d48;">Critical:</span>
            <span style="font-weight:bold;color:#e11d48;">${data.critical}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="color:#d97706;">Warning:</span>
            <span style="font-weight:bold;color:#d97706;">${data.warning}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#059669;">Normal:</span>
            <span style="font-weight:bold;color:#059669;">${data.ok}</span>
          </div>
          <div style="text-align:center;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:10px;letter-spacing:1px;color:white;background:${severityColor};">${severityLabel}</div>
        </div>`,
      };
    });
  }, [zoneSeverityData, showZones]);

  const zoneBadgeMarkers = useMemo(() => {
    if (!showZones) return [];
    return Array.from(zoneSeverityData.entries()).map(([zone, data]) => {
      const centerLat = data.lats.reduce((a: number, b: number) => a + b, 0) / data.lats.length;
      const centerLng = data.lngs.reduce((a: number, b: number) => a + b, 0) / data.lngs.length;
      const bgColor = data.critical > 0 ? "#e11d48" : data.warning > 0 ? "#d97706" : "#0f172a";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${bgColor};color:#fff;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;padding:1px 5px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.4);white-space:nowrap;pointer-events:none;line-height:1.4;">${data.total}</div>`,
        iconSize: [28, 18],
        iconAnchor: [14, 9],
      });
      return {
        id: `zone-badge-${zone}`,
        position: [centerLat, centerLng] as [number, number],
        icon,
      };
    });
  }, [zoneSeverityData, showZones]);

  const allMarkers = useMemo(() => [...markers, ...zoneBadgeMarkers], [markers, zoneBadgeMarkers]);

  const handleControlClick = useCallback((c: string) => {
    setActiveControl(c);
    if (c === "Zones") setShowZones((v) => !v);
    if (c === "Satellite") setUseSatellite((v) => !v);
  }, []);

  const handleMarkerClick = useCallback((marker: any) => {
    if (typeof marker.id === "string" && marker.id.startsWith("zone-badge-")) return;
    onSelect(marker.id as number);
  }, [onSelect]);

  const handleMarkerDblClick = useCallback((marker: any) => {
    if (typeof marker.id === "string" && marker.id.startsWith("zone-badge-")) return;
    onOpenDetail?.(marker.id as number);
  }, [onOpenDetail]);

  return (
    <div className="flex flex-col overflow-hidden relative flex-1" data-testid="map-panel">
      <div className="flex items-center justify-between px-4 py-2.5 glass-panel-strong border-b border-h-border flex-shrink-0 z-10">
        <div className="flex items-center gap-3" data-testid="map-stats">
          <StatBadge
            value={stats.ok} label="Normal"
            color="text-emerald-600" bgColor="bg-emerald-50" borderColor="border-emerald-200"
            isActive={statusFilter === "ok"}
            onClick={() => setStatusFilter(f => f === "ok" ? "all" : "ok")}
          />
          <StatBadge
            value={stats.warning} label="Warning"
            color="text-amber-600" bgColor="bg-amber-50" borderColor="border-amber-200"
            isActive={statusFilter === "warning"}
            onClick={() => setStatusFilter(f => f === "warning" ? "all" : "warning")}
          />
          <StatBadge
            value={stats.critical} label="Critical"
            color="text-rose-600" bgColor="bg-rose-50" borderColor="border-rose-200"
            pulse={stats.critical > 0}
            isActive={statusFilter === "critical"}
            onClick={() => setStatusFilter(f => f === "critical" ? "all" : "critical")}
          />
          <StatBadge
            value={stats.active} label="Active"
            color="text-teal-600" bgColor="bg-teal-50" borderColor="border-teal-200"
            isActive={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              data-testid="button-clear-filter"
              className="flex items-center gap-1 text-[10px] font-mono tracking-wide px-2 py-1 rounded-md bg-slate-800 text-white border border-slate-700 transition-all"
            >
              <span className="text-slate-300">Showing:</span>
              <span className="font-bold uppercase">
                {statusFilter === "ok" ? "Normal" : statusFilter === "warning" ? "Warning" : "Critical"}
              </span>
              <span className="ml-0.5 text-slate-400 text-[9px]">✕</span>
            </button>
          )}
        </div>
        <div className="flex gap-1.5" data-testid="map-controls">
          {controls.map((c) => {
            const isActive =
              c === "Zones" ? showZones :
              c === "Satellite" ? useSatellite :
              activeControl === c;
            return (
              <button
                key={c}
                onClick={() => handleControlClick(c)}
                data-testid={`button-map-${c.toLowerCase().replace(/\s/g, "-")}`}
                className={`font-mono text-[10px] tracking-[1px] px-2.5 py-1.5 rounded-md cursor-pointer uppercase transition-all border ${
                  isActive
                    ? "bg-h-teal/10 text-h-teal-bright border-h-teal-dim"
                    : "bg-h-surface2 text-h-text-dim border-h-border hover-elevate"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 relative">
        <AdvancedMap
          center={[21.4225, 39.8262]}
          zoom={13}
          markers={allMarkers}
          circles={zoneCircles}
          onMarkerClick={handleMarkerClick}
          onMarkerDblClick={handleMarkerDblClick}
          enableClustering={true}
          enableSearch={true}
          enableControls={true}
          maxMarkers={2000}
          mapLayers={{ light: !useSatellite, satellite: useSatellite }}
          style={{ height: '100%', width: '100%' }}
        >
          <FlyToSelected personnel={personnel} selectedId={selectedId} />
        </AdvancedMap>

        <div className="absolute bottom-3 left-3 glass-panel-strong border border-slate-200 rounded-lg px-2.5 py-1.5 z-[500] card-premium" data-testid="ai-overlay">
          <div className="font-mono text-[9px] flex items-center gap-1.5 text-h-text-dim" data-testid="text-ai-insight">
            <Hexagon className="w-3 h-3 text-h-teal animate-subtle-breathe flex-shrink-0" />
            <span className="text-h-teal text-[8px] tracking-[1px] uppercase font-semibold">{t("AI")}</span>
            <span className="text-h-text-dim">·</span>
            <span>
              {stats.active} active / {personnel.length > 0 ? new Set(personnel.map(p => p.zone)).size : 0} zones
              {stats.critical > 0 && <> · <span className="text-rose-600 font-semibold">{stats.critical} critical</span></>}
              {stats.warning > 0 && <> · <span className="text-amber-600 font-semibold">{stats.warning} warn</span></>}
              {stats.critical === 0 && stats.warning === 0 && <> · <span className="text-emerald-600 font-semibold">clear</span></>}
            </span>
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-live-pulse flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  value, label, color, bgColor, borderColor, pulse, isActive, onClick,
}: {
  value: number; label: string; color: string; bgColor: string; borderColor: string;
  pulse?: boolean; isActive?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`button-stat-${label.toLowerCase()}`}
      title={isActive ? `Clear filter` : `Show ${label.toLowerCase()} only`}
      className={[
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
        bgColor, borderColor,
        pulse ? "animate-alert-glow" : "",
        isActive
          ? "ring-2 ring-offset-1 shadow-md scale-105 " + borderColor.replace("border-", "ring-")
          : "opacity-80 hover:opacity-100 hover:scale-[1.02]",
        onClick ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <span className={`font-mono text-lg font-bold leading-none ${color}`}>{value}</span>
      <div className="flex flex-col items-start">
        <span className={`font-display text-[10px] tracking-[1px] uppercase ${color} font-semibold leading-none`}>
          {label}
        </span>
        {isActive && (
          <span className={`text-[8px] ${color} opacity-60 leading-none mt-0.5`}>active filter</span>
        )}
      </div>
    </button>
  );
}
