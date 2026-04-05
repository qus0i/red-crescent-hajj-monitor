import { useState, useEffect, useCallback } from "react";
import { type Personnel } from "@shared/schema";
import {
  Sparkles, X, Ambulance, Stethoscope, Heart, Clock, MapPin,
  AlertTriangle, CheckCircle2, Users, Navigation, Zap, Radio,
  ChevronDown, ChevronRight, Send
} from "lucide-react";

interface Responder extends Personnel {
  distance: number;
}

interface DispatchPlan {
  pilgrim: Personnel;
  priority: "CRITICAL" | "HIGH" | "MODERATE";
  responders: Responder[];
  recommendation: string;
  requiredTypes: string[];
  eta: string;
  riskFactors: string[];
}

interface AiDispatchModalProps {
  open: boolean;
  onClose: () => void;
  criticalPersonnel: Personnel[];
}

function estimateEta(distanceKm: number): string {
  if (distanceKm < 0.1) return "< 1 min";
  if (distanceKm < 0.3) return "1-2 min";
  if (distanceKm < 0.5) return "2-3 min";
  if (distanceKm < 1) return "3-5 min";
  if (distanceKm < 2) return "5-8 min";
  return `${Math.round(distanceKm * 5)}-${Math.round(distanceKm * 7)} min`;
}

function classifyPriority(p: Personnel): "CRITICAL" | "HIGH" | "MODERATE" {
  if (p.status === "critical" || p.riskScore > 70 || p.hr > 140 || p.spo2 < 90 || p.temp > 39.5) return "CRITICAL";
  if (p.status === "warning" || p.riskScore > 50 || p.hr > 120 || p.spo2 < 93 || p.temp > 38.5) return "HIGH";
  return "MODERATE";
}

function determineRequiredTypes(p: Personnel): string[] {
  const types: string[] = [];
  if (p.riskScore > 70 || p.hr > 150 || p.spo2 < 88) {
    types.push("doctor", "paramedic");
  } else if (p.riskScore > 50 || p.hr > 130 || p.spo2 < 92) {
    types.push("paramedic");
  }
  if (p.temp > 39) types.push("nurse");
  if (p.fallDetected) types.push("paramedic");
  if (types.length === 0) types.push("nurse");
  return [...new Set(types)];
}

function generateRecommendation(p: Personnel, responders: Responder[]): string {
  const issues: string[] = [];
  if (p.hr > 130) issues.push(`tachycardia (HR ${p.hr})`);
  if (p.spo2 < 93) issues.push(`hypoxemia (SpO2 ${p.spo2}%)`);
  if (p.temp > 38.5) issues.push(`hyperthermia (${p.temp}C)`);
  if (p.fallDetected) issues.push("fall detected");
  if (p.riskScore > 70) issues.push(`high risk score (${p.riskScore})`);

  const nearestDist = responders[0]?.distance;
  const eta = nearestDist ? estimateEta(nearestDist) : "unknown";

  if (issues.length === 0) return `Monitor vitals. Nearest responder ETA: ${eta}.`;
  return `Immediate attention needed: ${issues.join(", ")}. Dispatch nearest responder (ETA: ${eta}). ${p.temp > 39 ? "Initiate cooling protocol. " : ""}${p.spo2 < 90 ? "Prepare supplemental oxygen. " : ""}`;
}

function getRiskFactors(p: Personnel): string[] {
  const factors: string[] = [];
  if (p.age > 60) factors.push("Elderly patient (>60)");
  if (p.hr > 130) factors.push("Elevated heart rate");
  if (p.spo2 < 93) factors.push("Low blood oxygen");
  if (p.temp > 38.5) factors.push("Heat stress risk");
  if (p.fallDetected) factors.push("Fall detected");
  if (p.battery < 20) factors.push("Low device battery");
  if (p.riskScore > 70) factors.push("High AI risk score");
  return factors;
}

const PRIORITY_STYLES = {
  CRITICAL: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", badge: "bg-rose-500 text-white" },
  HIGH: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500 text-white" },
  MODERATE: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500 text-white" },
};

const ROLE_ICON: Record<string, typeof Stethoscope> = {
  doctor: Stethoscope,
  paramedic: Ambulance,
  nurse: Heart,
};

export function AiDispatchModal({ open, onClose, criticalPersonnel }: AiDispatchModalProps) {
  const [plans, setPlans] = useState<DispatchPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [dispatched, setDispatched] = useState<Set<number>>(new Set());

  const analyze = useCallback(async () => {
    if (criticalPersonnel.length === 0) {
      setPlans([]);
      setExpandedIds(new Set());
      setDispatched(new Set());
      return;
    }
    setLoading(true);
    setDispatched(new Set());

    const results: DispatchPlan[] = [];

    const sorted = [...criticalPersonnel].sort((a, b) => {
      const pa = classifyPriority(a);
      const pb = classifyPriority(b);
      const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2 };
      if (order[pa] !== order[pb]) return order[pa] - order[pb];
      return b.riskScore - a.riskScore;
    });

    for (const pilgrim of sorted) {
      try {
        const res = await fetch(`/api/personnel/${pilgrim.id}/nearest-responders?limit=8`);
        const responders: Responder[] = res.ok ? await res.json() : [];

        const priority = classifyPriority(pilgrim);
        const requiredTypes = determineRequiredTypes(pilgrim);
        const recommendation = generateRecommendation(pilgrim, responders);
        const riskFactors = getRiskFactors(pilgrim);
        const nearestDist = responders[0]?.distance;
        const eta = nearestDist ? estimateEta(nearestDist) : "No responders nearby";

        results.push({ pilgrim, priority, responders, recommendation, requiredTypes, eta, riskFactors });
      } catch {
        results.push({
          pilgrim,
          priority: classifyPriority(pilgrim),
          responders: [],
          recommendation: "Unable to fetch nearby responders. Manual dispatch required.",
          requiredTypes: determineRequiredTypes(pilgrim),
          eta: "Unknown",
          riskFactors: getRiskFactors(pilgrim),
        });
      }
    }

    setPlans(results);
    setExpandedIds(new Set(results.filter(p => p.priority === "CRITICAL").map(p => p.pilgrim.id)));
    setLoading(false);
  }, [criticalPersonnel]);

  useEffect(() => {
    if (open && criticalPersonnel.length > 0) {
      analyze();
    }
  }, [open, analyze]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDispatch = (pilgrimId: number) => {
    setDispatched(prev => new Set(prev).add(pilgrimId));
  };

  if (!open) return null;

  const critCount = plans.filter(p => p.priority === "CRITICAL").length;
  const highCount = plans.filter(p => p.priority === "HIGH").length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="modal-ai-dispatch">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-h-surface rounded-2xl border border-h-border shadow-2xl flex flex-col overflow-hidden animate-fade-in">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600/10 to-emerald-600/10 border-b border-h-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-h-text-bright tracking-wide">AI Dispatch Recommendation</h2>
              <p className="text-[10px] font-mono text-h-text-dim mt-0.5">Automated responder analysis and deployment plan</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-h-border flex items-center justify-center text-h-text-dim hover:bg-h-surface2 cursor-pointer" data-testid="button-close-dispatch">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-teal-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-500 animate-spin" />
              <Zap className="absolute inset-0 m-auto w-6 h-6 text-teal-500 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-h-text-bright">Analyzing {criticalPersonnel.length} personnel</p>
              <p className="text-[10px] font-mono text-h-text-dim mt-1">Calculating optimal responder deployment...</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-sm font-bold text-h-text-bright">No personnel require dispatch</p>
            <p className="text-[10px] font-mono text-h-text-dim">All filtered personnel are within normal parameters</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 bg-h-surface2/50 border-b border-h-border flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <Radio className="w-3 h-3 text-h-text-dim" />
                <span className="text-h-text-dim">{plans.length} cases analyzed</span>
              </div>
              {critCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-mono text-[10px] font-bold">
                  {critCount} CRITICAL
                </span>
              )}
              {highCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                  {highCount} HIGH
                </span>
              )}
              <button
                onClick={() => {
                  plans.forEach(p => handleDispatch(p.pilgrim.id));
                }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-teal-700 transition-colors"
                data-testid="button-dispatch-all"
              >
                <Send className="w-3 h-3" />
                Dispatch All
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
              {plans.map(plan => {
                const style = PRIORITY_STYLES[plan.priority];
                const expanded = expandedIds.has(plan.pilgrim.id);
                const isDispatched = dispatched.has(plan.pilgrim.id);

                return (
                  <div
                    key={plan.pilgrim.id}
                    className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden transition-all`}
                    data-testid={`dispatch-plan-${plan.pilgrim.id}`}
                  >
                    <div
                      onClick={() => toggleExpand(plan.pilgrim.id)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      {expanded ? <ChevronDown className="w-4 h-4 text-h-text-dim flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-h-text-dim flex-shrink-0" />}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black tracking-wider ${style.badge}`}>
                        {plan.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-h-text-bright">{plan.pilgrim.name}</span>
                        <span className="text-[10px] text-h-text-dim ml-2 font-mono">{plan.pilgrim.externalId}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-h-text-dim flex-shrink-0">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{plan.pilgrim.hr}</span>
                        <span>{plan.pilgrim.spo2}%</span>
                        <span>{plan.pilgrim.temp}&deg;C</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-h-text-dim flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span className="font-bold">{plan.eta}</span>
                      </div>
                      {isDispatched ? (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-[9px] font-bold flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> SENT
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDispatch(plan.pilgrim.id); }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 text-white font-mono text-[9px] font-bold cursor-pointer hover:bg-teal-700 transition-colors flex-shrink-0"
                          data-testid={`button-dispatch-${plan.pilgrim.id}`}
                        >
                          <Send className="w-3 h-3" /> DISPATCH
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-h-border/50 space-y-3">
                        <div className="bg-h-surface/60 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-h-text leading-relaxed">{plan.recommendation}</p>
                          </div>
                        </div>

                        {plan.riskFactors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {plan.riskFactors.map((f, i) => (
                              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-h-surface2 text-[9px] font-mono text-h-text-dim border border-h-border">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                                {f}
                              </span>
                            ))}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3 h-3 text-h-text-dim" />
                            <span className="text-[10px] font-mono font-bold text-h-text-dim uppercase tracking-wider">Nearest Responders</span>
                          </div>
                          {plan.responders.length === 0 ? (
                            <p className="text-[10px] font-mono text-h-text-dim italic pl-5">No responders found in range</p>
                          ) : (
                            <div className="space-y-1.5 pl-5">
                              {plan.responders.slice(0, 5).map((r, idx) => {
                                const RoleIcon = ROLE_ICON[r.role] || Users;
                                const isRecommended = plan.requiredTypes.includes(r.role);
                                return (
                                  <div
                                    key={r.id}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-mono ${
                                      isRecommended ? "bg-teal-500/5 border border-teal-500/20" : "bg-h-surface2/50 border border-h-border/50"
                                    }`}
                                    data-testid={`responder-${r.id}`}
                                  >
                                    <span className="w-4 text-h-text-dim font-bold">#{idx + 1}</span>
                                    <RoleIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isRecommended ? "text-teal-500" : "text-h-text-dim"}`} />
                                    <span className="font-bold text-h-text-bright flex-1">{r.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black ${
                                      r.role === "doctor" ? "bg-blue-500/10 text-blue-400" :
                                      r.role === "paramedic" ? "bg-rose-500/10 text-rose-400" :
                                      "bg-purple-500/10 text-purple-400"
                                    }`}>{r.role}</span>
                                    <span className="flex items-center gap-1 text-h-text-dim">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {r.distance < 1 ? `${Math.round(r.distance * 1000)}m` : `${r.distance.toFixed(1)}km`}
                                    </span>
                                    <span className="flex items-center gap-1 text-h-text-dim">
                                      <Navigation className="w-2.5 h-2.5" />
                                      {estimateEta(r.distance)}
                                    </span>
                                    {isRecommended && (
                                      <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 text-[8px] font-bold">RECOMMENDED</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
