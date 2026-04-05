import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import {
  Activity, Users, AlertTriangle, Thermometer, Heart,
  Shield, MapPin, TrendingUp, Stethoscope, Pill, Clock,
  GraduationCap, UserCheck, FileBarChart
} from "lucide-react";
import type { Personnel } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

interface AnalyticsData {
  zoneStats: { zone: string; total: number; ok: number; warning: number; critical: number; avgRisk: number; avgHr: number; avgTemp: number }[];
  roleDistribution: { role: string; count: number }[];
  riskDistribution: { range: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  alertStats: { total: number; critical: number; warning: number; acknowledged: number; unacknowledged: number };
  topCritical: Personnel[];
}

interface BIData {
  conditionBreakdown: { condition: string; count: number; criticalCount: number }[];
  ageDistribution: { range: string; count: number; criticalCount: number }[];
  medicationUsage: { medication: string; count: number }[];
  staffCoverage: { zone: string; pilgrims: number; staff: number; ratio: string; gap: string }[];
  responseMetrics: { zone: string; avgAckTimeMin: number; pendingAlerts: number }[];
  conditionsByZone: { zone: string; conditions: Record<string, number> }[];
}

const STATUS_COLORS: Record<string, string> = {
  ok: "#10b981",
  warning: "#f59e0b",
  critical: "#f43f5e",
};

const RISK_COLORS = ["#10b981", "#34d399", "#fbbf24", "#f97316", "#ef4444"];

const ROLE_COLORS: Record<string, string> = {
  pilgrim: "#64748b",
  paramedic: "#ef4444",
  doctor: "#3b82f6",
  nurse: "#8b5cf6",
};

const CONDITION_COLORS = ["#0d9488", "#059669", "#d97706", "#e11d48", "#7c3aed", "#2563eb", "#ea580c", "#64748b", "#dc2626", "#0891b2", "#4f46e5", "#be185d", "#15803d", "#9333ea", "#0369a1"];

const GAP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  HIGH: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  MODERATE: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ADEQUATE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

export function AnalyticsView() {
  const { t } = useI18n();
  const [biTab, setBiTab] = useState<"operations" | "health" | "staff">("operations");
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });
  const { data: bi } = useQuery<BIData>({
    queryKey: ["/api/analytics/bi"],
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-h-surface2 border border-h-border rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 bg-h-surface2 border border-h-border rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPersonnel = analytics.statusBreakdown.reduce((s, d) => s + d.count, 0);
  const criticalCount = analytics.statusBreakdown.find(s => s.status === "critical")?.count || 0;
  const warningCount = analytics.statusBreakdown.find(s => s.status === "warning")?.count || 0;
  const responderCount = analytics.roleDistribution.filter(r => r.role !== "pilgrim").reduce((s, r) => s + r.count, 0);

  return (
    <div className="flex-1 p-6 overflow-y-auto" data-testid="analytics-view">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-xl text-h-text-bright tracking-[1px] uppercase flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-h-teal" />
            Operations Analytics
          </h2>
          <span className="font-mono text-[11px] text-h-text-dim">
            Real-time data across all holy sites
          </span>
        </div>

        <div className="grid grid-cols-5 gap-4" data-testid="analytics-summary">
          <SummaryCard
            icon={<Users className="w-5 h-5" />}
            label="Total Tracked"
            value={totalPersonnel}
            accent="text-h-teal"
            bg="bg-h-teal/10"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Critical Cases"
            value={criticalCount}
            accent="text-h-rose"
            bg="bg-h-rose/10"
          />
          <SummaryCard
            icon={<Activity className="w-5 h-5" />}
            label="Warnings"
            value={warningCount}
            accent="text-h-amber"
            bg="bg-h-amber/10"
          />
          <SummaryCard
            icon={<Stethoscope className="w-5 h-5" />}
            label="Medical Staff"
            value={responderCount}
            accent="text-blue-500"
            bg="bg-blue-500/10"
          />
          <SummaryCard
            icon={<Shield className="w-5 h-5" />}
            label="Active Alerts"
            value={analytics.alertStats.unacknowledged}
            accent={analytics.alertStats.unacknowledged > 10 ? "text-h-rose" : "text-h-emerald"}
            bg={analytics.alertStats.unacknowledged > 10 ? "bg-h-rose/10" : "bg-h-emerald/10"}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Zone Health Overview" icon={<MapPin className="w-4 h-4 text-h-teal" />}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.zoneStats} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                <XAxis dataKey="zone" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
                <Bar dataKey="ok" stackId="a" fill="#10b981" name="Normal" radius={[0, 0, 0, 0]} />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                <Bar dataKey="critical" stackId="a" fill="#f43f5e" name="Critical" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Status Distribution" icon={<Activity className="w-4 h-4 text-h-teal" />}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={true}
                  style={{ fontSize: 11, fontFamily: "monospace" }}
                >
                  {analytics.statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Risk Score Distribution" icon={<Shield className="w-4 h-4 text-h-teal" />}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.riskDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Personnel">
                  {analytics.riskDistribution.map((_, i) => (
                    <Cell key={i} fill={RISK_COLORS[i] || "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Role Distribution" icon={<Stethoscope className="w-4 h-4 text-h-teal" />}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.roleDistribution}
                  dataKey="count"
                  nameKey="role"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                  style={{ fontSize: 11, fontFamily: "monospace" }}
                >
                  {analytics.roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={ROLE_COLORS[entry.role] || "#64748b"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <ChartCard title="Zone Vital Averages" icon={<Heart className="w-4 h-4 text-h-rose" />}>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-h-text-dim uppercase tracking-wider px-1 pb-1 border-b border-h-border">
                <span>Zone</span>
                <span className="text-center">Avg HR</span>
                <span className="text-center">Avg Temp</span>
                <span className="text-center">Avg Risk</span>
              </div>
              {analytics.zoneStats.map((z) => (
                <div key={z.zone} className="grid grid-cols-4 gap-2 items-center px-1 py-1.5 text-xs font-mono rounded hover:bg-h-surface2 transition-colors">
                  <span className="text-h-text-bright truncate text-[11px]">{z.zone}</span>
                  <span className={`text-center font-bold ${z.avgHr > 100 ? "text-h-rose" : z.avgHr > 85 ? "text-h-amber" : "text-h-text"}`}>
                    {z.avgHr} <span className="text-[9px] font-normal text-h-text-dim">BPM</span>
                  </span>
                  <span className={`text-center font-bold ${z.avgTemp > 37.5 ? "text-h-rose" : z.avgTemp > 37.0 ? "text-h-amber" : "text-h-text"}`}>
                    {z.avgTemp}&deg;C
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-12 h-1.5 bg-h-surface3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${z.avgRisk}%`,
                          background: z.avgRisk > 50 ? "#f43f5e" : z.avgRisk > 30 ? "#f59e0b" : "#10b981",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-h-text-dim w-6 text-right">{z.avgRisk}</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Top Critical Cases" icon={<AlertTriangle className="w-4 h-4 text-h-rose" />}>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
              {analytics.topCritical.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="font-mono text-xs text-h-emerald">No critical cases - all clear</span>
                </div>
              ) : (
                analytics.topCritical.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-md bg-h-rose/5 border border-h-rose/10" data-testid={`critical-case-${p.id}`}>
                    <div className="w-8 h-8 rounded-full bg-h-rose/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-xs font-bold text-h-rose">{p.riskScore}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-xs text-h-text-bright truncate">{p.name}</div>
                      <div className="font-mono text-[10px] text-h-text-dim">
                        {p.externalId} - {p.zone} - HR: {p.hr} - SpO2: {p.spo2}%
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-[10px] text-h-rose font-bold">{p.temp}&deg;C</div>
                      <div className="font-mono text-[9px] text-h-text-dim">{p.bp}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>

        <ChartCard title={t("Alert Statistics")} icon={<Shield className="w-4 h-4 text-h-teal" />}>
          <div className="grid grid-cols-5 gap-4 py-2">
            <AlertStatBox label={t("Total Alerts")} value={analytics.alertStats.total} color="text-h-text-bright" />
            <AlertStatBox label={t("Critical")} value={analytics.alertStats.critical} color="text-h-rose" />
            <AlertStatBox label={t("Warning")} value={analytics.alertStats.warning} color="text-h-amber" />
            <AlertStatBox label={t("Acknowledged")} value={analytics.alertStats.acknowledged} color="text-h-emerald" />
            <AlertStatBox label={t("Pending Only")} value={analytics.alertStats.unacknowledged} color={analytics.alertStats.unacknowledged > 0 ? "text-h-rose" : "text-h-emerald"} />
          </div>
        </ChartCard>

        {bi && (
          <>
            <div className="border-t-2 border-slate-200 pt-6 mt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-h-text-bright tracking-[1px] uppercase flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-h-teal" />
                  {t("Business Intelligence")}
                </h3>
                <div className="flex gap-1.5">
                  {(["operations", "health", "staff"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setBiTab(tab)}
                      data-testid={`button-bi-${tab}`}
                      className={`font-mono text-[10px] tracking-[1px] px-3 py-1.5 rounded-md cursor-pointer uppercase transition-all border ${
                        biTab === tab
                          ? "bg-h-teal/10 text-h-teal-bright border-h-teal-dim font-bold"
                          : "bg-h-surface2 text-h-text-dim border-h-border hover-elevate"
                      }`}
                    >
                      {tab === "operations" ? t("Operations") : tab === "health" ? t("Health Issues") : t("Staff Coverage")}
                    </button>
                  ))}
                </div>
              </div>

              {biTab === "operations" && (
                <div className="grid grid-cols-2 gap-6">
                  <ChartCard title={t("Alert Age by Zone")} icon={<Clock className="w-4 h-4 text-h-teal" />}>
                    {bi.responseMetrics.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={bi.responseMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                          <XAxis dataKey="zone" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-20} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "min", position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
                          <Bar dataKey="avgAckTimeMin" fill="#0d9488" name="Avg Alert Age (min)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pendingAlerts" fill="#f43f5e" name="Pending Alerts" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center py-12 font-mono text-xs text-h-text-dim">{t("No active alerts")}</div>
                    )}
                  </ChartCard>

                  <ChartCard title={t("Case Categorization")} icon={<Activity className="w-4 h-4 text-h-teal" />}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={bi.conditionBreakdown.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis dataKey="condition" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
                        <Bar dataKey="count" fill="#0d9488" name="Total" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="criticalCount" fill="#e11d48" name="Critical" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

              {biTab === "health" && (
                <div className="grid grid-cols-2 gap-6">
                  <ChartCard title={t("Age Distribution & Risk")} icon={<Users className="w-4 h-4 text-h-teal" />}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={bi.ageDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                        <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
                        <Bar dataKey="count" fill="#64748b" name="Total" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="criticalCount" fill="#e11d48" name="Critical" radius={[4, 4, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title={t("Top Medications")} icon={<Pill className="w-4 h-4 text-violet-500" />}>
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                      {bi.medicationUsage.map((m, i) => (
                        <div key={m.medication} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
                          <span className="font-mono text-[10px] text-h-text-dim w-5 text-right">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[11px] text-h-text-bright truncate">{m.medication}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#aaaaaa] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-violet-400"
                                style={{ width: `${Math.min(100, (m.count / (bi.medicationUsage[0]?.count || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-h-text w-8 text-right">{m.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  <ChartCard title={t("Conditions by Zone")} icon={<MapPin className="w-4 h-4 text-h-teal" />}>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
                      {bi.conditionsByZone.map(({ zone, conditions }) => {
                        const top3 = Object.entries(conditions).sort((a, b) => b[1] - a[1]).slice(0, 3);
                        return (
                          <div key={zone} className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="font-mono text-[11px] font-bold text-h-text-bright mb-1">{zone}</div>
                            <div className="flex flex-wrap gap-1">
                              {top3.map(([cond, cnt]) => (
                                <span key={cond} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-h-text">
                                  {cond} <span className="font-bold text-h-teal">{cnt}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>

                  <ChartCard title={t("Health Issue Breakdown")} icon={<Heart className="w-4 h-4 text-h-rose" />}>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={bi.conditionBreakdown.slice(0, 8)}
                          dataKey="count"
                          nameKey="condition"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={55}
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={true}
                          style={{ fontSize: 10, fontFamily: "monospace" }}
                        >
                          {bi.conditionBreakdown.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={CONDITION_COLORS[i % CONDITION_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

              {biTab === "staff" && (
                <div className="grid grid-cols-2 gap-6">
                  <ChartCard title={t("Staff-to-Patient Ratio by Zone")} icon={<UserCheck className="w-4 h-4 text-h-teal" />}>
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 text-[10px] font-mono text-h-text-dim uppercase tracking-wider px-1 pb-1 border-b border-h-border">
                        <span>{t("Zone")}</span>
                        <span className="text-center">{t("Pilgrims")}</span>
                        <span className="text-center">{t("Staff")}</span>
                        <span className="text-center">{t("Ratio")}</span>
                        <span className="text-center">{t("Coverage")}</span>
                      </div>
                      {bi.staffCoverage.map((z) => {
                        const gc = GAP_COLORS[z.gap] || GAP_COLORS.ADEQUATE;
                        return (
                          <div key={z.zone} className="grid grid-cols-5 gap-2 items-center px-1 py-1.5 text-xs font-mono rounded hover:bg-h-surface2 transition-colors" data-testid={`staff-coverage-${z.zone.replace(/\s/g, "-").toLowerCase()}`}>
                            <span className="text-h-text-bright truncate text-[11px]">{z.zone}</span>
                            <span className="text-center font-bold text-h-text">{z.pilgrims}</span>
                            <span className="text-center font-bold text-blue-600">{z.staff}</span>
                            <span className="text-center font-bold text-h-text">{z.ratio}</span>
                            <span className={`text-center text-[9px] font-bold px-1.5 py-0.5 rounded border ${gc.bg} ${gc.text} ${gc.border}`}>{z.gap}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ChartCard>

                  <ChartCard title={t("Staff Distribution")} icon={<GraduationCap className="w-4 h-4 text-h-teal" />}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={bi.staffCoverage} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--h-border)" />
                        <XAxis dataKey="zone" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-20} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
                        <Bar dataKey="pilgrims" fill="#64748b" name="Pilgrims" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="staff" fill="#3b82f6" name="Staff" radius={[4, 4, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, bg }: { icon: React.ReactNode; label: string; value: number; accent: string; bg: string }) {
  return (
    <div className={`${bg} border border-slate-200 rounded-xl p-4 flex flex-col gap-2 card-premium`} data-testid={`summary-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className={`${accent} flex items-center gap-2`}>
        {icon}
        <span className="font-display text-[11px] tracking-[1px] uppercase text-h-text-dim font-semibold">{label}</span>
      </div>
      <div className={`font-mono text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden card-premium">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-gradient-to-r from-slate-50 to-white">
        {icon}
        <span className="font-display font-bold text-sm tracking-[1px] uppercase text-h-text-bright">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AlertStatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className={`font-mono text-3xl font-bold ${color}`}>{value}</div>
      <div className="font-mono text-[10px] text-h-text-dim uppercase tracking-wider mt-1 font-semibold">{label}</div>
    </div>
  );
}
