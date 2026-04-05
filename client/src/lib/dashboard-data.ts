import type { Personnel } from "@shared/schema";

export function getVitalClass(val: number, warnThresh: number, critThresh?: number): string {
  if (critThresh && val >= critThresh) return "text-h-rose";
  if (val >= warnThresh) return "text-h-amber";
  return "";
}

export function getSpO2Class(val: number): string {
  if (val < 92) return "text-h-rose";
  if (val < 95) return "text-h-amber";
  return "";
}

export function getTempClass(val: number): string {
  if (val > 38.0) return "text-h-rose";
  if (val > 37.5) return "text-h-amber";
  return "";
}

export function getBatteryClass(val: number): string {
  if (val < 25) return "text-h-rose";
  if (val < 50) return "text-h-amber";
  return "";
}

export function getRiskColor(score: number): string {
  if (score > 70) return "#f43f5e";
  if (score > 40) return "#f59e0b";
  return "#10b981";
}

export function getAiInsight(p: Personnel): string {
  if (p.riskScore > 70) {
    return `HIGH RISK: ${p.name} shows multi-system distress. HR ${p.hr} BPM with SpO2 ${p.spo2}% suggests cardiovascular strain. Immediate medical review recommended. ${p.fallDetected ? "Fall detection triggered - possible collapse event." : ""} Risk trajectory: escalating.`;
  }
  if (p.riskScore > 40) {
    return `MODERATE RISK: ${p.name} vitals trending above normal ranges. HR sustained at ${p.hr} BPM. Recommend rest and hydration. Monitor for next 15 minutes. Risk trajectory: moderate-rising.`;
  }
  return `${p.name} vitals within normal parameters. All biomarkers stable. Current activity level appropriate for monitoring duration (${p.shiftHours}h). No intervention required.`;
}

export function generateHrData(baseHr: number, status: string): number[] {
  const points: number[] = [];
  for (let i = 0; i < 30; i++) {
    let variation: number;
    if (status === "critical") {
      variation = Math.sin(i * 0.5) * 20 + Math.random() * 15;
    } else if (status === "warning") {
      variation = Math.sin(i * 0.3) * 12 + Math.random() * 8;
    } else {
      variation = Math.sin(i * 0.2) * 5 + Math.random() * 4;
    }
    points.push(Math.round(baseHr + variation));
  }
  return points;
}
