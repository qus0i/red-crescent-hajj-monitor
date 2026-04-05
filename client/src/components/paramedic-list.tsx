import { useMemo } from "react";
import { Heart, Wind, Thermometer, MapPin, Battery } from "lucide-react";
import type { Personnel } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/3d-testimonials";

interface ParamedicListProps {
  personnel: Personnel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDoubleClick?: (id: number) => void;
  total: number;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  ok: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  warning: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  critical: { border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pilgrim: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  paramedic: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  doctor: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  nurse: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
};

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function PersonnelCard({
  person: p,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  person: Personnel;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
}) {
  const status = STATUS_COLORS[p.status] || STATUS_COLORS.ok;
  const role = ROLE_COLORS[p.role] || ROLE_COLORS.pilgrim;
  const avatarColor = getAvatarColor(p.name);

  return (
    <Card
      className={`w-[120px] cursor-pointer transition-all card-premium border-l-[3px] ${
        p.status === "critical" ? "border-l-rose-400" : p.status === "warning" ? "border-l-amber-400" : "border-l-emerald-400"
      } ${isSelected ? "ring-2 ring-teal-400 shadow-lg" : ""}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      data-testid={`card-paramedic-${p.id}`}
    >
      <CardContent className="p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="size-7">
            <AvatarFallback className={`text-[10px] font-bold ${avatarColor}`}>
              {getInitials(p.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-900 truncate leading-tight" data-testid={`text-name-${p.id}`}>
              {p.name}
            </div>
            <div className="text-[9px] text-slate-400 font-mono truncate">
              {p.externalId}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${status.bg} ${status.text} border ${status.border} ${p.status === "critical" ? "animate-alert-glow" : ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${p.status === "critical" ? "animate-live-pulse" : ""}`} />
            {p.status === "ok" ? "OK" : p.status.toUpperCase()}
          </span>
          {p.role !== "pilgrim" && (
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase ${role.bg} ${role.text} border ${role.border}`}>
              {p.role === "paramedic" ? "EMT" : p.role === "doctor" ? "DR" : "RN"}
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          <VitalRow icon={<Heart className="w-3 h-3" />} label="HR" value={`${p.hr}`} unit="bpm"
            warn={p.hr > 100} critical={p.hr > 130} />
          <VitalRow icon={<Wind className="w-3 h-3" />} label="O2" value={`${p.spo2}`} unit="%"
            warn={p.spo2 < 95} critical={p.spo2 < 92} />
          <VitalRow icon={<Thermometer className="w-3 h-3" />} label="" value={`${p.temp}`} unit="C"
            warn={p.temp > 37.5} critical={p.temp > 38} />
        </div>

        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
          <span className="text-[8px] text-slate-400 font-mono flex items-center gap-0.5 truncate">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            {p.zone ? p.zone.replace("Makkah - ", "").replace("Makkah", "MKH") : "N/A"}
          </span>
          <span className={`text-[8px] font-mono flex items-center gap-0.5 flex-shrink-0 ${p.battery < 25 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
            <Battery className="w-2.5 h-2.5" />
            {p.battery}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function VitalRow({ icon, label, value, unit, warn, critical }: {
  icon: React.ReactNode; label: string; value: string; unit: string; warn: boolean; critical: boolean;
}) {
  const color = critical ? "text-red-600" : warn ? "text-amber-600" : "text-slate-700";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${color} flex-shrink-0`}>{icon}</span>
      {label && <span className="text-[9px] text-slate-400 font-mono w-5 flex-shrink-0">{label}</span>}
      <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
      <span className="text-[9px] text-slate-400 font-mono">{unit}</span>
    </div>
  );
}

export function ParamedicList({ personnel, selectedId, onSelect, onDoubleClick, total, isLoading }: ParamedicListProps) {
  const { col1, col2 } = useMemo(() => {
    const sorted = [...personnel].sort((a, b) => {
      const statusOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 };
      return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    });
    const c1: Personnel[] = [];
    const c2: Personnel[] = [];
    sorted.forEach((p, i) => (i % 2 === 0 ? c1 : c2).push(p));
    return { col1: c1, col2: c2 };
  }, [personnel]);

  return (
    <aside className="bg-white border-r border-slate-200 flex flex-col overflow-hidden w-[280px] flex-shrink-0" data-testid="sidebar-left">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <span className="font-display font-bold text-xs tracking-[2px] uppercase text-slate-500 flex items-center gap-1.5" data-testid="text-panel-title">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-live-pulse" />
          Personnel
        </span>
        <span className="font-mono text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md" data-testid="text-total-count">
          {total} TOTAL
        </span>
      </div>

      {isLoading ? (
        <div className="flex-1 p-3 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="flex-1"><div className="h-3 bg-slate-200 rounded w-3/4" /></div>
              </div>
              <div className="h-2 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : personnel.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-xs text-slate-400">No personnel found</p>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden" data-testid="paramedic-list">
          <div className="flex flex-row gap-2 h-full px-2">
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:600s] [--gap:0.5rem] h-full">
              {col1.map((p) => (
                <PersonnelCard
                  key={p.id}
                  person={p}
                  isSelected={p.id === selectedId}
                  onSelect={() => onSelect(p.id)}
                  onDoubleClick={() => onDoubleClick?.(p.id)}
                />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:650s] [--gap:0.5rem] h-full">
              {col2.map((p) => (
                <PersonnelCard
                  key={p.id}
                  person={p}
                  isSelected={p.id === selectedId}
                  onSelect={() => onSelect(p.id)}
                  onDoubleClick={() => onDoubleClick?.(p.id)}
                />
              ))}
            </Marquee>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white" />
        </div>
      )}
    </aside>
  );
}
