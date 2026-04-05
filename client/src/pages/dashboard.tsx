import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Map as MapIcon, Users, Bell, BarChart3, UserPlus,
  Shield, LogOut, PhoneCall, Bot, SlidersHorizontal, X, Watch,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { MapView } from "@/components/map-view";
import { StatusBar } from "@/components/status-bar";
import { GroupsPanelCompact } from "@/components/groups-panel-compact";
import { AnalyticsView } from "@/components/analytics-view";
import { PersonnelTable } from "@/components/personnel-table";
import { EnhancedAlerts } from "@/components/enhanced-alerts";
import { PersonDetailPage } from "@/components/person-detail-page";
import { RegisterPersonnel } from "@/components/register-personnel";
import { OutboundTickets } from "@/components/outbound-tickets";
import { N8nWorkflowBlock } from "@/components/ui/n8n-workflow-block-shadcnui";
import { WearablesView } from "@/components/wearables-view";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { Personnel, Alert } from "@shared/schema";

const NAV_ITEMS = [
  { key: "Overview", icon: MapIcon },
  { key: "Personnel", icon: Users },
  { key: "Alerts", icon: Bell },
  { key: "Wearables", icon: Watch },
  { key: "Analytics", icon: BarChart3 },
  { key: "Tickets", icon: PhoneCall },
  { key: "Register", icon: UserPlus },
  { key: "AI Automation", icon: Bot },
];

const MOBILE_NAV = NAV_ITEMS;

export default function Dashboard() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailPersonId, setDetailPersonId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const { data: stats } = useQuery<{
    total: number; active: number; ok: number; warning: number; critical: number; groupCount: number;
  }>({ queryKey: ["/api/stats"] });

  const personnelParams = new URLSearchParams();
  personnelParams.set("limit", "1000");
  if (selectedGroupId) personnelParams.set("groupId", String(selectedGroupId));
  if (searchQuery) personnelParams.set("search", searchQuery);
  const personnelUrl = `/api/personnel?${personnelParams}`;

  const { data: personnelResult } = useQuery<{ data: Personnel[]; total: number }>({
    queryKey: ["/api/personnel", selectedGroupId, searchQuery],
    queryFn: async () => {
      const res = await fetch(personnelUrl);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: alertsList = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const allPersonnel = personnelResult?.data || [];

  const personnelList = useMemo(() => {
    if (!selectedZone) return allPersonnel;
    return allPersonnel.filter((p) => p.zone === selectedZone);
  }, [allPersonnel, selectedZone]);

  const detailPerson = detailPersonId ? allPersonnel.find((p) => p.id === detailPersonId) || null : null;

  const handleSearch = useCallback((query: string) => setSearchQuery(query), []);
  const activeAlerts = alertsList.filter((a) => !a.acknowledged);

  const handlePersonnelSelect = useCallback((id: number) => {
    setSelectedId(id);
    if (activeTab === "Personnel") setActiveTab("Overview");
  }, [activeTab]);

  const handleOpenDetail = useCallback((id: number) => setDetailPersonId(id), []);
  const handleCloseDetail = useCallback(() => setDetailPersonId(null), []);

  const RightPanelContent = (
    <div className="px-1.5 py-2">
      <GroupsPanelCompact selectedGroupId={selectedGroupId} onSelectGroup={setSelectedGroupId} />
    </div>
  );

  return (
    <div className="h-[100dvh] flex bg-h-bg overflow-hidden" data-testid="dashboard">

      {/* ── Desktop left sidebar ── */}
      <nav className="hidden md:flex w-[52px] flex-shrink-0 bg-slate-900 flex-col items-center justify-between py-3 z-50" data-testid="nav-sidebar">
        <div className="flex flex-col items-center gap-1">
          <div className="w-9 h-9 rounded-full overflow-hidden mb-3 border-2 border-white/30 shadow-[0_2px_12px_rgba(183,28,28,0.4)] mx-auto flex items-center justify-center" data-testid="logo">
            <img src="/srca-logo.png" alt="Saudi Red Crescent Authority" className="w-full h-full object-cover object-center" />
          </div>
          {NAV_ITEMS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-testid={`nav-${key.toLowerCase().replace(/\s+/g, "-")}`}
              title={t(key)}
              aria-label={t(key)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 ${
                activeTab === key
                  ? "bg-red-900/80 text-white border border-red-800"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <Link href="/admin">
            <a data-testid="link-admin" title={t("Admin")} aria-label={t("Admin")}
              className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all text-amber-400 hover:text-amber-300 hover:bg-slate-800 border border-transparent"
            >
              <Shield className="w-[18px] h-[18px]" />
            </a>
          </Link>
          <button
            onClick={async () => { await apiRequest("POST", "/api/auth/logout"); window.location.reload(); }}
            data-testid="button-logout" title={t("Logout")} aria-label={t("Logout")}
            className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer transition-all text-rose-400 hover:text-rose-300 hover:bg-slate-800 border border-transparent"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader alertCount={activeAlerts.length} totalPersonnel={stats?.total || 0} onSearch={handleSearch} />

        <div className="flex flex-1 overflow-hidden md:pb-0 pb-16">
          {activeTab === "Overview" && (
            <>
              <MapView
                personnel={personnelList}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onOpenDetail={handleOpenDetail}
                stats={{ ok: stats?.ok || 0, warning: stats?.warning || 0, critical: stats?.critical || 0, active: stats?.active || 0 }}
              />

              {/* Desktop right sidebar */}
              <aside className="hidden md:flex glass-panel-strong border-l border-slate-200 flex-col overflow-hidden w-[44px] flex-shrink-0" data-testid="sidebar-right">
                {RightPanelContent}
              </aside>

              {/* Mobile filter FAB */}
              <button
                onClick={() => setMobileRightOpen(true)}
                data-testid="button-mobile-filters"
                className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl border border-[#505050]/40"
                style={{ background: "#b71c1c" }}
                aria-label="Open filters and alerts"
              >
                <SlidersHorizontal className="w-5 h-5 text-white" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
                  </span>
                )}
              </button>
            </>
          )}

          {activeTab === "Personnel" && <PersonnelTable onSelect={handlePersonnelSelect} selectedId={selectedId} onDoubleClick={handleOpenDetail} />}
          {activeTab === "Alerts" && <EnhancedAlerts />}
          {activeTab === "Analytics" && <AnalyticsView />}
          {activeTab === "Tickets" && <OutboundTickets />}
          {activeTab === "Register" && <RegisterPersonnel />}
          {activeTab === "Wearables" && <WearablesView />}
          {activeTab === "AI Automation" && <N8nWorkflowBlock />}
        </div>

        <StatusBar />
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t" style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }} data-testid="mobile-nav">
        <div className="flex items-center justify-around px-0.5 pt-1.5 pb-2">
          {MOBILE_NAV.map(({ key, icon: Icon }) => {
            const isActive = activeTab === key;
            const hasBadge = key === "Alerts" && activeAlerts.length > 0;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                data-testid={`mobile-nav-${key.toLowerCase().replace(/\s+/g, "-")}`}
                aria-label={t(key)}
                title={t(key)}
                className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-all"
                style={{ color: isActive ? "#b71c1c" : "rgba(255,255,255,0.45)", background: isActive ? "rgba(183,28,28,0.15)" : "transparent" }}
              >
                <Icon className="w-[18px] h-[18px]" />
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#b71c1c" }} />
                )}
                {hasBadge && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-amber-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center">
                    {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
                  </span>
                )}
              </button>
            );
          })}
          <Link href="/admin">
            <a className="flex flex-col items-center justify-center w-10 h-10 rounded-xl cursor-pointer" style={{ color: "rgba(251,191,36,0.6)" }} aria-label={t("Admin")} title={t("Admin")}>
              <Shield className="w-[18px] h-[18px]" />
            </a>
          </Link>
        </div>
      </nav>

      {/* ── Mobile right panel bottom drawer ── */}
      {mobileRightOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" data-testid="mobile-right-drawer">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileRightOpen(false)}
          />
          <div className="relative w-full rounded-t-2xl overflow-hidden flex flex-col" style={{ background: "#ffffff", maxHeight: "78vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}>
              <span className="font-mono text-xs font-bold uppercase tracking-[2px]" style={{ color: "#1f1f1f" }}>Filters & Alerts</span>
              <button
                onClick={() => setMobileRightOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: "rgba(0,0,0,0.06)" }}
              >
                <X className="w-4 h-4" style={{ color: "#1f1f1f" }} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {RightPanelContent}
            </div>
          </div>
        </div>
      )}

      {detailPerson && <PersonDetailPage person={detailPerson} onClose={handleCloseDetail} />}
    </div>
  );
}
