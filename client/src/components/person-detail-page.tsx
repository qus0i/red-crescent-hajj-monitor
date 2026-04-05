import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import {
  Heart, Wind, Thermometer, Droplets, Footprints, BatteryMedium,
  AlertTriangle, Hexagon, X, MapPin, Clock, User, Shield,
  Stethoscope, Navigation, Phone, Activity, Pill, FileText,
  Globe, Brain, Flame, Droplet, ShieldAlert, Sparkles
} from "lucide-react";
import type { Personnel } from "@shared/schema";
import {
  getVitalClass, getSpO2Class, getTempClass, getBatteryClass,
  getRiskColor, getAiInsight, generateHrData,
} from "@/lib/dashboard-data";
import { useToast } from "@/hooks/use-toast";

interface HealthAnalysis {
  overallAssessment: string;
  riskFactors: string[];
  recommendations: string[];
  medicationInteractions: string[];
  heatRiskLevel: "low" | "moderate" | "high" | "critical";
  dehydrationRisk: string;
  priorityLevel: number;
  hajjSpecificWarnings: string[];
}

interface PersonDetailPageProps {
  person: Personnel;
  onClose: () => void;
}

interface ResponderWithDistance extends Personnel {
  distance: number;
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pilgrim: { bg: "bg-slate-100", text: "text-slate-600", label: "Pilgrim" },
  paramedic: { bg: "bg-red-50", text: "text-red-600", label: "Paramedic" },
  doctor: { bg: "bg-blue-50", text: "text-blue-600", label: "Doctor" },
  nurse: { bg: "bg-purple-50", text: "text-purple-600", label: "Nurse" },
};

export function PersonDetailPage({ person: p, onClose }: PersonDetailPageProps) {
  const { toast } = useToast();
  const riskColor = getRiskColor(p.riskScore);
  const chartColor = p.status === "critical" ? "#f43f5e" : p.status === "warning" ? "#f59e0b" : "#10b981";
  const statusBorder = p.status === "critical" ? "border-red-400" : p.status === "warning" ? "border-amber-400" : "border-emerald-400";
  const statusBg = p.status === "critical" ? "bg-red-50" : p.status === "warning" ? "bg-amber-50" : "bg-emerald-50";
  const statusText = p.status === "critical" ? "text-red-600" : p.status === "warning" ? "text-amber-600" : "text-emerald-600";
  const roleInfo = ROLE_STYLES[p.role] || ROLE_STYLES.pilgrim;

  const hrData = useMemo(() => {
    return generateHrData(p.hr, p.status).map((val, i) => ({ time: i, hr: val }));
  }, [p.hr, p.status]);

  const spo2Data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const variation = p.status === "critical"
        ? Math.sin(i * 0.4) * 3 + Math.random() * 2
        : p.status === "warning"
        ? Math.sin(i * 0.3) * 2 + Math.random() * 1
        : Math.sin(i * 0.2) * 1 + Math.random() * 0.5;
      return { time: i, spo2: Math.min(100, Math.max(80, Math.round(p.spo2 + variation))) };
    });
  }, [p.spo2, p.status]);

  const tempData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const variation = p.status === "critical"
        ? Math.sin(i * 0.3) * 0.5 + Math.random() * 0.3
        : Math.sin(i * 0.2) * 0.2 + Math.random() * 0.1;
      return { time: i, temp: parseFloat((p.temp + variation).toFixed(1)) };
    });
  }, [p.temp, p.status]);

  const { data: healthAnalysis } = useQuery<HealthAnalysis>({
    queryKey: ["/api/personnel", p.id, "health-analysis"],
  });

  const { data: responders = [] } = useQuery<ResponderWithDistance[]>({
    queryKey: ["/api/personnel", p.id, "nearest-responders"],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${p.id}/nearest-responders?limit=5`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: p.role === "pilgrim",
  });

  const formatDistance = (km: number) => km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  const estimateETA = (km: number) => {
    const min = (km / 5) * 60;
    return min < 1 ? "< 1 min" : min < 60 ? `~${Math.round(min)} min` : `~${(min / 60).toFixed(1)} hr`;
  };

  const handleDispatch = (r: ResponderWithDistance) => {
    const rInfo = ROLE_STYLES[r.role] || ROLE_STYLES.pilgrim;
    toast({
      title: "Responder Dispatched",
      description: `${r.name} (${rInfo.label}) dispatched to ${p.name}. ETA: ${estimateETA(r.distance)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="person-detail-overlay">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="person-detail-page"
      >
        <div className={`sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between rounded-t-2xl`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl ${statusBg} flex items-center justify-center border-2 ${statusBorder}`}>
              <User className={`w-7 h-7 ${statusText}`} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-black text-2xl text-slate-900 tracking-[1px] uppercase" data-testid="detail-page-name">
                  {p.name}
                </h1>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${statusBg} ${statusText} border ${statusBorder}`}>
                  {p.status}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${roleInfo.bg} ${roleInfo.text}`}>
                  {roleInfo.label}
                </span>
              </div>
              <div className="flex gap-4 mt-1 text-sm text-slate-500 font-mono">
                <span>{p.externalId}</span>
                <span>Age: {p.age}</span>
                <span>{p.gender === "M" ? "Male" : "Female"}</span>
                {p.bloodType && <span>Blood: {p.bloodType}</span>}
                {p.zone && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.zone}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-detail"
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {p.fallDetected && (
          <div className="mx-8 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <div className="font-display font-bold text-sm text-red-600 tracking-[1px]">FALL DETECTED</div>
              <div className="text-sm text-red-500">Immediate medical review required. Movement sensor triggered.</div>
            </div>
          </div>
        )}

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-6 gap-4" data-testid="detail-vitals-grid">
            <VitalCardLarge icon={<Heart className="w-5 h-5" />} label="Heart Rate" value={`${p.hr}`} unit="BPM"
              color={p.hr > 130 ? "#f43f5e" : p.hr > 100 ? "#f59e0b" : "#10b981"}
              trend={p.hr > 130 ? "CRITICAL" : p.hr > 100 ? "HIGH" : "NORMAL"} />
            <VitalCardLarge icon={<Wind className="w-5 h-5" />} label="SpO2" value={`${p.spo2}%`} unit="Saturation"
              color={p.spo2 < 92 ? "#f43f5e" : p.spo2 < 95 ? "#f59e0b" : "#10b981"}
              trend={p.spo2 < 92 ? "CRITICAL" : p.spo2 < 95 ? "LOW" : "NORMAL"} />
            <VitalCardLarge icon={<Thermometer className="w-5 h-5" />} label="Temperature" value={`${p.temp}\u00B0C`} unit="Body Temp"
              color={p.temp > 38 ? "#f43f5e" : p.temp > 37.5 ? "#f59e0b" : "#10b981"}
              trend={p.temp > 38 ? "FEVER" : p.temp > 37.5 ? "ELEVATED" : "NORMAL"} />
            <VitalCardLarge icon={<Droplets className="w-5 h-5" />} label="Blood Pressure" value={p.bp} unit="mmHg"
              color="#10b981" trend="Monitoring" />
            <VitalCardLarge icon={<Footprints className="w-5 h-5" />} label="Steps" value={p.steps.toLocaleString()} unit="Today"
              color="#10b981" trend="Activity" />
            <VitalCardLarge icon={<BatteryMedium className="w-5 h-5" />} label="Battery" value={`${p.battery}%`} unit="Remaining"
              color={p.battery < 25 ? "#f43f5e" : p.battery < 50 ? "#f59e0b" : "#10b981"}
              trend={p.battery < 25 ? "LOW" : "OK"} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            <ChartSection title="Heart Rate - 30 Min" color={chartColor}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={hrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={["dataMin - 10", "dataMax + 10"]} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="hr" stroke={chartColor} fill={chartColor} fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartSection>

            <ChartSection title="SpO2 - 30 Min" color={p.spo2 < 95 ? "#f59e0b" : "#10b981"}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={spo2Data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[85, 100]} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="spo2" stroke={p.spo2 < 95 ? "#f59e0b" : "#10b981"} fill={p.spo2 < 95 ? "#f59e0b" : "#10b981"} fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartSection>

            <ChartSection title="Temperature - 30 Min" color={p.temp > 37.5 ? "#f59e0b" : "#10b981"}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={tempData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[35, 40]} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="temp" stroke={p.temp > 37.5 ? "#f59e0b" : "#10b981"} fill={p.temp > 37.5 ? "#f59e0b" : "#10b981"} fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartSection>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200" data-testid="detail-risk-section">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Hexagon className="w-5 h-5 text-teal-500" />
                  <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">Health Risk Score</span>
                </div>
                <span className="font-mono text-4xl font-bold" style={{ color: riskColor }}>
                  {p.riskScore}<span className="text-lg text-slate-400">/100</span>
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${p.riskScore}%`,
                    background: "linear-gradient(90deg, #10b981, #f59e0b, #f43f5e)",
                  }}
                />
              </div>
              <div className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-lg border-l-4 border-teal-400">
                <Activity className="w-4 h-4 text-teal-500 inline mr-1.5" />
                {getAiInsight(p)}
              </div>
            </div>

            {p.role === "pilgrim" && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200" data-testid="detail-responders">
                <div className="flex items-center gap-2 mb-4">
                  <Stethoscope className="w-5 h-5 text-teal-500" />
                  <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">Nearest Medical Responders</span>
                </div>
                {responders.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No responders nearby</p>
                ) : (
                  <div className="space-y-2">
                    {responders.map((r, i) => {
                      const rRole = ROLE_STYLES[r.role] || ROLE_STYLES.pilgrim;
                      return (
                        <div key={r.id} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center gap-3" data-testid={`detail-responder-${r.id}`}>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-mono text-sm font-bold text-slate-500">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800 truncate">{r.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${rRole.bg} ${rRole.text}`}>
                                {rRole.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-0.5"><Navigation className="w-3 h-3" />{formatDistance(r.distance)}</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{estimateETA(r.distance)}</span>
                              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{r.zone}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDispatch(r)}
                            data-testid={`button-detail-dispatch-${r.id}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            Dispatch
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {p.role !== "pilgrim" && (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-teal-500" />
                  <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">Responder Details</span>
                </div>
                <div className="space-y-3">
                  <InfoRow label="Role" value={roleInfo.label} />
                  <InfoRow label="Shift Duration" value={`${p.shiftHours} hours`} />
                  <InfoRow label="Current Zone" value={p.zone || "N/A"} />
                  <InfoRow label="Device Battery" value={`${p.battery}%`} />
                  <InfoRow label="Active Status" value={p.isActive ? "On Duty" : "Off Duty"} />
                  <InfoRow label="Coordinates" value={`${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}`} />
                </div>
              </div>
            )}
          </div>

          {(p.illnesses || p.medications || p.medicalHistory || p.nationality || p.address || p.emergencyContact) && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200" data-testid="detail-page-medical-profile">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-teal-500" />
                <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">Medical Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {p.illnesses && (
                  <MedicalInfoCard icon={<ShieldAlert className="w-4 h-4 text-rose-500" />} label="Conditions" value={p.illnesses} accent="border-l-rose-400" />
                )}
                {p.medications && (
                  <MedicalInfoCard icon={<Pill className="w-4 h-4 text-violet-500" />} label="Medications" value={p.medications} accent="border-l-violet-400" />
                )}
                {p.medicalHistory && (
                  <MedicalInfoCard icon={<FileText className="w-4 h-4 text-slate-500" />} label="Medical History" value={p.medicalHistory} accent="border-l-slate-400" />
                )}
                {p.nationality && (
                  <MedicalInfoCard icon={<Globe className="w-4 h-4 text-blue-500" />} label="Nationality" value={p.nationality} accent="border-l-blue-400" />
                )}
                {p.address && (
                  <MedicalInfoCard icon={<MapPin className="w-4 h-4 text-amber-500" />} label="Address" value={p.address} accent="border-l-amber-400" />
                )}
                {p.emergencyContact && (
                  <MedicalInfoCard icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Emergency Contact" value={p.emergencyContact} accent="border-l-emerald-400" />
                )}
              </div>
            </div>
          )}

          {healthAnalysis && (
            <AiAnalysisFullSection analysis={healthAnalysis} />
          )}

          <div className="grid grid-cols-4 gap-3" data-testid="detail-quick-actions">
            <ActionButton label="Dispatch Paramedic" color="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => toast({ title: "Paramedic Dispatched", description: `Nearest paramedic routed to ${p.name}.` })} />
            <ActionButton label="AED Drone" color="bg-slate-800 hover:bg-slate-900 text-white"
              onClick={() => toast({ title: "AED Drone Deployed", description: `AED drone launched toward ${p.name}. ~3 min arrival.` })} />
            <ActionButton label="Emergency Contact" color="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300"
              onClick={() => toast({ title: "Contact Notified", description: `Emergency contact for ${p.name} alerted via SMS/call.` })} />
            <ActionButton label="Medical Evacuation" color="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300"
              onClick={() => toast({ title: "Med-Evac Requested", description: `Ground transport dispatched to ${p.name}'s location.` })} />
            <ActionButton label="Stream Vitals" color="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200"
              onClick={() => toast({ title: "Vitals Streaming", description: `Live vitals for ${p.name} streaming to physician dashboard.` })} />
            <ActionButton label="Boost Sensor" color="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200"
              onClick={() => toast({ title: "Sensor Boosted", description: `Polling for ${p.name} increased to every 5 seconds.` })} />
            <ActionButton label="Wellness Check" color="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => toast({ title: "Wellness Check Sent", description: `Device vibration triggered for ${p.name}.` })} />
            <ActionButton label="GPS Track" color="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => toast({ title: "GPS Tracking", description: `Real-time location for ${p.name} updating every 2s.` })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalCardLarge({ icon, label, value, unit, color, trend }: {
  icon: ReactNode; label: string; value: string; unit: string; color: string; trend: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl" style={{ backgroundColor: color, opacity: 0.5 }} />
      <div style={{ color }} className="mb-2">{icon}</div>
      <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</div>
      <div className="font-mono text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-400 font-mono">{unit}</div>
      <div className="text-xs font-mono font-bold mt-1" style={{ color }}>{trend}</div>
    </div>
  );
}

function ChartSection({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

function MedicalInfoCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className={`bg-white rounded-lg p-3 border border-slate-200 border-l-4 ${accent}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm text-slate-800 leading-relaxed" data-testid={`text-detail-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
    </div>
  );
}

function AiAnalysisFullSection({ analysis }: { analysis: HealthAnalysis }) {
  const heatColors: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const priorityLabels: Record<number, { label: string; color: string }> = {
    1: { label: "CRITICAL", color: "bg-rose-100 text-rose-700 border-rose-300" },
    2: { label: "HIGH", color: "bg-orange-100 text-orange-700 border-orange-300" },
    3: { label: "MODERATE", color: "bg-amber-100 text-amber-700 border-amber-300" },
    4: { label: "STABLE", color: "bg-teal-100 text-teal-700 border-teal-300" },
    5: { label: "HEALTHY", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  };

  const hc = heatColors[analysis.heatRiskLevel] || heatColors.low;
  const pl = priorityLabels[analysis.priorityLevel] || priorityLabels[4];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border border-slate-200" data-testid="detail-page-ai-analysis">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-500" />
          <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">AI Health Analysis</span>
          <Sparkles className="w-4 h-4 text-amber-500 animate-subtle-breathe" />
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${pl.color}`} data-testid="text-priority-level">
          P{analysis.priorityLevel} {pl.label}
        </span>
      </div>

      <div className="bg-white rounded-xl p-4 border-l-4 border-l-teal-400 border border-slate-200 mb-5 text-sm text-slate-700 leading-relaxed" data-testid="text-detail-assessment">
        {analysis.overallAssessment}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className={`rounded-xl p-4 border ${hc.bg} ${hc.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-slate-600">Heat Risk</span>
          </div>
          <span className={`font-display text-xl font-bold uppercase ${hc.text}`}>{analysis.heatRiskLevel}</span>
        </div>
        <div className="rounded-xl p-4 border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-slate-600">Dehydration</span>
          </div>
          <span className="font-display text-sm font-bold text-blue-700">{analysis.dehydrationRisk}</span>
        </div>
        <div className="rounded-xl p-4 border bg-slate-100 border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-slate-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-slate-600">Risk Factors</span>
          </div>
          <span className="font-display text-xl font-bold text-slate-700">{analysis.riskFactors.length}</span>
          <span className="text-xs text-slate-500 ml-1">identified</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {analysis.riskFactors.length > 0 && analysis.riskFactors[0] !== "No significant risk factors identified at this time" && (
          <div>
            <div className="font-mono text-xs text-rose-600 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Risk Factors
            </div>
            <div className="space-y-2">
              {analysis.riskFactors.map((rf, i) => (
                <div key={i} className="text-sm text-slate-700 leading-relaxed pl-3 border-l-3 border-rose-300 bg-rose-50/60 rounded-r-lg py-2 pr-3">
                  {rf}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.recommendations.length > 0 && (
          <div>
            <div className="font-mono text-xs text-teal-600 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Recommendations
            </div>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="text-sm text-slate-700 leading-relaxed pl-3 border-l-3 border-teal-300 bg-teal-50/60 rounded-r-lg py-2 pr-3">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.medicationInteractions.length > 0 && (
          <div>
            <div className="font-mono text-xs text-violet-600 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" /> Medication Interactions
            </div>
            <div className="space-y-2">
              {analysis.medicationInteractions.map((mi, i) => (
                <div key={i} className="text-sm text-slate-700 leading-relaxed pl-3 border-l-3 border-violet-300 bg-violet-50/60 rounded-r-lg py-2 pr-3">
                  {mi}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.hajjSpecificWarnings.length > 0 && (
          <div>
            <div className="font-mono text-xs text-amber-600 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Hajj-Specific Warnings
            </div>
            <div className="space-y-2">
              {analysis.hajjSpecificWarnings.map((w, i) => (
                <div key={i} className="text-sm text-slate-700 leading-relaxed pl-3 border-l-3 border-amber-300 bg-amber-50/60 rounded-r-lg py-2 pr-3">
                  {w}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid={`action-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={`${color} rounded-xl py-3 text-sm font-bold transition-colors cursor-pointer`}
    >
      {label}
    </button>
  );
}
