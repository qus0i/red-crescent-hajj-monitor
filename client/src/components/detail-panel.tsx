import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import {
  Heart, Wind, Thermometer, Droplets, Footprints, BatteryMedium,
  AlertTriangle, Hexagon, User, Radio, Pill, FileText, MapPin,
  Phone, Globe, Brain, Flame, Droplet, ShieldAlert, Sparkles,
  Languages, Activity, Wifi, Database, Clock,
} from "lucide-react";
import type { Personnel } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import {
  getVitalClass,
  getSpO2Class,
  getTempClass,
  getBatteryClass,
  getRiskColor,
  getAiInsight,
  generateHrData,
} from "@/lib/dashboard-data";
import { NearestResponders } from "@/components/nearest-responders";

interface HealthAnalysis {
  overallAssessment: string;
  riskFactors: string[];
  recommendations: string[];
  medicationInteractions: string[];
  heatRiskLevel: "low" | "moderate" | "high" | "critical";
  dehydrationRisk: string;
  priorityLevel: number;
  hajjSpecificWarnings: string[];
  glucoseMonitoring?: {
    recommended: boolean;
    frequency: string;
    reason: string;
  };
  medicalHistoryInsights?: {
    recentHospitalizations: string[];
    surgicalHistory: string[];
    allergyAlerts: string[];
    recencyScore: "recent" | "moderate" | "historical";
  };
  healthRecordStatus?: {
    nationalRecords: "linked" | "pending" | "unavailable";
    partnerCountryData: "available" | "partial" | "unavailable";
    wifiCallingCapable: boolean;
  };
  language: string;
  humanAgentRequired: boolean;
}

const AI_LANGS = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ur", label: "اردو" },
  { code: "id", label: "Bahasa ID" },
  { code: "ms", label: "Bahasa MY" },
];

interface DetailPanelProps {
  person: Personnel | null;
  isLoading: boolean;
}

export function DetailPanel({ person, isLoading }: DetailPanelProps) {
  const { t } = useI18n();
  if (isLoading) {
    return (
      <div className="flex-1 p-3 animate-pulse space-y-3">
        <div className="h-16 bg-h-surface2 rounded-lg" />
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-h-surface2 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
          <User className="w-6 h-6 text-slate-300" />
        </div>
        <p className="font-mono text-xs text-h-text-dim tracking-[1px] text-center">
          {t("Select a person to view details").toUpperCase()}
        </p>
        <p className="font-mono text-[9px] text-h-text-dim/60 text-center">
          {t("Click on a row in the table or a marker on the map")}
        </p>
      </div>
    );
  }

  const p = person;
  const riskColor = getRiskColor(p.riskScore);
  const chartColor = p.status === "critical" ? "#f43f5e" : p.status === "warning" ? "#f59e0b" : "#10b981";

  const hrData = useMemo(() => {
    return generateHrData(p.hr, p.status).map((val, i) => ({ time: i, hr: val }));
  }, [p.hr, p.status]);

  const getVitalGlow = (isWarn: boolean, isCrit: boolean) => {
    if (isCrit) return "vital-glow-critical";
    if (isWarn) return "vital-glow-warning";
    return "vital-glow-ok";
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin animate-fade-in-up" data-testid="detail-panel">
      <div className="px-4 py-3 border-b border-h-border bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${p.status === "critical" ? "bg-rose-500 animate-live-pulse" : p.status === "warning" ? "bg-amber-500" : "bg-emerald-500"}`} />
          <div className="font-display font-black text-lg text-h-text-bright tracking-[1px] uppercase" data-testid="text-detail-name">
            {p.name}
          </div>
        </div>
        <div className="flex gap-3 mt-1.5 flex-wrap">
          <MetaItem label="ID" value={p.externalId} />
          <MetaItem label={t("Age")} value={`${p.age}`} />
          <MetaItem label={t("Gender")} value={p.gender === "M" ? t("Male") : t("Female")} />
          {p.bloodType && <MetaItem label={t("Blood Type")} value={p.bloodType} highlight />}
        </div>
        <div className="flex gap-3 mt-1 flex-wrap">
          {p.zone && <MetaItem label={t("Zone")} value={p.zone} />}
          <MetaItem label={t("Role")} value={t(p.role.charAt(0).toUpperCase() + p.role.slice(1))} />
          <MetaItem label={t("Duration")} value={`${p.shiftHours}h ${t("active")}`} />
        </div>
      </div>

      {p.fallDetected && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg m-2 p-2.5 px-3 flex items-center gap-2 vital-glow-critical animate-fade-in-up" data-testid="fall-alert">
          <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="font-display font-bold text-xs text-rose-700 tracking-[1px]">{t("FALL DETECTED")}</div>
            <div className="text-[10px] text-rose-500 font-mono">{t("Immediate medical review required")}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-3" data-testid="vitals-grid">
        <VitalCard
          icon={<Heart className="w-4 h-4" />}
          label={t("Heart Rate")}
          value={`${p.hr}`}
          unit={t("BPM")}
          trend={p.hr > 130 ? "CRITICAL" : p.hr > 100 ? "HIGH" : "NORMAL"}
          trendDir={p.hr > 100 ? "up" : "stable"}
          statusClass={getVitalClass(p.hr, 100, 130)}
          barColor={p.hr > 130 ? "#f43f5e" : p.hr > 100 ? "#f59e0b" : "#10b981"}
          glowClass={getVitalGlow(p.hr > 100, p.hr > 130)}
        />
        <VitalCard
          icon={<Wind className="w-4 h-4" />}
          label={t("SpO2 Oxygen")}
          value={`${p.spo2}`}
          unit="% Saturation"
          trend={p.spo2 < 92 ? "CRITICAL" : p.spo2 < 95 ? "LOW" : "NORMAL"}
          trendDir={p.spo2 < 95 ? "down" : "stable"}
          statusClass={getSpO2Class(p.spo2)}
          barColor={p.spo2 < 92 ? "#f43f5e" : p.spo2 < 95 ? "#f59e0b" : "#10b981"}
          glowClass={getVitalGlow(p.spo2 < 95, p.spo2 < 92)}
        />
        <VitalCard
          icon={<Thermometer className="w-4 h-4" />}
          label={t("Temperature")}
          value={`${p.temp}`}
          unit={"\u00B0C Body Temp"}
          trend={p.temp > 38.0 ? "FEVER" : p.temp > 37.5 ? "ELEVATED" : "NORMAL"}
          trendDir={p.temp > 37.5 ? "up" : "stable"}
          statusClass={getTempClass(p.temp)}
          barColor={p.temp > 38.0 ? "#f43f5e" : p.temp > 37.5 ? "#f59e0b" : "#10b981"}
          glowClass={getVitalGlow(p.temp > 37.5, p.temp > 38.0)}
        />
        <VitalCard
          icon={<Droplets className="w-4 h-4" />}
          label={t("Blood Pressure")}
          value={p.bp}
          unit="mmHg sys/dia"
          trend="Monitoring"
          trendDir="stable"
          statusClass=""
          barColor="#10b981"
          smallValue
          glowClass="vital-glow-ok"
        />
        <VitalCard
          icon={<Footprints className="w-4 h-4" />}
          label={t("Steps Today")}
          value={p.steps.toLocaleString()}
          unit="Steps counted"
          trend="Activity level"
          trendDir="stable"
          statusClass=""
          barColor="#10b981"
          smallValue
          glowClass="vital-glow-ok"
        />
        <VitalCard
          icon={<BatteryMedium className="w-4 h-4" />}
          label={t("Device Battery")}
          value={`${p.battery}`}
          unit="% Remaining"
          trend={p.battery < 25 ? "LOW" : p.battery < 50 ? "MODERATE" : "OK"}
          trendDir={p.battery < 25 ? "down" : "stable"}
          statusClass={getBatteryClass(p.battery)}
          barColor={p.battery < 25 ? "#f43f5e" : p.battery < 50 ? "#f59e0b" : "#10b981"}
          glowClass={getVitalGlow(p.battery < 50, p.battery < 25)}
        />
      </div>

      <div className="p-3 border-t border-h-border" data-testid="risk-section">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[2px] text-h-teal uppercase flex items-center gap-1.5">
            <Hexagon className="w-3 h-3" />
            AI Risk Assessment
            <Radio className="w-2.5 h-2.5 text-emerald-500 animate-subtle-breathe" />
          </span>
          <span className="font-mono text-[28px] font-bold leading-none" style={{ color: riskColor }} data-testid="text-risk-score">
            {p.riskScore}
            <span className="text-sm text-h-text-dim">/100</span>
          </span>
        </div>
        <div className="h-2 bg-[#aaaaaa] rounded-full overflow-hidden mb-2 border border-slate-200">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${p.riskScore}%`,
              background: `linear-gradient(90deg, #10b981, #fbbf24 50%, #f43f5e)`,
            }}
          />
        </div>
        <div className="text-[11px] text-h-text leading-relaxed p-3 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 border-l-2 border-l-h-teal">
          {getAiInsight(p)}
        </div>
      </div>

      <div className="p-3 border-t border-h-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-h-text-dim tracking-[1.5px] uppercase">
            {t("Heart Rate Trend")}
          </span>
          <span className="font-mono text-[9px] text-emerald-500 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-live-pulse" />
            STREAMING
          </span>
        </div>
        <div className="h-16 bg-slate-50 rounded-lg border border-slate-200 p-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrData}>
              <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
              <Line type="monotone" dataKey="hr" stroke={chartColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(p.illnesses || p.medications || p.medicalHistory) && (
        <MedicalProfileSection person={p} />
      )}

      <AiHealthAnalysisSection personId={p.id} />

      {p.role === "pilgrim" && (
        <NearestResponders personnelId={p.id} personnelName={p.name} />
      )}
    </div>
  );
}

function MedicalProfileSection({ person: p }: { person: Personnel }) {
  const { t } = useI18n();
  return (
    <div className="p-3 border-t border-h-border" data-testid="medical-profile">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="w-3 h-3 text-h-teal" />
        <span className="font-mono text-[10px] tracking-[2px] text-h-teal uppercase">{t("Medical Profile")}</span>
      </div>
      <div className="space-y-2">
        {p.illnesses && (
          <MedicalRow icon={<ShieldAlert className="w-3 h-3 text-rose-500" />} label={t("Conditions")} value={p.illnesses} />
        )}
        {p.medications && (
          <MedicalRow icon={<Pill className="w-3 h-3 text-violet-500" />} label={t("Medications")} value={p.medications} />
        )}
        {p.medicalHistory && (
          <MedicalRow icon={<FileText className="w-3 h-3 text-slate-500" />} label={t("History")} value={p.medicalHistory} />
        )}
        {p.nationality && (
          <MedicalRow icon={<Globe className="w-3 h-3 text-blue-500" />} label={t("Nationality")} value={p.nationality} />
        )}
        {p.address && (
          <MedicalRow icon={<MapPin className="w-3 h-3 text-amber-500" />} label={t("Address")} value={p.address} />
        )}
        {p.emergencyContact && (
          <MedicalRow icon={<Phone className="w-3 h-3 text-emerald-500" />} label={t("Emergency Contact")} value={p.emergencyContact} />
        )}
      </div>
    </div>
  );
}

function MedicalRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2 items-start bg-slate-50 rounded-lg p-2 border border-slate-200">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="font-mono text-[9px] text-h-text-dim uppercase tracking-wider">{label}</div>
        <div className="text-[11px] text-h-text-bright leading-snug" data-testid={`text-medical-${label.toLowerCase()}`}>{value}</div>
      </div>
    </div>
  );
}

function AiHealthAnalysisSection({ personId }: { personId: number }) {
  const { t } = useI18n();
  const [aiLang, setAiLang] = useState("en");
  const { data: analysis, isLoading } = useQuery<HealthAnalysis>({
    queryKey: ["/api/personnel", personId, "health-analysis", aiLang],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${personId}/health-analysis?lang=${aiLang}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-3 border-t border-h-border animate-pulse">
        <div className="h-4 bg-[#aaaaaa] rounded w-40 mb-3" />
        <div className="h-20 bg-slate-50 rounded-lg" />
      </div>
    );
  }

  if (!analysis) return null;

  const heatColors: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const priorityColors: Record<number, string> = {
    1: "text-rose-600 bg-rose-50 border-rose-200",
    2: "text-orange-600 bg-orange-50 border-orange-200",
    3: "text-amber-600 bg-amber-50 border-amber-200",
    4: "text-teal-600 bg-teal-50 border-teal-200",
    5: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  const recencyColors: Record<string, string> = {
    recent: "bg-rose-50 text-rose-700 border-rose-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    historical: "bg-slate-50 text-slate-600 border-slate-200",
  };

  const statusColors: Record<string, string> = {
    linked: "bg-emerald-50 text-emerald-700 border-emerald-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    unavailable: "bg-slate-50 text-slate-500 border-slate-200",
  };

  const hc = heatColors[analysis.heatRiskLevel] || heatColors.low;

  return (
    <div className="p-3 border-t border-h-border" data-testid="ai-health-analysis">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] tracking-[2px] text-h-teal uppercase flex items-center gap-1.5">
          <Brain className="w-3 h-3" />
          {t("AI Health Analysis")}
          <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-subtle-breathe" />
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5" data-testid="ai-lang-selector">
            <Languages className="w-3 h-3 text-h-text-dim" />
            {AI_LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setAiLang(l.code)}
                data-testid={`button-ai-lang-${l.code}`}
                className={`font-mono text-[8px] px-1.5 py-0.5 rounded cursor-pointer border transition-all ${
                  aiLang === l.code
                    ? "bg-h-teal/10 text-h-teal-bright border-h-teal-dim font-bold"
                    : "bg-h-surface2 text-h-text-dim border-h-border"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-bold ${priorityColors[analysis.priorityLevel] || ""}`}>
            P{analysis.priorityLevel}
          </span>
        </div>
      </div>

      {analysis.humanAgentRequired && (
        <div className="mb-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
          <span className="font-mono text-[10px] text-amber-700">{t("Language not fully supported. Human agent routing recommended.")}</span>
        </div>
      )}

      <div className="text-[11px] text-h-text leading-relaxed p-2.5 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 border-l-2 border-l-h-teal mb-2" data-testid="text-ai-assessment">
        {analysis.overallAssessment}
      </div>

      <div className="flex gap-2 mb-2">
        <div className={`flex-1 rounded-lg p-2 border ${hc.bg} ${hc.border}`}>
          <div className="flex items-center gap-1 mb-0.5">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-h-text-dim">{t("Heat Risk")}</span>
          </div>
          <span className={`font-mono text-xs font-bold uppercase ${hc.text}`}>{analysis.heatRiskLevel}</span>
        </div>
        <div className="flex-1 rounded-lg p-2 border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Droplet className="w-3 h-3 text-blue-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-h-text-dim">{t("Dehydration")}</span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-blue-700 leading-tight">{analysis.dehydrationRisk.split(" — ")[0]}</span>
        </div>
      </div>

      {analysis.glucoseMonitoring?.recommended && (
        <div className="mb-2 rounded-lg p-2 border bg-violet-50 border-violet-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Activity className="w-3 h-3 text-violet-500" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-violet-600 font-semibold">{t("Glucose Monitoring")}</span>
          </div>
          <div className="font-mono text-[10px] text-violet-700 font-bold">{analysis.glucoseMonitoring.frequency}</div>
          <div className="font-mono text-[9px] text-violet-600 mt-0.5">{analysis.glucoseMonitoring.reason}</div>
        </div>
      )}

      {analysis.riskFactors.length > 0 && analysis.riskFactors[0] !== "No significant risk factors identified at this time" && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-rose-600 uppercase tracking-wider mb-1 font-semibold">{t("Risk Factors")}</div>
          <div className="space-y-1">
            {analysis.riskFactors.slice(0, 3).map((rf, i) => (
              <div key={i} className="text-[10px] text-h-text leading-snug pl-3 border-l-2 border-rose-200 bg-rose-50/50 rounded-r-md py-1 pr-2">
                {rf}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.medicationInteractions.length > 0 && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-violet-600 uppercase tracking-wider mb-1 font-semibold">{t("Medication Alerts")}</div>
          <div className="space-y-1">
            {analysis.medicationInteractions.map((mi, i) => (
              <div key={i} className="text-[10px] text-h-text leading-snug pl-3 border-l-2 border-violet-200 bg-violet-50/50 rounded-r-md py-1 pr-2">
                {mi}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-teal-600 uppercase tracking-wider mb-1 font-semibold">{t("Recommendations")}</div>
          <div className="space-y-1">
            {analysis.recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className="text-[10px] text-h-text leading-snug pl-3 border-l-2 border-teal-200 bg-teal-50/50 rounded-r-md py-1 pr-2">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.medicalHistoryInsights && (analysis.medicalHistoryInsights.recentHospitalizations.length > 0 || analysis.medicalHistoryInsights.surgicalHistory.length > 0 || analysis.medicalHistoryInsights.allergyAlerts.length > 0) && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider font-semibold">{t("Medical History Insights")}</span>
            <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded-full border font-bold ${recencyColors[analysis.medicalHistoryInsights.recencyScore]}`}>
              {analysis.medicalHistoryInsights.recencyScore.toUpperCase()}
            </span>
          </div>
          {analysis.medicalHistoryInsights.allergyAlerts.map((a, i) => (
            <div key={`a-${i}`} className="text-[10px] text-rose-700 leading-snug pl-3 border-l-2 border-rose-300 bg-rose-50 rounded-r-md py-1 pr-2 mb-1 font-semibold">
              {a}
            </div>
          ))}
          {analysis.medicalHistoryInsights.surgicalHistory.map((s, i) => (
            <div key={`s-${i}`} className="text-[10px] text-h-text leading-snug pl-3 border-l-2 border-slate-200 bg-slate-50 rounded-r-md py-1 pr-2 mb-1">
              {s}
            </div>
          ))}
          {analysis.medicalHistoryInsights.recentHospitalizations.map((h, i) => (
            <div key={`h-${i}`} className="text-[10px] text-h-text leading-snug pl-3 border-l-2 border-amber-200 bg-amber-50/50 rounded-r-md py-1 pr-2 mb-1">
              {h}
            </div>
          ))}
        </div>
      )}

      {analysis.healthRecordStatus && (
        <div className="mt-2 pt-2 border-t border-h-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Database className="w-3 h-3 text-h-teal" />
            <span className="font-mono text-[9px] text-h-teal uppercase tracking-wider font-semibold">{t("Health Records")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`font-mono text-[8px] px-2 py-0.5 rounded-full border font-bold ${statusColors[analysis.healthRecordStatus.nationalRecords]}`} data-testid="badge-national-records">
              {t("National Records")}: {analysis.healthRecordStatus.nationalRecords.toUpperCase()}
            </span>
            <span className={`font-mono text-[8px] px-2 py-0.5 rounded-full border font-bold ${statusColors[analysis.healthRecordStatus.partnerCountryData]}`} data-testid="badge-partner-data">
              {t("Partner Data")}: {analysis.healthRecordStatus.partnerCountryData.toUpperCase()}
            </span>
            {analysis.healthRecordStatus.wifiCallingCapable && (
              <span className="font-mono text-[8px] px-2 py-0.5 rounded-full border font-bold bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1" data-testid="badge-wifi-calling">
                <Wifi className="w-2.5 h-2.5" />
                {t("WiFi Calling")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className="font-mono text-[10px] text-h-text-dim flex gap-1">
      {label}: <span className={highlight ? "text-rose-600 font-semibold" : "text-h-text-bright font-medium"}>{value}</span>
    </span>
  );
}

interface VitalCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendDir: "up" | "down" | "stable";
  statusClass: string;
  barColor: string;
  smallValue?: boolean;
  glowClass?: string;
}

function VitalCard({ icon, label, value, unit, trend, trendDir, statusClass, barColor, smallValue, glowClass }: VitalCardProps) {
  const trendSymbol = trendDir === "up" ? "\u25B2" : trendDir === "down" ? "\u25BC" : "\u2192";
  const trendColor = trendDir === "up" ? "text-rose-600" : trendDir === "down" ? "text-emerald-600" : "text-h-text-dim";

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-2.5 px-3 relative overflow-hidden ${glowClass || ""}`}>
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
        style={{ backgroundColor: barColor, opacity: barColor === "#f43f5e" ? 0.7 : barColor === "#f59e0b" ? 0.5 : 0.2 }}
      />
      <div className="text-h-text-dim mb-1">{icon}</div>
      <div className="font-mono text-[9px] text-h-text-dim uppercase tracking-[1px]">{label}</div>
      <div className={`font-mono font-bold leading-tight mt-0.5 ${statusClass || "text-h-text-bright"} ${smallValue ? "text-base mt-1" : "text-xl"}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] text-h-text-dim">{unit}</div>
      <div className={`font-mono text-[10px] mt-0.5 ${trendColor} font-semibold`}>
        {trendSymbol} {trend}
      </div>
    </div>
  );
}
