import type { Personnel } from "@shared/schema";

export type SupportedLang = "en" | "ar" | "ur" | "id" | "ms";

export interface HealthAnalysis {
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
  language: SupportedLang;
  humanAgentRequired: boolean;
}

function parseBP(bp: string): { systolic: number; diastolic: number } {
  const [s, d] = bp.split("/").map(Number);
  return { systolic: s || 120, diastolic: d || 80 };
}

function parseConditions(field: string | null): string[] {
  if (!field) return [];
  return field.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

const HEAT_SENSITIVE_CONDITIONS = [
  "diabetes", "hypertension", "heart disease", "cardiac arrhythmia",
  "copd", "chronic kidney disease", "obesity", "multiple sclerosis",
];

const DEHYDRATION_RISK_MEDS = [
  "diuretic", "furosemide", "hydrochlorothiazide", "spironolactone",
  "laxative", "lithium", "sglt2",
];

const HEAT_RISK_MEDS = [
  "beta-blocker", "atenolol", "metoprolol", "propranolol",
  "anticholinergic", "antihistamine", "antipsychotic",
  "amphetamine", "stimulant",
];

const SUPPORTED_LANGS: SupportedLang[] = ["en", "ar", "ur", "id", "ms"];

const NATIONALITY_RECORD_STATUS: Record<string, { nationalRecords: "linked" | "pending" | "unavailable"; partnerCountryData: "available" | "partial" | "unavailable" }> = {
  "Saudi Arabian": { nationalRecords: "linked", partnerCountryData: "available" },
  "Egyptian": { nationalRecords: "pending", partnerCountryData: "partial" },
  "Pakistani": { nationalRecords: "pending", partnerCountryData: "partial" },
  "Indonesian": { nationalRecords: "pending", partnerCountryData: "partial" },
  "Indian": { nationalRecords: "pending", partnerCountryData: "partial" },
  "Bangladeshi": { nationalRecords: "unavailable", partnerCountryData: "partial" },
  "Turkish": { nationalRecords: "pending", partnerCountryData: "available" },
  "Jordanian": { nationalRecords: "pending", partnerCountryData: "available" },
  "Moroccan": { nationalRecords: "unavailable", partnerCountryData: "partial" },
  "Nigerian": { nationalRecords: "unavailable", partnerCountryData: "unavailable" },
  "Malaysian": { nationalRecords: "pending", partnerCountryData: "available" },
};

function parseHospitalHistory(history: string | null): { hospitalizations: string[]; surgeries: string[]; allergies: string[]; recencyScore: "recent" | "moderate" | "historical" } {
  if (!history) return { hospitalizations: [], surgeries: [], allergies: [], recencyScore: "historical" };

  const parts = history.split(",").map(s => s.trim()).filter(Boolean);
  const hospitalizations: string[] = [];
  const surgeries: string[] = [];
  const allergies: string[] = [];
  let mostRecentYear = 0;

  for (const part of parts) {
    const yearMatch = part.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;
    if (year > mostRecentYear) mostRecentYear = year;

    if (part.toLowerCase().includes("hospitalized") || part.toLowerCase().includes("hospital")) {
      hospitalizations.push(part);
    } else if (part.toLowerCase().includes("surgery") || part.toLowerCase().includes("replacement") || part.toLowerCase().includes("repair") || part.toLowerCase().includes("ectomy") || part.toLowerCase().includes("stent") || part.toLowerCase().includes("fracture")) {
      surgeries.push(part);
    } else if (part.toLowerCase().includes("allerg")) {
      allergies.push(part);
    } else {
      hospitalizations.push(part);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearsAgo = mostRecentYear > 0 ? currentYear - mostRecentYear : 99;
  const recencyScore = yearsAgo <= 2 ? "recent" : yearsAgo <= 5 ? "moderate" : "historical";

  return { hospitalizations, surgeries, allergies, recencyScore };
}

const LANG_TRANSLATIONS: Record<SupportedLang, Record<string, string>> = {
  en: {},
  ar: {
    "CRITICAL": "حرج",
    "URGENT": "عاجل",
    "ELEVATED": "مرتفع",
    "STABLE": "مستقر",
    "requires immediate medical intervention": "يتطلب تدخلاً طبياً فورياً",
    "Multiple vital signs are outside safe parameters": "علامات حيوية متعددة خارج المعايير الآمنة",
    "Heat risk is": "خطر الحرارة هو",
    "Initiate emergency response protocol": "ابدأ بروتوكول الاستجابة الطارئة",
    "shows concerning vital sign patterns": "يُظهر أنماط علامات حيوية مقلقة",
    "Close monitoring and potential intervention needed": "مطلوب مراقبة دقيقة وتدخل محتمل",
    "has mildly elevated indicators": "لديه مؤشرات مرتفعة قليلاً",
    "is within acceptable vital sign ranges": "ضمن نطاقات العلامات الحيوية المقبولة",
    "Critical — immediate IV fluid assessment recommended": "حرج — يُوصى بتقييم فوري للسوائل الوريدية",
    "High — enforce oral rehydration protocol every 30 minutes": "عالي — تطبيق بروتوكول الإماهة الفموية كل 30 دقيقة",
    "Moderate — encourage regular fluid intake": "متوسط — تشجيع تناول السوائل بانتظام",
    "Low — maintain normal hydration schedule": "منخفض — الحفاظ على جدول الترطيب الطبيعي",
    "Monitor blood glucose every": "مراقبة سكر الدم كل",
    "hours": "ساعات",
    "Diabetic patient requires regular glucose monitoring": "مريض السكري يتطلب مراقبة منتظمة للسكر",
    "Glucose monitoring recommended due to medication interactions": "يُوصى بمراقبة السكر بسبب تفاعلات الأدوية",
  },
  ur: {
    "CRITICAL": "نازک",
    "URGENT": "فوری",
    "ELEVATED": "بلند",
    "STABLE": "مستحکم",
    "requires immediate medical intervention": "فوری طبی مداخلت کی ضرورت ہے",
    "Heat risk is": "گرمی کا خطرہ ہے",
    "Initiate emergency response protocol": "ایمرجنسی رسپانس پروٹوکول شروع کریں",
    "Critical — immediate IV fluid assessment recommended": "نازک — فوری IV سیال تشخیص کی سفارش",
    "High — enforce oral rehydration protocol every 30 minutes": "زیادہ — ہر 30 منٹ میں زبانی ری ہائیڈریشن پروٹوکول نافذ کریں",
    "Moderate — encourage regular fluid intake": "معتدل — باقاعدہ سیال کی مقدار کی حوصلہ افزائی کریں",
    "Low — maintain normal hydration schedule": "کم — عام ہائیڈریشن شیڈول برقرار رکھیں",
  },
  id: {
    "CRITICAL": "KRITIS",
    "URGENT": "MENDESAK",
    "ELEVATED": "MENINGKAT",
    "STABLE": "STABIL",
    "requires immediate medical intervention": "memerlukan intervensi medis segera",
    "Heat risk is": "Risiko panas adalah",
    "Initiate emergency response protocol": "Mulai protokol respons darurat",
    "Critical — immediate IV fluid assessment recommended": "Kritis — penilaian cairan IV segera disarankan",
    "High — enforce oral rehydration protocol every 30 minutes": "Tinggi — terapkan protokol rehidrasi oral setiap 30 menit",
    "Moderate — encourage regular fluid intake": "Sedang — dorong asupan cairan teratur",
    "Low — maintain normal hydration schedule": "Rendah — pertahankan jadwal hidrasi normal",
  },
  ms: {
    "CRITICAL": "KRITIKAL",
    "URGENT": "SEGERA",
    "ELEVATED": "MENINGKAT",
    "STABLE": "STABIL",
    "requires immediate medical intervention": "memerlukan campur tangan perubatan segera",
    "Heat risk is": "Risiko haba adalah",
    "Initiate emergency response protocol": "Mulakan protokol tindak balas kecemasan",
    "Critical — immediate IV fluid assessment recommended": "Kritikal — penilaian cecair IV segera disyorkan",
    "High — enforce oral rehydration protocol every 30 minutes": "Tinggi — kuatkuasakan protokol rehidrasi oral setiap 30 minit",
    "Moderate — encourage regular fluid intake": "Sederhana — galakkan pengambilan cecair secara tetap",
    "Low — maintain normal hydration schedule": "Rendah — kekalkan jadual penghidratan biasa",
  },
};

function translateText(text: string, lang: SupportedLang): string {
  if (lang === "en") return text;
  const dict = LANG_TRANSLATIONS[lang];
  if (!dict) return text;
  let result = text;
  for (const [en, translated] of Object.entries(dict)) {
    result = result.replace(new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), translated);
  }
  return result;
}

function translateArray(arr: string[], lang: SupportedLang): string[] {
  return arr.map(s => translateText(s, lang));
}

export function generateHealthAnalysis(person: Personnel, lang: SupportedLang = "en"): HealthAnalysis {
  const bp = parseBP(person.bp);
  const conditions = parseConditions(person.illnesses);
  const meds = parseConditions(person.medications);
  const history = parseConditions(person.medicalHistory);
  const allMedical = [...conditions, ...history];

  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  const medicationInteractions: string[] = [];
  const hajjSpecificWarnings: string[] = [];

  let heatScore = 0;
  let dehydrationScore = 0;
  let priorityLevel = 5;

  if (person.age >= 65) {
    riskFactors.push(`Advanced age (${person.age}) increases vulnerability to heat, dehydration, and cardiovascular events`);
    heatScore += 2;
    dehydrationScore += 2;
    priorityLevel = Math.min(priorityLevel, 3);
  } else if (person.age >= 55) {
    riskFactors.push(`Age ${person.age} places patient in elevated risk category for Hajj-related health events`);
    heatScore += 1;
    dehydrationScore += 1;
    priorityLevel = Math.min(priorityLevel, 4);
  }

  if (person.hr > 130) {
    riskFactors.push(`Tachycardia detected (HR: ${person.hr} BPM) — significantly elevated, possible cardiac stress or severe dehydration`);
    priorityLevel = Math.min(priorityLevel, 1);
    heatScore += 3;
  } else if (person.hr > 100) {
    riskFactors.push(`Elevated heart rate (HR: ${person.hr} BPM) — may indicate heat stress, anxiety, or early dehydration`);
    priorityLevel = Math.min(priorityLevel, 3);
    heatScore += 1;
  }

  if (person.spo2 < 90) {
    riskFactors.push(`Critically low oxygen saturation (SpO2: ${person.spo2}%) — immediate supplemental oxygen may be needed`);
    priorityLevel = 1;
  } else if (person.spo2 < 94) {
    riskFactors.push(`Below-normal oxygen saturation (SpO2: ${person.spo2}%) — monitor closely for respiratory compromise`);
    priorityLevel = Math.min(priorityLevel, 2);
  }

  if (person.temp > 39.0) {
    riskFactors.push(`High fever (${person.temp}\u00B0C) — possible heat stroke, infection, or inflammatory response`);
    heatScore += 4;
    priorityLevel = 1;
    hajjSpecificWarnings.push("Temperature exceeds heat stroke threshold (39\u00B0C). Initiate rapid cooling protocol immediately.");
  } else if (person.temp > 38.0) {
    riskFactors.push(`Elevated temperature (${person.temp}\u00B0C) — monitor for heat exhaustion progression`);
    heatScore += 2;
    priorityLevel = Math.min(priorityLevel, 2);
  } else if (person.temp > 37.5) {
    riskFactors.push(`Mildly elevated temperature (${person.temp}\u00B0C) — early heat stress indicator`);
    heatScore += 1;
  }

  if (bp.systolic > 160 || bp.diastolic > 100) {
    riskFactors.push(`Hypertensive crisis (BP: ${person.bp} mmHg) — risk of stroke or cardiac event`);
    priorityLevel = Math.min(priorityLevel, 1);
  } else if (bp.systolic > 140 || bp.diastolic > 90) {
    riskFactors.push(`Elevated blood pressure (BP: ${person.bp} mmHg) — exacerbated by heat and physical exertion`);
    priorityLevel = Math.min(priorityLevel, 3);
  }

  if (person.fallDetected) {
    riskFactors.push("Fall detected by wearable sensor — assess for injury, syncope, or loss of consciousness");
    priorityLevel = 1;
    hajjSpecificWarnings.push("Fall in crowded Hajj environment. Check for crush-related injuries and ensure safe positioning.");
  }

  for (const cond of allMedical) {
    if (cond.includes("diabetes") || cond.includes("diabetic")) {
      riskFactors.push("Diabetes increases heat sensitivity and dehydration risk. Blood glucose may fluctuate with fasting and exertion.");
      heatScore += 2;
      dehydrationScore += 2;
      recommendations.push("Monitor blood glucose levels every 2 hours. Ensure adequate carbohydrate intake during non-fasting periods.");
      hajjSpecificWarnings.push("Diabetic pilgrim — risk of hypoglycemia during extended walking rituals. Carry glucose tablets.");
    }
    if (cond.includes("hypertension") || cond.includes("high blood pressure")) {
      riskFactors.push("Pre-existing hypertension compounds cardiovascular risk during physical exertion in extreme heat.");
      heatScore += 1;
      recommendations.push("Ensure antihypertensive medication is taken on schedule. Avoid prolonged sun exposure.");
    }
    if (cond.includes("asthma") || cond.includes("copd") || cond.includes("respiratory")) {
      riskFactors.push("Respiratory condition may be exacerbated by dust, heat, and crowd density at holy sites.");
      recommendations.push("Keep rescue inhaler accessible. Avoid peak crowd times if possible. Monitor SpO2 continuously.");
      hajjSpecificWarnings.push("Respiratory patient in high-dust, high-density environment. Pre-position near medical tent.");
    }
    if (cond.includes("heart") || cond.includes("cardiac") || cond.includes("coronary") || cond.includes("arrhythmia")) {
      riskFactors.push("Cardiac history significantly increases risk during Hajj physical demands and heat exposure.");
      heatScore += 3;
      priorityLevel = Math.min(priorityLevel, 2);
      recommendations.push("Limit physical exertion during peak heat hours (11 AM - 3 PM). Ensure AED access within 2 minutes.");
      hajjSpecificWarnings.push("Cardiac patient — assign dedicated medical escort for Tawaf and Sa'i rituals.");
    }
    if (cond.includes("kidney") || cond.includes("renal")) {
      riskFactors.push("Renal condition increases vulnerability to dehydration and electrolyte imbalance.");
      dehydrationScore += 3;
      recommendations.push("Strict fluid intake monitoring. Watch for signs of acute kidney injury: reduced urine output, swelling.");
    }
    if (cond.includes("arthritis") || cond.includes("joint") || cond.includes("mobility")) {
      riskFactors.push("Mobility limitation increases fall risk in crowded pilgrimage areas.");
      recommendations.push("Use wheelchair assistance for extended walking rituals. Prioritize accessible routes.");
      hajjSpecificWarnings.push("Mobility-impaired pilgrim — arrange wheelchair for Tawaf and Jamarat bridge crossing.");
    }
  }

  for (const med of meds) {
    if (med.includes("metformin")) {
      medicationInteractions.push("Metformin: Risk of lactic acidosis increases with dehydration. Ensure adequate fluid intake.");
    }
    if (med.includes("insulin")) {
      medicationInteractions.push("Insulin: Storage temperature sensitivity in extreme heat. Keep in cool pack. Adjust dosage for increased physical activity.");
      hajjSpecificWarnings.push("Insulin-dependent — verify cold chain for insulin storage in tent accommodation.");
    }
    if (med.includes("warfarin") || med.includes("blood thinner") || med.includes("anticoagulant")) {
      medicationInteractions.push("Anticoagulant therapy: Increased bleeding risk from falls or crowd-related injuries. Carry medication alert card.");
    }
    if (med.includes("lisinopril") || med.includes("enalapril") || med.includes("ace inhibitor")) {
      medicationInteractions.push("ACE inhibitor: May cause excessive blood pressure drop during dehydration. Monitor BP frequently.");
    }
    if (med.includes("amlodipine") || med.includes("calcium channel")) {
      medicationInteractions.push("Calcium channel blocker: Heat may enhance vasodilatory effect, causing dizziness. Rise slowly from seated position.");
    }
    if (DEHYDRATION_RISK_MEDS.some(d => med.includes(d))) {
      medicationInteractions.push(`${med}: Increases dehydration risk. Compensate with additional fluid intake.`);
      dehydrationScore += 2;
    }
    if (HEAT_RISK_MEDS.some(h => med.includes(h))) {
      medicationInteractions.push(`${med}: May impair thermoregulation. Increased heat illness vulnerability.`);
      heatScore += 2;
    }
    if (med.includes("aspirin") && person.temp > 38) {
      medicationInteractions.push("Aspirin with fever: Monitor for Reye's syndrome risk indicators. Consider acetaminophen for fever management.");
    }
  }

  if (HEAT_SENSITIVE_CONDITIONS.some(c => allMedical.some(m => m.includes(c)))) {
    heatScore += 1;
  }

  if (person.steps > 10000 && person.age > 55) {
    hajjSpecificWarnings.push(`High activity level (${person.steps.toLocaleString()} steps) for age ${person.age}. Recommend rest period.`);
    heatScore += 1;
  }

  if (person.battery < 20) {
    recommendations.push(`Wearable battery critical (${person.battery}%). Replace or charge device to maintain vital sign monitoring.`);
  }

  const heatRiskLevel: HealthAnalysis["heatRiskLevel"] =
    heatScore >= 6 ? "critical" : heatScore >= 4 ? "high" : heatScore >= 2 ? "moderate" : "low";

  const dehydrationRisk =
    dehydrationScore >= 5 ? "Critical — immediate IV fluid assessment recommended" :
    dehydrationScore >= 3 ? "High — enforce oral rehydration protocol every 30 minutes" :
    dehydrationScore >= 1 ? "Moderate — encourage regular fluid intake" :
    "Low — maintain normal hydration schedule";

  if (riskFactors.length === 0) {
    riskFactors.push("No significant risk factors identified at this time");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue standard monitoring protocol");
    recommendations.push("Maintain hydration with 250ml water every 30 minutes during outdoor activities");
  }

  recommendations.push("Ensure emergency contact information is current and accessible");
  if (heatRiskLevel === "high" || heatRiskLevel === "critical") {
    recommendations.push("Move to shaded/air-conditioned area immediately if outdoors");
    recommendations.push("Apply cold compresses to neck, wrists, and forehead");
  }

  let overallAssessment: string;
  if (priorityLevel === 1) {
    overallAssessment = `CRITICAL: ${person.name} requires immediate medical intervention. Multiple vital signs are outside safe parameters${allMedical.length > 0 ? `, complicated by pre-existing conditions (${conditions.slice(0, 3).join(", ")})` : ""}. Heat risk is ${heatRiskLevel}. Initiate emergency response protocol.`;
  } else if (priorityLevel === 2) {
    overallAssessment = `URGENT: ${person.name} shows concerning vital sign patterns that require prompt medical evaluation${allMedical.length > 0 ? `. Medical history of ${conditions.slice(0, 2).join(" and ")} increases complication risk` : ""}. Close monitoring and potential intervention needed within 15 minutes.`;
  } else if (priorityLevel <= 3) {
    overallAssessment = `ELEVATED: ${person.name} has mildly elevated indicators requiring increased monitoring frequency${allMedical.length > 0 ? `. Known conditions (${conditions.slice(0, 2).join(", ")}) warrant precautionary measures` : ""}. Reassess in 30 minutes.`;
  } else {
    overallAssessment = `STABLE: ${person.name} is within acceptable vital sign ranges. ${allMedical.length > 0 ? `Continue monitoring given medical history. ` : ""}Standard Hajj health protocol applies. Next scheduled check in 60 minutes.`;
  }

  let glucoseMonitoring: HealthAnalysis["glucoseMonitoring"] = undefined;
  const hasDiabetes = allMedical.some(c => c.includes("diabetes") || c.includes("diabetic"));
  const hasGlucoseMeds = meds.some(m => m.includes("metformin") || m.includes("insulin") || m.includes("glimepiride") || m.includes("glipizide") || m.includes("sglt2"));
  if (hasDiabetes) {
    glucoseMonitoring = {
      recommended: true,
      frequency: priorityLevel <= 2 ? "Every 1 hour" : "Every 2 hours",
      reason: "Diabetic patient requires regular glucose monitoring during Hajj physical exertion and heat exposure",
    };
  } else if (hasGlucoseMeds) {
    glucoseMonitoring = {
      recommended: true,
      frequency: "Every 4 hours",
      reason: "Glucose monitoring recommended due to medication interactions affecting blood sugar levels",
    };
  }

  const historyParsed = parseHospitalHistory(person.medicalHistory);

  if (historyParsed.recencyScore === "recent") {
    riskFactors.push("Recent medical event in history (within 2 years) — heightened monitoring recommended");
    priorityLevel = Math.min(priorityLevel, 3);
  }

  if (historyParsed.allergies.length > 0) {
    for (const a of historyParsed.allergies) {
      hajjSpecificWarnings.push(`ALLERGY ALERT: ${a}. Verify medications do not contain allergens before administration.`);
    }
  }

  if (historyParsed.surgeries.length > 0 && person.age >= 60) {
    recommendations.push("Prior surgical history with advanced age — evaluate for post-surgical complications during physical exertion");
  }

  const recordDefaults = NATIONALITY_RECORD_STATUS[person.nationality || ""] || { nationalRecords: "unavailable" as const, partnerCountryData: "unavailable" as const };

  const healthRecordStatus: HealthAnalysis["healthRecordStatus"] = {
    nationalRecords: recordDefaults.nationalRecords,
    partnerCountryData: recordDefaults.partnerCountryData,
    wifiCallingCapable: person.battery > 15 && person.isActive,
  };

  const isSupported = SUPPORTED_LANGS.includes(lang);
  const effectiveLang = isSupported ? lang : "en";

  const result: HealthAnalysis = {
    overallAssessment: translateText(overallAssessment, effectiveLang),
    riskFactors: translateArray(riskFactors, effectiveLang),
    recommendations: translateArray(recommendations, effectiveLang),
    medicationInteractions: translateArray(medicationInteractions, effectiveLang),
    heatRiskLevel,
    dehydrationRisk: translateText(dehydrationRisk, effectiveLang),
    priorityLevel,
    hajjSpecificWarnings: translateArray(hajjSpecificWarnings, effectiveLang),
    glucoseMonitoring,
    medicalHistoryInsights: {
      recentHospitalizations: historyParsed.hospitalizations,
      surgicalHistory: historyParsed.surgeries,
      allergyAlerts: historyParsed.allergies,
      recencyScore: historyParsed.recencyScore,
    },
    healthRecordStatus,
    language: effectiveLang,
    humanAgentRequired: !isSupported,
  };

  return result;
}
