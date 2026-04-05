import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Search,
  Heart, Thermometer, Wind, Shield, MapPin, Stethoscope,
  ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import type { Personnel } from "@shared/schema";
import { AiDispatchModal } from "./ai-dispatch-modal";
import { useI18n } from "@/lib/i18n";

interface PersonnelTableProps {
  onSelect: (id: number) => void;
  onDoubleClick?: (id: number) => void;
  selectedId: number | null;
}

type SortField = "name" | "status" | "hr" | "spo2" | "temp" | "riskScore" | "zone" | "role" | "battery";
type SortDir = "asc" | "desc";

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pilgrim: { bg: "bg-[#aaaaaa]", text: "text-slate-600", label: "Pilgrim" },
  paramedic: { bg: "bg-red-50", text: "text-red-600", label: "Paramedic" },
  doctor: { bg: "bg-blue-50", text: "text-blue-600", label: "Doctor" },
  nurse: { bg: "bg-purple-50", text: "text-purple-600", label: "Nurse" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  ok: { bg: "bg-emerald-50", text: "text-emerald-600" },
  warning: { bg: "bg-amber-50", text: "text-amber-600" },
  critical: { bg: "bg-red-50", text: "text-red-600" },
};

export function PersonnelTable({ onSelect, onDoubleClick, selectedId }: PersonnelTableProps) {
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>("riskScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [showDispatch, setShowDispatch] = useState(false);
  const pageSize = 50;

  const { data: personnelResult, isLoading } = useQuery<{ data: Personnel[]; total: number }>({
    queryKey: ["/api/personnel", "table"],
    queryFn: async () => {
      const res = await fetch("/api/personnel?limit=2000");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const allPersonnel = personnelResult?.data || [];

  const zones = useMemo(() => {
    const zoneSet = new Set(allPersonnel.map(p => p.zone).filter(Boolean));
    return Array.from(zoneSet).sort();
  }, [allPersonnel]);

  const filtered = useMemo(() => {
    let list = [...allPersonnel];
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (roleFilter !== "all") list = list.filter(p => p.role === roleFilter);
    if (zoneFilter !== "all") list = list.filter(p => p.zone === zoneFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.externalId.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let aVal = a[sortField] as any;
      let bVal = b[sortField] as any;
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [allPersonnel, statusFilter, roleFilter, zoneFilter, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-h-text-dim" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-h-teal" /> : <ArrowDown className="w-3 h-3 text-h-teal" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="personnel-table">
      <div className="px-4 py-3 bg-h-surface border-b border-h-border flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-h-text-dim absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("Search name or ID...")}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            data-testid="input-table-search"
            className="bg-h-surface2 border border-h-border rounded-md pl-8 pr-3 py-1.5 text-xs text-h-text-bright placeholder:text-h-text-dim font-mono w-48 focus:outline-none focus:border-h-teal"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-h-text-dim" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            data-testid="select-status-filter"
            className="bg-h-surface2 border border-h-border rounded-md px-2 py-1.5 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
          >
            <option value="all">{t("All Status")}</option>
            <option value="ok">{t("Normal")}</option>
            <option value="warning">{t("Warning")}</option>
            <option value="critical">{t("Critical")}</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
            data-testid="select-role-filter"
            className="bg-h-surface2 border border-h-border rounded-md px-2 py-1.5 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
          >
            <option value="all">{t("All Roles")}</option>
            <option value="pilgrim">{t("Pilgrims")}</option>
            <option value="paramedic">{t("Paramedics")}</option>
            <option value="doctor">{t("Doctors")}</option>
            <option value="nurse">{t("Nurses")}</option>
          </select>

          <select
            value={zoneFilter}
            onChange={(e) => { setZoneFilter(e.target.value); setPage(0); }}
            data-testid="select-zone-filter"
            className="bg-h-surface2 border border-h-border rounded-md px-2 py-1.5 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
          >
            <option value="all">{t("All Zones")}</option>
            {zones.map(z => <option key={z} value={z!}>{z}</option>)}
          </select>
        </div>

        <button
          onClick={() => setShowDispatch(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm"
          data-testid="button-ai-suggestion"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t("AI Suggestion")}
        </button>
        <div className="font-mono text-[11px] text-h-text-dim">
          {filtered.length} {t("results")}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-mono" data-testid="data-table">
          <thead className="bg-h-surface2 sticky top-0 z-10">
            <tr className="text-left">
              <Th field="name" current={sortField} dir={sortDir} onSort={toggleSort}>{t("Name")}</Th>
              <Th field="role" current={sortField} dir={sortDir} onSort={toggleSort}>{t("Role")}</Th>
              <Th field="status" current={sortField} dir={sortDir} onSort={toggleSort}>{t("Status")}</Th>
              <Th field="zone" current={sortField} dir={sortDir} onSort={toggleSort}>{t("Zone")}</Th>
              <Th field="hr" current={sortField} dir={sortDir} onSort={toggleSort}>
                <Heart className="w-3 h-3 inline mr-1" />{t("HR")}
              </Th>
              <Th field="spo2" current={sortField} dir={sortDir} onSort={toggleSort}>
                <Wind className="w-3 h-3 inline mr-1" />{t("SpO2")}
              </Th>
              <Th field="temp" current={sortField} dir={sortDir} onSort={toggleSort}>
                <Thermometer className="w-3 h-3 inline mr-1" />{t("Temp")}
              </Th>
              <Th field="riskScore" current={sortField} dir={sortDir} onSort={toggleSort}>
                <Shield className="w-3 h-3 inline mr-1" />{t("Risk")}
              </Th>
              <Th field="battery" current={sortField} dir={sortDir} onSort={toggleSort}>{t("Battery")}</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <td key={j} className="px-3 py-2 border-b border-h-border">
                      <div className="h-3 bg-h-surface3 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              paged.map(p => (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  onDoubleClick={() => onDoubleClick?.(p.id)}
                  data-testid={`row-person-${p.id}`}
                  className={`cursor-pointer transition-colors ${
                    p.id === selectedId ? "bg-h-teal/5" : "hover:bg-h-surface2"
                  } ${p.status === "critical" ? "bg-h-rose/3" : ""}`}
                >
                  <td className="px-3 py-2 border-b border-h-border">
                    <div className="font-bold text-h-text-bright">{p.name}</div>
                    <div className="text-[10px] text-h-text-dim">{p.externalId}</div>
                  </td>
                  <td className="px-3 py-2 border-b border-h-border">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ROLE_STYLES[p.role]?.bg || ""} ${ROLE_STYLES[p.role]?.text || ""}`}>
                      {ROLE_STYLES[p.role]?.label || p.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b border-h-border">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[p.status]?.bg || ""} ${STATUS_STYLES[p.status]?.text || ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b border-h-border text-h-text-dim">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{p.zone}
                    </span>
                  </td>
                  <td className={`px-3 py-2 border-b border-h-border font-bold ${p.hr > 130 ? "text-h-rose" : p.hr > 100 ? "text-h-amber" : "text-h-text"}`}>
                    {p.hr}
                  </td>
                  <td className={`px-3 py-2 border-b border-h-border font-bold ${p.spo2 < 92 ? "text-h-rose" : p.spo2 < 95 ? "text-h-amber" : "text-h-text"}`}>
                    {p.spo2}%
                  </td>
                  <td className={`px-3 py-2 border-b border-h-border font-bold ${p.temp > 38 ? "text-h-rose" : p.temp > 37.5 ? "text-h-amber" : "text-h-text"}`}>
                    {p.temp}&deg;C
                  </td>
                  <td className="px-3 py-2 border-b border-h-border">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-1.5 bg-h-surface3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.riskScore}%`,
                            background: p.riskScore > 70 ? "#f43f5e" : p.riskScore > 40 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${p.riskScore > 70 ? "text-h-rose" : p.riskScore > 40 ? "text-h-amber" : "text-h-text-dim"}`}>
                        {p.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className={`px-3 py-2 border-b border-h-border ${p.battery < 25 ? "text-h-rose font-bold" : "text-h-text-dim"}`}>
                    {p.battery}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-h-surface border-t border-h-border flex-shrink-0">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="font-mono text-[10px] px-2 py-1 rounded border border-h-border text-h-text-dim disabled:opacity-30 hover:bg-h-surface2 cursor-pointer"
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-3 h-3 inline" /> {t("Prev")}
          </button>
          <span className="font-mono text-[10px] text-h-text-dim">
            {t("Page")} {page + 1} {t("of")} {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="font-mono text-[10px] px-2 py-1 rounded border border-h-border text-h-text-dim disabled:opacity-30 hover:bg-h-surface2 cursor-pointer"
            data-testid="button-next-page"
          >
            {t("Next")} <ChevronRight className="w-3 h-3 inline" />
          </button>
        </div>
      )}

      <AiDispatchModal
        open={showDispatch}
        onClose={() => setShowDispatch(false)}
        criticalPersonnel={filtered.filter(p => (p.status === "critical" || p.status === "warning") && p.role === "pilgrim")}
      />
    </div>
  );
}

function Th({ field, current, dir, onSort, children }: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  return (
    <th
      onClick={() => onSort(field)}
      className="px-3 py-2 border-b border-h-border cursor-pointer hover:bg-h-surface3 transition-colors select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-1 text-h-text-dim uppercase tracking-wider text-[10px]">
        {children}
        {current === field ? (
          dir === "asc" ? <ArrowUp className="w-3 h-3 text-h-teal" /> : <ArrowDown className="w-3 h-3 text-h-teal" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
