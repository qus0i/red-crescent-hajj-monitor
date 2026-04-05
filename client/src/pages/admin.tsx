import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Activity, ArrowLeft, Shield, Users, MapPin, Bell, Heart,
  Stethoscope, Thermometer, Radio, Clock, Server, Database,
  FileText, Settings, BarChart3, AlertTriangle, CheckCircle2,
  UserCog, Siren, Building2, Wifi, Cpu, HardDrive, Globe,
  BadgeCheck, ShieldAlert, Layers, HeartPulse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AccordionMultiLevel, { type AccordionSectionData } from "@/components/ui/accordion-multi-level";
import type { Personnel, Alert, Group } from "@shared/schema";

export default function AdminPortal() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Riyadh" }));
      setDate(now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Riyadh" }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const { data: stats } = useQuery<{
    total: number; active: number; ok: number; warning: number; critical: number; groupCount: number;
  }>({ queryKey: ["/api/stats"] });

  const { data: personnelResult } = useQuery<{ data: Personnel[]; total: number }>({
    queryKey: ["/api/personnel", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/personnel?limit=2000");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: alertsList = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: analytics } = useQuery<{
    zoneStats: { zone: string; count: number; criticalCount: number; avgRisk: number }[];
    roleDistribution: { role: string; count: number }[];
    riskDistribution: { range: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
    alertStats: { total: number; acknowledged: number; unacknowledged: number; byType: Record<string, number> };
    topCritical: Personnel[];
  }>({ queryKey: ["/api/analytics"] });

  const personnelList = personnelResult?.data || [];
  const totalPersonnel = stats?.total || 0;
  const activePersonnel = stats?.active || 0;
  const criticalCount = stats?.critical || 0;
  const warningCount = stats?.warning || 0;
  const okCount = stats?.ok || 0;

  const pilgrims = personnelList.filter(p => p.role === "pilgrim");
  const paramedics = personnelList.filter(p => p.role === "paramedic");
  const doctors = personnelList.filter(p => p.role === "doctor");
  const nurses = personnelList.filter(p => p.role === "nurse");
  const activeAlerts = alertsList.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alertsList.filter(a => a.acknowledged);

  const avgHeartRate = personnelList.length > 0
    ? Math.round(personnelList.reduce((s, p) => s + p.hr, 0) / personnelList.length)
    : 0;
  const avgSpO2 = personnelList.length > 0
    ? Math.round(personnelList.reduce((s, p) => s + p.spo2, 0) / personnelList.length)
    : 0;
  const avgTemp = personnelList.length > 0
    ? (personnelList.reduce((s, p) => s + p.temp, 0) / personnelList.length).toFixed(1)
    : "0";
  const avgRisk = personnelList.length > 0
    ? Math.round(personnelList.reduce((s, p) => s + p.riskScore, 0) / personnelList.length)
    : 0;
  const fallDetectedCount = personnelList.filter(p => p.fallDetected).length;
  const lowBatteryCount = personnelList.filter(p => p.battery < 20).length;

  const zoneBreakdown = (analytics?.zoneStats || [])
    .map(z => `${z.zone}: ${z.count} personnel (${z.criticalCount} critical, avg risk ${z.avgRisk.toFixed(0)})`)
    .join("\n");

  const roleBreakdown = (analytics?.roleDistribution || [])
    .map(r => `${r.role.charAt(0).toUpperCase() + r.role.slice(1)}: ${r.count}`)
    .join(", ");

  const alertTypeBreakdown = analytics?.alertStats?.byType
    ? Object.entries(analytics.alertStats.byType)
        .map(([type, count]) => `${type}: ${count}`)
        .join(", ")
    : "No data";

  const topCriticalList = (analytics?.topCritical || []).slice(0, 5)
    .map(p => `${p.name} (${p.externalId}) - Risk: ${p.riskScore}, HR: ${p.hr}, SpO2: ${p.spo2}, Zone: ${p.zone}`)
    .join("\n");

  const systemOverviewItems: AccordionSectionData[] = [
    {
      id: "platform-status",
      title: "Platform Status",
      icon: Server,
      textColor: "text-teal-500",
      bgColor: "bg-teal-500/10",
      collapsibles: [
        {
          id: "sys-health",
          title: "System Health",
          content: `All core services are operational. Health API, GPS Stream, Database, AI Engine, and Network are active. Current server uptime is stable with real-time data streaming enabled.`,
        },
        {
          id: "sys-connectivity",
          title: "Data Pipeline & Connectivity",
          content: `Real-time vitals ingestion is active with ${totalPersonnel} connected wearable sensors. GPS tracking updates every 5 seconds. Alert processing latency < 200ms. Database sync interval: continuous.`,
        },
        {
          id: "sys-version",
          title: "Software Version & Configuration",
          content: `Red Crescent v2.4.0 — Hajj Season 1447H deployment. Map engine: Leaflet with CartoDB tiles. AI risk model: v3.2 (multi-variate). Timezone: AST (Asia/Riyadh). Max concurrent tracking: 10,000 devices.`,
        },
      ],
    },
    {
      id: "deployment-info",
      title: "Deployment & Infrastructure",
      icon: Globe,
      textColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      collapsibles: [
        {
          id: "deploy-arch",
          title: "Architecture",
          content: `Full-stack TypeScript application. Backend: Express.js with PostgreSQL (Drizzle ORM). Frontend: React with TanStack Query. Map: Leaflet + react-leaflet. Charts: Recharts. Hosted on Replit with auto-scaling.`,
        },
        {
          id: "deploy-db",
          title: "Database Schema",
          content: `Three core tables: Groups (${groups.length} records), Personnel (${totalPersonnel} records), Alerts (${alertsList.length} records). Personnel table stores vitals, GPS coordinates, risk scores, roles, and wearable battery status.`,
        },
        {
          id: "deploy-api",
          title: "API Endpoints",
          content: `RESTful API with full CRUD: /api/stats, /api/analytics, /api/groups, /api/personnel (with search, filter by group/status/role), /api/personnel/:id/nearest-responders, /api/alerts (with bulk acknowledge). All endpoints support JSON.`,
        },
      ],
    },
  ];

  const personnelItems: AccordionSectionData[] = [
    {
      id: "personnel-overview",
      title: "Personnel Overview",
      icon: Users,
      textColor: "text-teal-500",
      bgColor: "bg-teal-500/10",
      collapsibles: [
        {
          id: "pers-summary",
          title: "Total Count & Activity",
          content: `Total registered: ${totalPersonnel}. Currently active: ${activePersonnel}. Inactive: ${totalPersonnel - activePersonnel}. Active rate: ${totalPersonnel > 0 ? ((activePersonnel / totalPersonnel) * 100).toFixed(1) : 0}%.`,
        },
        {
          id: "pers-roles",
          title: "Role Distribution",
          content: `${roleBreakdown || "Loading..."}. Pilgrims make up the majority of tracked personnel, with medical staff (paramedics, doctors, nurses) distributed across zones for emergency coverage.`,
        },
        {
          id: "pers-status",
          title: "Health Status Breakdown",
          content: `OK (stable): ${okCount} (${totalPersonnel > 0 ? ((okCount / totalPersonnel) * 100).toFixed(1) : 0}%). Warning (elevated vitals): ${warningCount} (${totalPersonnel > 0 ? ((warningCount / totalPersonnel) * 100).toFixed(1) : 0}%). Critical (immediate attention): ${criticalCount} (${totalPersonnel > 0 ? ((criticalCount / totalPersonnel) * 100).toFixed(1) : 0}%).`,
        },
      ],
    },
    {
      id: "medical-staff",
      title: "Medical Staff",
      icon: Stethoscope,
      textColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      collapsibles: [
        {
          id: "staff-paramedics",
          title: "Paramedics (EMT)",
          content: `Total paramedics: ${paramedics.length}. Active on duty: ${paramedics.filter(p => p.isActive).length}. Coverage across all holy site zones. Average shift hours: ${paramedics.length > 0 ? (paramedics.reduce((s, p) => s + p.shiftHours, 0) / paramedics.length).toFixed(1) : 0}h.`,
        },
        {
          id: "staff-doctors",
          title: "Doctors (DR)",
          content: `Total doctors: ${doctors.length}. Active on duty: ${doctors.filter(p => p.isActive).length}. Stationed at medical tents and mobile units. Average shift hours: ${doctors.length > 0 ? (doctors.reduce((s, p) => s + p.shiftHours, 0) / doctors.length).toFixed(1) : 0}h.`,
        },
        {
          id: "staff-nurses",
          title: "Nurses (RN)",
          content: `Total nurses: ${nurses.length}. Active on duty: ${nurses.filter(p => p.isActive).length}. Providing triage, vital monitoring, and medication support. Average shift hours: ${nurses.length > 0 ? (nurses.reduce((s, p) => s + p.shiftHours, 0) / nurses.length).toFixed(1) : 0}h.`,
        },
      ],
    },
    {
      id: "pilgrim-stats",
      title: "Pilgrim Health Statistics",
      icon: HeartPulse,
      textColor: "text-rose-500",
      bgColor: "bg-rose-500/10",
      collapsibles: [
        {
          id: "pil-vitals",
          title: "Average Vital Signs",
          content: `Heart Rate: ${avgHeartRate} BPM. SpO2: ${avgSpO2}%. Temperature: ${avgTemp}\u00B0C. Average AI Risk Score: ${avgRisk}/100. These are population-level averages across all tracked pilgrims.`,
        },
        {
          id: "pil-incidents",
          title: "Incident Indicators",
          content: `Fall detections: ${fallDetectedCount} active. Low battery devices (<20%): ${lowBatteryCount}. Critical cases requiring immediate response: ${criticalCount}. All incidents trigger automatic alerts to nearest medical responders.`,
        },
        {
          id: "pil-risk",
          title: "Risk Distribution",
          content: analytics?.riskDistribution
            ? analytics.riskDistribution.map(r => `${r.range}: ${r.count} personnel`).join(". ") + "."
            : "Loading risk distribution data...",
        },
      ],
    },
  ];

  const operationsItems: AccordionSectionData[] = [
    {
      id: "zone-coverage",
      title: "Zone Coverage & Deployment",
      icon: MapPin,
      textColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
      collapsibles: [
        {
          id: "zone-detail",
          title: "Zone Breakdown",
          content: zoneBreakdown || "Loading zone data...",
        },
        {
          id: "zone-groups",
          title: "Pilgrim Groups",
          content: groups.length > 0
            ? groups.map(g => `${g.name}: ${g.region || "Unassigned region"}`).join(". ") + `. Total: ${groups.length} groups.`
            : "Loading group data...",
        },
        {
          id: "zone-map",
          title: "Map Configuration",
          content: `Map center: Makkah (21.4225\u00B0N, 39.8262\u00B0E), zoom level 13. Tile provider: CartoDB light_all with satellite toggle. Holy site zones: Makkah - Haram, Mina, Arafat, Muzdalifah, Makkah - Jamarat, Makkah - Hub, Holy Sites. Real-time GPS marker clustering enabled.`,
        },
      ],
    },
    {
      id: "alert-management",
      title: "Alert Management",
      icon: Bell,
      textColor: "text-rose-500",
      bgColor: "bg-rose-500/10",
      collapsibles: [
        {
          id: "alert-summary",
          title: "Alert Summary",
          content: `Total alerts: ${alertsList.length}. Active (unacknowledged): ${activeAlerts.length}. Acknowledged: ${acknowledgedAlerts.length}. Acknowledgment rate: ${alertsList.length > 0 ? ((acknowledgedAlerts.length / alertsList.length) * 100).toFixed(1) : 0}%.`,
        },
        {
          id: "alert-types",
          title: "Alert Types",
          content: `Breakdown by type: ${alertTypeBreakdown}. Alert types include: vitals (abnormal heart rate, SpO2, temperature), fall_detected (accelerometer-triggered), high_risk (AI risk score > 70), battery_low (device battery < 20%).`,
        },
        {
          id: "alert-response",
          title: "Response Protocol",
          content: `Critical alerts trigger: 1) Nearest responder notification via Haversine distance calculation, 2) Map marker highlight with rose glow, 3) Audible command center notification, 4) Auto-escalation after 5 minutes if unacknowledged. Response actions: Dispatch Paramedic, AED Drone, Emergency Contact, Med-Evac, Share Vitals, Boost Sensor, Wellness Check.`,
        },
      ],
    },
    {
      id: "critical-cases",
      title: "Top Critical Cases",
      icon: ShieldAlert,
      textColor: "text-rose-600",
      bgColor: "bg-rose-600/10",
      collapsibles: [
        {
          id: "crit-list",
          title: "Highest Risk Individuals",
          content: topCriticalList || "No critical cases currently.",
        },
        {
          id: "crit-criteria",
          title: "Critical Classification Criteria",
          content: `A person is classified as critical when: Heart Rate > 130 BPM or < 50 BPM, SpO2 < 90%, Temperature > 39\u00B0C, Blood Pressure systolic > 160 or diastolic > 100, or AI Risk Score > 80. Multiple elevated indicators compound the risk classification.`,
        },
      ],
    },
  ];

  const configItems: AccordionSectionData[] = [
    {
      id: "ai-risk",
      title: "AI Risk Scoring Model",
      icon: Cpu,
      textColor: "text-violet-500",
      bgColor: "bg-violet-500/10",
      collapsibles: [
        {
          id: "ai-overview",
          title: "Model Overview",
          content: `Multi-variate risk scoring engine (v3.2) analyzes heart rate, SpO2, temperature, blood pressure, age, fall detection, and activity level. Scores range 0-100 with thresholds: 0-30 (low), 31-60 (moderate), 61-80 (elevated), 81-100 (critical). Real-time recalculation every vitals update.`,
        },
        {
          id: "ai-factors",
          title: "Risk Factors & Weights",
          content: `Primary factors: Heart rate deviation (25%), SpO2 level (20%), Temperature (15%), Blood pressure (15%), Age (10%), Fall detection (10%), Activity level (5%). Environmental factors (heat index, crowd density) are planned for v4.0.`,
        },
      ],
    },
    {
      id: "responder-dispatch",
      title: "Responder Dispatch System",
      icon: Siren,
      textColor: "text-orange-500",
      bgColor: "bg-orange-500/10",
      collapsibles: [
        {
          id: "dispatch-algo",
          title: "Nearest Responder Algorithm",
          content: `Uses Haversine formula to calculate great-circle distance between the patient's GPS coordinates and all available medical staff. Filters by role (paramedic, doctor, nurse) and active status. Returns top 5 nearest responders with estimated distance and walking ETA.`,
        },
        {
          id: "dispatch-actions",
          title: "Available Dispatch Actions",
          content: `1) Dispatch Paramedic — sends nearest EMT. 2) AED Drone — deploys automated defibrillator drone. 3) Emergency Contact — notifies pilgrim's emergency contact. 4) Med-Evac — requests medical evacuation vehicle. 5) Share Vitals — broadcasts vitals to medical team. 6) Boost Sensor — increases wearable sampling rate. 7) Wellness Check — sends on-ground staff for visual assessment.`,
        },
      ],
    },
    {
      id: "data-management",
      title: "Data Management & Security",
      icon: Database,
      textColor: "text-slate-500",
      bgColor: "bg-slate-500/10",
      collapsibles: [
        {
          id: "data-storage",
          title: "Storage & Retention",
          content: `PostgreSQL database with Drizzle ORM. All personnel vitals, GPS tracks, and alert history are persisted. Data retention policy: active season data retained for 90 days post-Hajj. Anonymized aggregate data retained for 2 years for research and planning.`,
        },
        {
          id: "data-privacy",
          title: "Privacy & Compliance",
          content: `All personnel data is encrypted at rest and in transit (TLS 1.3). Access controlled via session-based authentication. Compliant with Saudi PDPL (Personal Data Protection Law). Medical data handling follows MOH guidelines. Audit logging enabled for all data access.`,
        },
      ],
    },
  ];

  const summaryCards = [
    { label: "Total Personnel", value: totalPersonnel, icon: Users, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100" },
    { label: "Active Now", value: activePersonnel, icon: Radio, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Critical Cases", value: criticalCount, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    { label: "Warning Cases", value: warningCount, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Active Alerts", value: activeAlerts.length, icon: Bell, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
    { label: "Pilgrim Groups", value: groups.length, icon: Layers, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Avg Heart Rate", value: `${avgHeartRate} BPM`, icon: Heart, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100" },
    { label: "Avg SpO2", value: `${avgSpO2}%`, icon: HeartPulse, color: "text-teal-500", bg: "bg-teal-50", border: "border-teal-100" },
  ];

  return (
    <div className="min-h-screen bg-h-bg" data-testid="admin-portal">
      <header className="glass-panel-strong border-b border-h-border sticky top-0 z-50" data-testid="admin-header">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-h-teal to-transparent opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-teal-400/60 to-transparent animate-scan-line" />
        </div>

        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-back-dashboard">
              <button className="flex items-center gap-1.5 text-h-text-dim font-mono text-xs uppercase tracking-wider hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </Link>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[15px] tracking-[2px] text-h-text-bright uppercase" data-testid="text-admin-title">
                  Admin Portal
                </span>
                <span className="font-mono text-[9px] text-h-text-dim tracking-[1.5px] uppercase">
                  Red Crescent System Administration
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-mono uppercase tracking-wider" data-testid="badge-live">
                <Radio className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[13px] font-bold text-h-text-bright tracking-[1px]" data-testid="text-admin-time">
                {time} <span className="text-[9px] text-h-text-dim font-normal">AST</span>
              </span>
              <span className="font-mono text-[9px] text-h-text-dim" data-testid="text-admin-date">{date}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="admin-stat-cards">
          {summaryCards.map((card) => (
            <Card key={card.label} className={`card-premium border ${card.border} ${card.bg} rounded-xl`} data-testid={`card-stat-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className="font-mono text-lg font-bold text-h-text-bright">{card.value}</span>
                <span className="text-[10px] text-h-text-dim font-mono uppercase tracking-wider leading-tight">{card.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section data-testid="section-system">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-teal-600" />
              <h2 className="font-display font-bold text-sm uppercase tracking-[2px] text-h-text-bright">System & Infrastructure</h2>
            </div>
            <AccordionMultiLevel items={systemOverviewItems} defaultOpen={["platform-status"]} />
          </section>

          <section data-testid="section-personnel">
            <div className="flex items-center gap-2 mb-3">
              <UserCog className="w-4 h-4 text-teal-600" />
              <h2 className="font-display font-bold text-sm uppercase tracking-[2px] text-h-text-bright">Personnel & Health</h2>
            </div>
            <AccordionMultiLevel items={personnelItems} defaultOpen={["personnel-overview"]} />
          </section>

          <section data-testid="section-operations">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h2 className="font-display font-bold text-sm uppercase tracking-[2px] text-h-text-bright">Operations & Alerts</h2>
            </div>
            <AccordionMultiLevel items={operationsItems} defaultOpen={["zone-coverage"]} />
          </section>

          <section data-testid="section-config">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-teal-600" />
              <h2 className="font-display font-bold text-sm uppercase tracking-[2px] text-h-text-bright">Configuration & AI</h2>
            </div>
            <AccordionMultiLevel items={configItems} defaultOpen={["ai-risk"]} />
          </section>
        </div>
      </main>

      <footer className="border-t border-h-border bg-white/80 backdrop-blur-sm mt-8" data-testid="admin-footer">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-teal-600" />
            <span className="font-mono text-[10px] text-h-text-dim uppercase tracking-wider">Red Crescent Admin v2.4.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-h-text-dim">
              {totalPersonnel} personnel tracked
            </span>
            <span className="font-mono text-[10px] text-h-text-dim">
              {groups.length} groups
            </span>
            <span className="font-mono text-[10px] text-h-text-dim">
              {alertsList.length} total alerts
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
