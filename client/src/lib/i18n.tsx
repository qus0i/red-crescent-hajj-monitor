import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Lang = "en" | "ar";

const translations: Record<string, Record<Lang, string>> = {
  "Red Crescent": { en: "Red Crescent", ar: "الهلال الأحمر" },
  "Hajj Health Command Center": { en: "Hajj Health Command Center", ar: "مركز قيادة صحة الحج" },
  "Overview": { en: "Overview", ar: "نظرة عامة" },
  "Personnel": { en: "Personnel", ar: "الأفراد" },
  "Groups": { en: "Groups", ar: "المجموعات" },
  "Alerts": { en: "Alerts", ar: "التنبيهات" },
  "Analytics": { en: "Analytics", ar: "التحليلات" },
  "Register": { en: "Register", ar: "تسجيل" },
  "Search...": { en: "Search...", ar: "بحث..." },
  "LIVE": { en: "LIVE", ar: "مباشر" },
  "tracked": { en: "tracked", ar: "متتبع" },
  "Admin": { en: "Admin", ar: "المسؤول" },
  "Logout": { en: "Logout", ar: "خروج" },
  "Sign In": { en: "Sign In", ar: "تسجيل الدخول" },
  "Command Center": { en: "Command Center", ar: "مركز القيادة" },

  "Operator Login": { en: "Operator Login", ar: "تسجيل دخول المشغل" },
  "Username": { en: "Username", ar: "اسم المستخدم" },
  "Password": { en: "Password", ar: "كلمة المرور" },
  "Access Dashboard": { en: "Access Dashboard", ar: "الدخول للوحة التحكم" },
  "Live Vitals": { en: "Live Vitals", ar: "العلامات الحيوية المباشرة" },
  "AI Risk Scoring": { en: "AI Risk Scoring", ar: "تقييم المخاطر بالذكاء الاصطناعي" },
  "GPS Tracking": { en: "GPS Tracking", ar: "تتبع GPS" },
  "Kingdom of Saudi Arabia - Ministry of Health": { en: "Kingdom of Saudi Arabia - Ministry of Health", ar: "المملكة العربية السعودية - وزارة الصحة" },
  "Real-time pilgrimage health monitoring across all holy sites. AI-powered risk assessment, vital sign tracking, and emergency response coordination for millions of pilgrims.": {
    en: "Real-time pilgrimage health monitoring across all holy sites. AI-powered risk assessment, vital sign tracking, and emergency response coordination for millions of pilgrims.",
    ar: "مراقبة صحية فورية للحجاج عبر جميع المشاعر المقدسة. تقييم المخاطر بالذكاء الاصطناعي، وتتبع العلامات الحيوية، وتنسيق الاستجابة الطارئة لملايين الحجاج."
  },

  "Health API": { en: "Health API", ar: "واجهة الصحة" },
  "GPS Stream": { en: "GPS Stream", ar: "بث GPS" },
  "Vitals DB": { en: "Vitals DB", ar: "قاعدة العلامات الحيوية" },
  "Analytics Engine": { en: "Analytics Engine", ar: "محرك التحليلات" },
  "Edge Computing": { en: "Edge Computing", ar: "الحوسبة الطرفية" },
  "Online": { en: "Online", ar: "متصل" },
  "Syncing": { en: "Syncing", ar: "مزامنة" },
  "Offline": { en: "Offline", ar: "غير متصل" },
  "Uptime": { en: "Uptime", ar: "وقت التشغيل" },
  "Last sync": { en: "Last sync", ar: "آخر مزامنة" },

  "Name": { en: "Name", ar: "الاسم" },
  "Role": { en: "Role", ar: "الدور" },
  "Status": { en: "Status", ar: "الحالة" },
  "Zone": { en: "Zone", ar: "المنطقة" },
  "HR": { en: "HR", ar: "نبض" },
  "SpO2": { en: "SpO2", ar: "أكسجين" },
  "Temp": { en: "Temp", ar: "حرارة" },
  "Risk": { en: "Risk", ar: "خطر" },
  "Battery": { en: "Battery", ar: "البطارية" },
  "All Status": { en: "All Status", ar: "كل الحالات" },
  "Normal": { en: "Normal", ar: "طبيعي" },
  "Warning": { en: "Warning", ar: "تحذير" },
  "Critical": { en: "Critical", ar: "حرج" },
  "All Roles": { en: "All Roles", ar: "كل الأدوار" },
  "Pilgrims": { en: "Pilgrims", ar: "الحجاج" },
  "Paramedics": { en: "Paramedics", ar: "المسعفون" },
  "Doctors": { en: "Doctors", ar: "الأطباء" },
  "Nurses": { en: "Nurses", ar: "الممرضون" },
  "All Zones": { en: "All Zones", ar: "كل المناطق" },
  "AI Suggestion": { en: "AI Suggestion", ar: "اقتراح الذكاء الاصطناعي" },
  "results": { en: "results", ar: "نتيجة" },
  "Prev": { en: "Prev", ar: "السابق" },
  "Next": { en: "Next", ar: "التالي" },
  "Page": { en: "Page", ar: "صفحة" },
  "of": { en: "of", ar: "من" },
  "Search name or ID...": { en: "Search name or ID...", ar: "بحث بالاسم أو الرقم..." },

  "Pilgrim": { en: "Pilgrim", ar: "حاج" },
  "Paramedic": { en: "Paramedic", ar: "مسعف" },
  "Doctor": { en: "Doctor", ar: "طبيب" },
  "Nurse": { en: "Nurse", ar: "ممرض" },
  "ok": { en: "Normal", ar: "طبيعي" },
  "warning": { en: "Warning", ar: "تحذير" },
  "critical": { en: "Critical", ar: "حرج" },

  "Heart Rate": { en: "Heart Rate", ar: "معدل النبض" },
  "SpO2 Oxygen": { en: "SpO2 Oxygen", ar: "أكسجين الدم" },
  "Temperature": { en: "Temperature", ar: "درجة الحرارة" },
  "Blood Pressure": { en: "Blood Pressure", ar: "ضغط الدم" },
  "Steps Today": { en: "Steps Today", ar: "الخطوات اليوم" },
  "Device Battery": { en: "Device Battery", ar: "بطارية الجهاز" },
  "BPM": { en: "BPM", ar: "نبضة/دقيقة" },

  "Medical Profile": { en: "Medical Profile", ar: "الملف الطبي" },
  "AI Health Analysis": { en: "AI Health Analysis", ar: "تحليل الصحة بالذكاء الاصطناعي" },
  "Nearest Medical Responders": { en: "Nearest Medical Responders", ar: "أقرب المستجيبين الطبيين" },
  "Quick Actions": { en: "Quick Actions", ar: "إجراءات سريعة" },
  "Heart Rate Trend": { en: "Heart Rate Trend", ar: "اتجاه معدل النبض" },
  "Health Risk Score": { en: "Health Risk Score", ar: "درجة المخاطر الصحية" },
  "Heat Risk": { en: "Heat Risk", ar: "خطر الحرارة" },
  "Dehydration": { en: "Dehydration", ar: "الجفاف" },
  "Risk Factors": { en: "Risk Factors", ar: "عوامل الخطر" },
  "Recommendations": { en: "Recommendations", ar: "التوصيات" },
  "Conditions": { en: "Conditions", ar: "الحالات" },
  "Medications": { en: "Medications", ar: "الأدوية" },
  "History": { en: "History", ar: "التاريخ الطبي" },
  "Nationality": { en: "Nationality", ar: "الجنسية" },
  "Address": { en: "Address", ar: "العنوان" },
  "Emergency Contact": { en: "Emergency Contact", ar: "جهة اتصال الطوارئ" },
  "Medication Alerts": { en: "Medication Alerts", ar: "تنبيهات الأدوية" },
  "Hajj Specific Warnings": { en: "Hajj Specific Warnings", ar: "تحذيرات خاصة بالحج" },

  "Dispatch": { en: "Dispatch", ar: "إرسال" },
  "AED Drone": { en: "AED Drone", ar: "طائرة إنعاش" },
  "Medical Evacuation": { en: "Medical Evacuation", ar: "إخلاء طبي" },
  "Stream Vitals": { en: "Stream Vitals", ar: "بث العلامات الحيوية" },
  "Wellness Check": { en: "Wellness Check", ar: "فحص صحي" },
  "Dispatch Paramedic": { en: "Dispatch Paramedic", ar: "إرسال مسعف" },
  "Emergency Contact Action": { en: "Emergency Contact", ar: "اتصال طوارئ" },
  "Med-Evac": { en: "Med-Evac", ar: "إخلاء طبي" },
  "Share Vitals": { en: "Share Vitals", ar: "مشاركة العلامات الحيوية" },
  "Boost Sensor": { en: "Boost Sensor", ar: "تعزيز المستشعر" },
  "Request Wellness Check": { en: "Request Wellness Check", ar: "طلب فحص صحي" },

  "Select a person to view details": { en: "Select a person to view details", ar: "اختر شخصاً لعرض التفاصيل" },
  "Click on a row in the table or a marker on the map": { en: "Click on a row in the table or a marker on the map", ar: "انقر على صف في الجدول أو علامة على الخريطة" },

  "AI Dispatch Recommendation": { en: "AI Dispatch Recommendation", ar: "توصية إرسال الذكاء الاصطناعي" },
  "Automated responder analysis and deployment plan": { en: "Automated responder analysis and deployment plan", ar: "تحليل المستجيبين وخطة النشر الآلية" },
  "cases analyzed": { en: "cases analyzed", ar: "حالة تم تحليلها" },
  "CRITICAL": { en: "CRITICAL", ar: "حرج" },
  "HIGH": { en: "HIGH", ar: "عالي" },
  "MODERATE": { en: "MODERATE", ar: "متوسط" },
  "Dispatch All": { en: "Dispatch All", ar: "إرسال الكل" },
  "DISPATCH": { en: "DISPATCH", ar: "إرسال" },
  "SENT": { en: "SENT", ar: "تم الإرسال" },
  "RECOMMENDED": { en: "RECOMMENDED", ar: "موصى به" },
  "No personnel require dispatch": { en: "No personnel require dispatch", ar: "لا يوجد أفراد بحاجة إلى إرسال" },
  "All filtered personnel are within normal parameters": { en: "All filtered personnel are within normal parameters", ar: "جميع الأفراد المفلترين ضمن المعايير الطبيعية" },
  "Nearest Responders": { en: "Nearest Responders", ar: "أقرب المستجيبين" },
  "No responders found in range": { en: "No responders found in range", ar: "لم يتم العثور على مستجيبين في النطاق" },

  "Register New Person": { en: "Register New Person", ar: "تسجيل شخص جديد" },
  "Add a pilgrim or medical staff member to the tracking system": { en: "Add a pilgrim or medical staff member to the tracking system", ar: "إضافة حاج أو عضو طاقم طبي إلى نظام التتبع" },
  "Add a pilgrim or medical staff member": { en: "Add a pilgrim or medical staff member and assign their watch device", ar: "إضافة حاج أو عضو طاقم طبي وتعيين جهاز ساعة" },
  "Watch ID / Device Serial": { en: "Watch ID / Device Serial", ar: "رقم الساعة / الرقم التسلسلي" },
  "Full Name": { en: "Full Name", ar: "الاسم الكامل" },
  "Age": { en: "Age", ar: "العمر" },
  "Gender": { en: "Gender", ar: "الجنس" },
  "Blood Type": { en: "Blood Type", ar: "فصيلة الدم" },
  "Pilgrim Group": { en: "Pilgrim Group", ar: "مجموعة الحجاج" },
  "Initial Zone": { en: "Initial Zone", ar: "المنطقة الأولية" },
  "Home Address": { en: "Home Address", ar: "عنوان السكن" },
  "Current Conditions": { en: "Current Conditions", ar: "الحالات الحالية" },
  "Medical History": { en: "Medical History", ar: "التاريخ الطبي" },
  "Clear Form": { en: "Clear Form", ar: "مسح النموذج" },
  "Register Person": { en: "Register Person", ar: "تسجيل الشخص" },
  "Male": { en: "Male", ar: "ذكر" },
  "Female": { en: "Female", ar: "أنثى" },
  "Select group": { en: "Select group", ar: "اختر مجموعة" },
  "Select zone": { en: "Select zone", ar: "اختر منطقة" },

  "Group Management": { en: "Group Management", ar: "إدارة المجموعات" },
  "Total Personnel": { en: "Total Personnel", ar: "إجمالي الأفراد" },
  "Active Now": { en: "Active Now", ar: "نشط الآن" },
  "Critical Cases": { en: "Critical Cases", ar: "حالات حرجة" },
  "Warning Cases": { en: "Warning Cases", ar: "حالات تحذيرية" },
  "Active Alerts": { en: "Active Alerts", ar: "تنبيهات نشطة" },
  "Pilgrim Groups": { en: "Pilgrim Groups", ar: "مجموعات الحجاج" },
  "Avg Heart Rate": { en: "Avg Heart Rate", ar: "متوسط النبض" },
  "Avg SpO2": { en: "Avg SpO2", ar: "متوسط الأكسجين" },

  "Admin Portal": { en: "Admin Portal", ar: "بوابة المسؤول" },
  "Red Crescent System Administration": { en: "Red Crescent System Administration", ar: "إدارة نظام الهلال الأحمر" },
  "Dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "System & Infrastructure": { en: "System & Infrastructure", ar: "النظام والبنية التحتية" },
  "Personnel & Health": { en: "Personnel & Health", ar: "الأفراد والصحة" },
  "Operations & Alerts": { en: "Operations & Alerts", ar: "العمليات والتنبيهات" },
  "Configuration & AI": { en: "Configuration & AI", ar: "الإعدادات والذكاء الاصطناعي" },

  "Live Track": { en: "Live Track", ar: "تتبع مباشر" },
  "Heatmap": { en: "Heatmap", ar: "خريطة حرارية" },
  "Zones": { en: "Zones", ar: "المناطق" },
  "Satellite": { en: "Satellite", ar: "قمر صناعي" },
  "AI Health Insight": { en: "AI Health Insight", ar: "رؤية صحية بالذكاء الاصطناعي" },
  "active": { en: "active", ar: "نشط" },

  "ACTIVE": { en: "ACTIVE", ar: "نشط" },
  "ALL CLEAR": { en: "ALL CLEAR", ar: "كل شيء طبيعي" },
  "No active alerts": { en: "No active alerts", ar: "لا توجد تنبيهات نشطة" },
  "Acknowledge": { en: "Acknowledge", ar: "تأكيد" },
  "Acknowledge All": { en: "Acknowledge All", ar: "تأكيد الكل" },
  "All Types": { en: "All Types", ar: "كل الأنواع" },
  "Critical Only": { en: "Critical Only", ar: "الحرجة فقط" },
  "Warning Only": { en: "Warning Only", ar: "التحذيرية فقط" },
  "Pending Only": { en: "Pending Only", ar: "المعلقة فقط" },

  "Personnel ID": { en: "Personnel ID", ar: "رقم الفرد" },
  "Monitoring": { en: "Monitoring", ar: "مراقبة" },
  "active individuals": { en: "active individuals", ar: "فرد نشط" },

  "Pilgrim Tracking": { en: "Pilgrim Tracking", ar: "تتبع الحجاج" },
  "pilgrims tracked live": { en: "pilgrims tracked live", ar: "حاج يتم تتبعهم مباشرة" },
  "AI Health Intelligence": { en: "AI Health Intelligence", ar: "ذكاء صحي اصطناعي" },
  "Vital Sign Monitoring": { en: "Vital Sign Monitoring", ar: "مراقبة العلامات الحيوية" },
  "Heart Rate & SpO2 Trends — 24h": { en: "Heart Rate & SpO2 Trends — 24h", ar: "اتجاهات النبض والأكسجين — 24 ساعة" },
  "AI Risk Engine": { en: "AI Risk Engine", ar: "محرك مخاطر الذكاء الاصطناعي" },
  "Responder Dispatch": { en: "Responder Dispatch", ar: "إرسال المستجيبين" },

  "personnel tracked": { en: "personnel tracked", ar: "فرد يتم تتبعه" },
  "FALL DETECTED": { en: "FALL DETECTED", ar: "تم اكتشاف سقوط" },
  "Immediate medical review required": { en: "Immediate medical review required", ar: "مطلوب مراجعة طبية فورية" },
  "Acknowledged": { en: "Acknowledged", ar: "تم التأكيد" },
  "Duration": { en: "Duration", ar: "المدة" },

  "Zone Severity": { en: "Zone Severity", ar: "شدة المنطقة" },
  "Business Intelligence": { en: "Business Intelligence", ar: "ذكاء الأعمال" },
  "Operations": { en: "Operations", ar: "العمليات" },
  "Health Issues": { en: "Health Issues", ar: "المشاكل الصحية" },
  "Staff Coverage": { en: "Staff Coverage", ar: "تغطية الطاقم" },
  "Response Time by Zone": { en: "Response Time by Zone", ar: "وقت الاستجابة حسب المنطقة" },
  "Case Categorization": { en: "Case Categorization", ar: "تصنيف الحالات" },
  "Age Distribution & Risk": { en: "Age Distribution & Risk", ar: "توزيع العمر والمخاطر" },
  "Top Medications": { en: "Top Medications", ar: "أكثر الأدوية استخداماً" },
  "Conditions by Zone": { en: "Conditions by Zone", ar: "الحالات حسب المنطقة" },
  "Health Issue Breakdown": { en: "Health Issue Breakdown", ar: "تفصيل المشاكل الصحية" },
  "Staff-to-Patient Ratio by Zone": { en: "Staff-to-Patient Ratio by Zone", ar: "نسبة الطاقم للمرضى حسب المنطقة" },
  "Staff Distribution": { en: "Staff Distribution", ar: "توزيع الطاقم" },
  "Alert Statistics": { en: "Alert Statistics", ar: "إحصائيات التنبيهات" },
  "Total Alerts": { en: "Total Alerts", ar: "إجمالي التنبيهات" },
  "Alert Age by Zone": { en: "Alert Age by Zone", ar: "عمر التنبيهات حسب المنطقة" },
  "Ratio": { en: "Ratio", ar: "النسبة" },
  "Coverage": { en: "Coverage", ar: "التغطية" },
  "Staff": { en: "Staff", ar: "الطاقم" },

  "Glucose Monitoring": { en: "Glucose Monitoring", ar: "مراقبة السكر" },
  "Medical History Insights": { en: "Medical History Insights", ar: "رؤى التاريخ الطبي" },
  "Health Records": { en: "Health Records", ar: "السجلات الصحية" },
  "National Records": { en: "National Records", ar: "السجلات الوطنية" },
  "Partner Data": { en: "Partner Data", ar: "بيانات الشريك" },
  "WiFi Calling": { en: "WiFi Calling", ar: "اتصال WiFi" },
  "Language not fully supported. Human agent routing recommended.": { en: "Language not fully supported. Human agent routing recommended.", ar: "اللغة غير مدعومة بالكامل. يُوصى بتوجيه لوكيل بشري." },

  outboundTickets: { en: "Outbound Tickets", ar: "بطاقات الإرسال" },
  newTicket: { en: "New Ticket", ar: "بطاقة جديدة" },
  editTicket: { en: "Edit Ticket", ar: "تعديل البطاقة" },
  ticketTitle: { en: "Title", ar: "العنوان" },
  callerName: { en: "Caller Name", ar: "اسم المتصل" },
  callerContact: { en: "Caller Contact", ar: "رقم المتصل" },
  description: { en: "Description", ar: "الوصف" },
  notes: { en: "Notes", ar: "ملاحظات" },
  priority: { en: "Priority", ar: "الأولوية" },
  zone: { en: "Zone", ar: "المنطقة" },
  saveChanges: { en: "Save Changes", ar: "حفظ التغييرات" },
  createTicket: { en: "Create Ticket", ar: "إنشاء بطاقة" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  saving: { en: "Saving...", ar: "جاري الحفظ..." },
  close: { en: "Close", ar: "إغلاق" },
  delete: { en: "Delete", ar: "حذف" },
  edit: { en: "Edit", ar: "تعديل" },
  attachments: { en: "Attachments", ar: "المرفقات" },
  audioRecording: { en: "Audio Recording", ar: "التسجيل الصوتي" },
  transcriptFile: { en: "Transcript File", ar: "ملف النص" },
  transcriptText: { en: "Transcript Text", ar: "نص التسجيل" },
  moveToColumn: { en: "Move to column", ar: "نقل إلى عمود" },
  created: { en: "Created", ar: "أنشئ" },
  Tickets: { en: "Tickets", ar: "البطاقات" },
};

interface I18nContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  toggleLang: () => {},
  t: (key: string) => key,
  dir: "ltr",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    return saved === "ar" ? "ar" : "en";
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === "en" ? "ar" : "en";
      localStorage.setItem("app-lang", next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      if (entry) return entry[lang];
      return key;
    },
    [lang]
  );

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
