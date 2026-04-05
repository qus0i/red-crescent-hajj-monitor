import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { insertGroupSchema, insertPersonnelSchema, insertAlertSchema, insertTicketSchema, insertLeadSchema, insertLeadCallSchema, insertWatchSchema, insertWatchReadingSchema, insertWebhookConfigSchema, type WatchReading, type Personnel } from "@shared/schema";
import { generateHealthAnalysis } from "./ai-health";
import { requireAuth } from "./auth";

type VitalStatus = "ok" | "warning" | "critical";

function classifyReading(r: Partial<WatchReading>): { status: VitalStatus; triggers: string[] } {
  const triggers: string[] = [];
  let status: VitalStatus = "ok";
  const warn = (msg: string) => { triggers.push(msg); if (status === "ok") status = "warning"; };
  const crit = (msg: string) => { triggers.push(msg); status = "critical"; };

  if (r.heartRate != null) {
    if (r.heartRate > 150 || r.heartRate < 50) crit(`HR ${r.heartRate} bpm`);
    else if (r.heartRate > 100 || r.heartRate < 60) warn(`HR ${r.heartRate} bpm`);
  }
  if (r.bloodSugar != null) {
    if (r.bloodSugar < 70 || r.bloodSugar > 250) crit(`Blood glucose ${r.bloodSugar} mg/dL`);
    else if (r.bloodSugar < 80 || r.bloodSugar > 180) warn(`Blood glucose ${r.bloodSugar} mg/dL`);
  }
  if (r.spo2 != null) {
    if (r.spo2 < 90) crit(`SpO₂ ${r.spo2}%`);
    else if (r.spo2 < 95) warn(`SpO₂ ${r.spo2}%`);
  }
  if (r.temperature != null) {
    if (r.temperature > 39 || r.temperature < 35) crit(`Temp ${r.temperature}°C`);
    else if (r.temperature > 38 || r.temperature < 36) warn(`Temp ${r.temperature}°C`);
  }
  if (r.systolic != null) {
    if (r.systolic > 180 || r.systolic < 80) crit(`BP ${r.systolic}/${r.diastolic}`);
    else if (r.systolic > 140 || r.systolic < 90) warn(`BP ${r.systolic}/${r.diastolic}`);
  }
  if (r.respirationRate != null) {
    if (r.respirationRate > 30 || r.respirationRate < 10) crit(`RR ${r.respirationRate}/min`);
    else if (r.respirationRate > 20) warn(`RR ${r.respirationRate}/min`);
  }
  if (r.stressLevel != null) {
    if (r.stressLevel > 85) crit(`Stress ${r.stressLevel}/100`);
    else if (r.stressLevel > 65) warn(`Stress ${r.stressLevel}/100`);
  }
  if (r.fallDetected) crit("Fall detected");
  return { status, triggers };
}

async function fireWebhooks(
  reading: WatchReading,
  watchId: string,
  model: string,
  person: Personnel | null,
  status: VitalStatus,
  triggers: string[]
) {
  const configs = await storage.getWebhookConfigs();
  const active = configs.filter((c) => {
    if (!c.isActive) return false;
    if (status === "critical" && c.triggerOnCritical) return true;
    if (status === "warning" && c.triggerOnWarning) return true;
    if (reading.fallDetected && c.triggerOnFall) return true;
    return false;
  });

  const payload = {
    event: "vitals_alert",
    severity: status,
    watchId,
    model,
    timestamp: reading.recordedAt,
    person: person ? { id: person.id, name: person.name, age: person.age, zone: person.zone, bloodType: person.bloodType } : null,
    vitals: {
      heartRate: reading.heartRate,
      bloodSugar: reading.bloodSugar,
      spo2: reading.spo2,
      temperature: reading.temperature,
      respirationRate: reading.respirationRate,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      stressLevel: reading.stressLevel,
      fallDetected: reading.fallDetected,
    },
    triggers,
  };

  for (const cfg of active) {
    try {
      await fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      await storage.updateWebhookConfig(cfg.id, { lastTriggered: new Date() });
    } catch (_e) {}
  }
}

const uploadDir = path.resolve("public/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage: diskStorage, limits: { fileSize: 100 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth/")) return next();
    requireAuth(req, res, next);
  });

  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/analytics", async (_req, res) => {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
  });

  app.get("/api/analytics/bi", async (_req, res) => {
    const bi = await storage.getBIAnalytics();
    res.json(bi);
  });

  app.get("/api/groups", async (_req, res) => {
    const groups = await storage.getGroups();
    res.json(groups);
  });

  app.get("/api/groups/:id", async (req, res) => {
    const group = await storage.getGroup(parseInt(req.params.id));
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.post("/api/groups", async (req, res) => {
    const parsed = insertGroupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const group = await storage.createGroup(parsed.data);
    res.status(201).json(group);
  });

  app.patch("/api/groups/:id", async (req, res) => {
    const parsed = insertGroupSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const group = await storage.updateGroup(parseInt(req.params.id), parsed.data);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  });

  app.delete("/api/groups/:id", async (req, res) => {
    await storage.deleteGroup(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/personnel", async (req, res) => {
    const { groupId, status, search, role, limit, offset } = req.query;
    const result = await storage.getPersonnel({
      groupId: groupId ? parseInt(groupId as string) : undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      role: role as string | undefined,
      limit: limit ? parseInt(limit as string) : 1000,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(result);
  });

  app.get("/api/personnel/:id", async (req, res) => {
    const p = await storage.getPersonnelById(parseInt(req.params.id));
    if (!p) return res.status(404).json({ message: "Personnel not found" });
    res.json(p);
  });

  app.get("/api/personnel/:id/health-analysis", async (req, res) => {
    const p = await storage.getPersonnelById(parseInt(req.params.id));
    if (!p) return res.status(404).json({ message: "Personnel not found" });
    const lang = (req.query.lang as string) || "en";
    const analysis = generateHealthAnalysis(p, lang as any);
    res.json(analysis);
  });

  app.get("/api/personnel/:id/nearest-responders", async (req, res) => {
    const p = await storage.getPersonnelById(parseInt(req.params.id));
    if (!p) return res.status(404).json({ message: "Personnel not found" });
    if (!p.lat || !p.lng) return res.status(400).json({ message: "Personnel has no location data" });

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const responders = await storage.getNearestResponders(p.lat, p.lng, p.id, limit);
    res.json(responders);
  });

  app.post("/api/personnel", async (req, res) => {
    const parsed = insertPersonnelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const p = await storage.createPersonnel(parsed.data);
    res.status(201).json(p);
  });

  app.patch("/api/personnel/:id", async (req, res) => {
    const parsed = insertPersonnelSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const p = await storage.updatePersonnel(parseInt(req.params.id), parsed.data);
    if (!p) return res.status(404).json({ message: "Personnel not found" });
    res.json(p);
  });

  app.delete("/api/personnel/:id", async (req, res) => {
    await storage.deletePersonnel(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.get("/api/alerts", async (req, res) => {
    const { acknowledged, type, limit } = req.query;
    const alertsList = await storage.getAlerts({
      acknowledged: acknowledged !== undefined ? acknowledged === "true" : undefined,
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string) : 200,
    });
    res.json(alertsList);
  });

  app.post("/api/alerts", async (req, res) => {
    const parsed = insertAlertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const alert = await storage.createAlert(parsed.data);
    res.status(201).json(alert);
  });

  app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    const alert = await storage.acknowledgeAlert(parseInt(req.params.id));
    if (!alert) return res.status(404).json({ message: "Alert not found" });
    res.json(alert);
  });

  app.post("/api/alerts/bulk-acknowledge", async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids must be an array" });
    const count = await storage.bulkAcknowledgeAlerts(ids);
    res.json({ acknowledged: count });
  });

  // File upload
  app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });

  // Tickets CRUD
  app.get("/api/tickets", requireAuth, async (req, res) => {
    const status = req.query.status as string | undefined;
    const list = await storage.getTickets(status ? { status } : undefined);
    res.json(list);
  });

  app.get("/api/tickets/:id", requireAuth, async (req, res) => {
    const ticket = await storage.getTicket(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.post("/api/tickets", requireAuth, async (req, res) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    const autoNumber = `TKT-${dateStr}-${rand}`;
    const body = { ...req.body, ticketNumber: req.body.ticketNumber || autoNumber };
    const parsed = insertTicketSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const ticket = await storage.createTicket(parsed.data);
    res.status(201).json(ticket);
  });

  app.patch("/api/tickets/:id", requireAuth, async (req, res) => {
    const ticket = await storage.updateTicket(parseInt(req.params.id), req.body);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.delete("/api/tickets/:id", requireAuth, async (req, res) => {
    await storage.deleteTicket(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Leads CRUD
  app.get("/api/leads", requireAuth, async (_req, res) => {
    const list = await storage.getLeads();
    res.json(list);
  });

  app.get("/api/leads/:id", requireAuth, async (req, res) => {
    const lead = await storage.getLead(parseInt(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  });

  app.post("/api/leads", requireAuth, async (req, res) => {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const lead = await storage.createLead(parsed.data);
    res.status(201).json(lead);
  });

  app.patch("/api/leads/:id", requireAuth, async (req, res) => {
    const parsed = insertLeadSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const lead = await storage.updateLead(parseInt(req.params.id), parsed.data);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  });

  app.delete("/api/leads/:id", requireAuth, async (req, res) => {
    await storage.deleteLead(parseInt(req.params.id));
    res.json({ success: true });
  });

  // Lead Calls CRUD
  app.get("/api/leads/:leadId/calls", requireAuth, async (req, res) => {
    const list = await storage.getLeadCalls(parseInt(req.params.leadId));
    res.json(list);
  });

  app.post("/api/leads/:leadId/calls", requireAuth, async (req, res) => {
    const body = { ...req.body, leadId: parseInt(req.params.leadId) };
    const parsed = insertLeadCallSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const call = await storage.createLeadCall(parsed.data);
    res.status(201).json(call);
  });

  app.patch("/api/leads/:leadId/calls/:id", requireAuth, async (req, res) => {
    const callId = parseInt(req.params.id);
    const leadId = parseInt(req.params.leadId);
    const existing = await storage.getLeadCall(callId);
    if (!existing || existing.leadId !== leadId) return res.status(404).json({ message: "Call not found" });
    const { leadId: _ignored, ...body } = req.body;
    const parsed = insertLeadCallSchema.partial().safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const call = await storage.updateLeadCall(callId, parsed.data);
    res.json(call);
  });

  app.delete("/api/leads/:leadId/calls/:id", requireAuth, async (req, res) => {
    const callId = parseInt(req.params.id);
    const leadId = parseInt(req.params.leadId);
    const existing = await storage.getLeadCall(callId);
    if (!existing || existing.leadId !== leadId) return res.status(404).json({ message: "Call not found" });
    await storage.deleteLeadCall(callId);
    res.json({ success: true });
  });

  // ── Watches ──────────────────────────────────────────────────────────────
  app.get("/api/watches", async (_req, res) => {
    const list = await storage.getWatches();
    res.json(list);
  });

  app.get("/api/watches/:id", async (req, res) => {
    const w = await storage.getWatch(parseInt(req.params.id));
    if (!w) return res.status(404).json({ message: "Watch not found" });
    res.json(w);
  });

  app.get("/api/watches/:id/readings", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;
    const readings = await storage.getWatchReadings(parseInt(req.params.id), limit);
    res.json(readings);
  });

  app.post("/api/watches", async (req, res) => {
    const parsed = insertWatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const w = await storage.createWatch(parsed.data);
    res.status(201).json(w);
  });

  app.patch("/api/watches/:id", async (req, res) => {
    const parsed = insertWatchSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const w = await storage.updateWatch(parseInt(req.params.id), parsed.data);
    if (!w) return res.status(404).json({ message: "Watch not found" });
    res.json(w);
  });

  app.post("/api/watches/:id/readings", async (req, res) => {
    const watchDbId = parseInt(req.params.id);
    const parsed = insertWatchReadingSchema.safeParse({ ...req.body, watchDbId });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const reading = await storage.addWatchReading(parsed.data);
    const watch = await storage.getWatch(watchDbId);
    if (watch) {
      const { status, triggers } = classifyReading(reading);
      if (status !== "ok") {
        fireWebhooks(reading, watch.watchId, watch.model, watch.person, status, triggers).catch(() => {});
      }
    }
    res.status(201).json(reading);
  });

  // ── Webhook configs ───────────────────────────────────────────────────────
  app.get("/api/webhook-configs", async (_req, res) => {
    const list = await storage.getWebhookConfigs();
    res.json(list);
  });

  app.post("/api/webhook-configs", async (req, res) => {
    const parsed = insertWebhookConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const cfg = await storage.createWebhookConfig(parsed.data);
    res.status(201).json(cfg);
  });

  app.patch("/api/webhook-configs/:id", async (req, res) => {
    const parsed = insertWebhookConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const cfg = await storage.updateWebhookConfig(parseInt(req.params.id), parsed.data);
    if (!cfg) return res.status(404).json({ message: "Webhook config not found" });
    res.json(cfg);
  });

  app.delete("/api/webhook-configs/:id", async (req, res) => {
    await storage.deleteWebhookConfig(parseInt(req.params.id));
    res.json({ success: true });
  });

  app.post("/api/webhook-configs/:id/test", async (req, res) => {
    const cfgs = await storage.getWebhookConfigs();
    const cfg = cfgs.find((c) => c.id === parseInt(req.params.id));
    if (!cfg) return res.status(404).json({ message: "Webhook config not found" });
    const testPayload = {
      event: "test_webhook",
      severity: "critical",
      watchId: "WATCH-SA-001",
      model: "Apple Watch Ultra 2",
      timestamp: new Date(),
      person: { id: 1378, name: "Badr Al-Balawi", age: 41, zone: "Makkah - Haram", bloodType: "B-" },
      vitals: { heartRate: 153, bloodSugar: 302, spo2: 84, temperature: 39.4, respirationRate: 27, systolic: 173, diastolic: 107, stressLevel: 90, fallDetected: false },
      triggers: ["HR 153 bpm", "Blood glucose 302 mg/dL", "SpO₂ 84%", "Temp 39.4°C"],
    };
    try {
      const resp = await fetch(cfg.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8000),
      });
      await storage.updateWebhookConfig(cfg.id, { lastTriggered: new Date() });
      res.json({ success: true, status: resp.status });
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });

  return httpServer;
}
