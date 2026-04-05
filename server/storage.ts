import { eq, like, desc, asc, and, sql, count, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users, groups, personnel, alerts, tickets, leads, leadCalls,
  watches, watchReadings, webhookConfigs,
  type User, type InsertUser,
  type Group, type InsertGroup,
  type Personnel, type InsertPersonnel,
  type Alert, type InsertAlert,
  type Ticket, type InsertTicket,
  type Lead, type InsertLead,
  type LeadCall, type InsertLeadCall,
  type Watch, type InsertWatch,
  type WatchReading, type InsertWatchReading,
  type WebhookConfig, type InsertWebhookConfig,
} from "@shared/schema";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;

  getPersonnel(opts?: { groupId?: number; status?: string; search?: string; role?: string; limit?: number; offset?: number }): Promise<{ data: Personnel[]; total: number }>;
  getPersonnelById(id: number): Promise<Personnel | undefined>;
  createPersonnel(p: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: number, p: Partial<InsertPersonnel>): Promise<Personnel | undefined>;
  deletePersonnel(id: number): Promise<boolean>;

  getAlerts(opts?: { acknowledged?: boolean; type?: string; limit?: number }): Promise<Alert[]>;
  createAlert(a: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: number): Promise<Alert | undefined>;
  bulkAcknowledgeAlerts(ids: number[]): Promise<number>;

  getNearestResponders(lat: number, lng: number, excludeId?: number, limit?: number): Promise<(Personnel & { distance: number })[]>;
  getAnalytics(): Promise<{
    zoneStats: { zone: string; total: number; ok: number; warning: number; critical: number; avgRisk: number; avgHr: number; avgTemp: number }[];
    roleDistribution: { role: string; count: number }[];
    riskDistribution: { range: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
    alertStats: { total: number; critical: number; warning: number; acknowledged: number; unacknowledged: number };
    topCritical: Personnel[];
  }>;

  getStats(): Promise<{
    total: number;
    active: number;
    ok: number;
    warning: number;
    critical: number;
    groupCount: number;
  }>;

  getTickets(opts?: { status?: string }): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(t: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, t: Partial<InsertTicket>): Promise<Ticket | undefined>;
  deleteTicket(id: number): Promise<boolean>;

  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(l: InsertLead): Promise<Lead>;
  updateLead(id: number, l: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;

  getLeadCalls(leadId: number): Promise<LeadCall[]>;
  getLeadCall(id: number): Promise<LeadCall | undefined>;
  createLeadCall(c: InsertLeadCall): Promise<LeadCall>;
  updateLeadCall(id: number, c: Partial<InsertLeadCall>): Promise<LeadCall | undefined>;
  deleteLeadCall(id: number): Promise<boolean>;

  getWatches(): Promise<(Watch & { person: Personnel | null; latestReading: WatchReading | null })[]>;
  getWatch(id: number): Promise<(Watch & { person: Personnel | null; latestReading: WatchReading | null }) | undefined>;
  createWatch(w: InsertWatch): Promise<Watch>;
  updateWatch(id: number, w: Partial<InsertWatch>): Promise<Watch | undefined>;
  deleteWatch(id: number): Promise<boolean>;
  getWatchReadings(watchDbId: number, limit?: number): Promise<WatchReading[]>;
  addWatchReading(r: InsertWatchReading): Promise<WatchReading>;

  getWebhookConfigs(): Promise<WebhookConfig[]>;
  createWebhookConfig(w: InsertWebhookConfig): Promise<WebhookConfig>;
  updateWebhookConfig(id: number, w: Partial<InsertWebhookConfig & { lastTriggered: Date }>): Promise<WebhookConfig | undefined>;
  deleteWebhookConfig(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getGroups(): Promise<Group[]> {
    return db.select().from(groups).orderBy(asc(groups.name));
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    return created;
  }

  async updateGroup(id: number, data: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updated] = await db.update(groups).set(data).where(eq(groups.id, id)).returning();
    return updated;
  }

  async deleteGroup(id: number): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id));
    return true;
  }

  async getPersonnel(opts?: { groupId?: number; status?: string; search?: string; role?: string; limit?: number; offset?: number }): Promise<{ data: Personnel[]; total: number }> {
    const conditions = [];
    if (opts?.groupId) conditions.push(eq(personnel.groupId, opts.groupId));
    if (opts?.status) conditions.push(eq(personnel.status, opts.status));
    if (opts?.search) conditions.push(like(personnel.name, `%${opts.search}%`));
    if (opts?.role) conditions.push(eq(personnel.role, opts.role));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: count() }).from(personnel).where(where);
    const total = totalResult?.count ?? 0;

    let query = db.select().from(personnel).where(where).orderBy(
      desc(sql`CASE WHEN ${personnel.status} = 'critical' THEN 0 WHEN ${personnel.status} = 'warning' THEN 1 ELSE 2 END`),
      asc(personnel.name)
    );

    if (opts?.limit) {
      query = query.limit(opts.limit) as any;
    }
    if (opts?.offset) {
      query = query.offset(opts.offset) as any;
    }

    const data = await query;
    return { data, total };
  }

  async getPersonnelById(id: number): Promise<Personnel | undefined> {
    const [p] = await db.select().from(personnel).where(eq(personnel.id, id));
    return p;
  }

  async createPersonnel(p: InsertPersonnel): Promise<Personnel> {
    const [created] = await db.insert(personnel).values(p).returning();
    return created;
  }

  async updatePersonnel(id: number, data: Partial<InsertPersonnel>): Promise<Personnel | undefined> {
    const [updated] = await db.update(personnel).set({ ...data, lastUpdated: new Date() }).where(eq(personnel.id, id)).returning();
    return updated;
  }

  async deletePersonnel(id: number): Promise<boolean> {
    await db.delete(personnel).where(eq(personnel.id, id));
    return true;
  }

  async getAlerts(opts?: { acknowledged?: boolean; type?: string; limit?: number }): Promise<Alert[]> {
    const conditions = [];
    if (opts?.acknowledged !== undefined) conditions.push(eq(alerts.acknowledged, opts.acknowledged));
    if (opts?.type) conditions.push(eq(alerts.type, opts.type));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    let query = db.select().from(alerts).where(where).orderBy(desc(alerts.createdAt));

    if (opts?.limit) {
      query = query.limit(opts.limit) as any;
    }

    return query;
  }

  async createAlert(a: InsertAlert): Promise<Alert> {
    const [created] = await db.insert(alerts).values(a).returning();
    return created;
  }

  async acknowledgeAlert(id: number): Promise<Alert | undefined> {
    const [updated] = await db.update(alerts).set({ acknowledged: true }).where(eq(alerts.id, id)).returning();
    return updated;
  }

  async bulkAcknowledgeAlerts(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.update(alerts)
      .set({ acknowledged: true })
      .where(and(
        sql`${alerts.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`,
        eq(alerts.acknowledged, false)
      ))
      .returning();
    return result.length;
  }

  async getNearestResponders(lat: number, lng: number, excludeId?: number, limit: number = 5): Promise<(Personnel & { distance: number })[]> {
    const haversine = sql<number>`
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(${personnel.lat} - ${lat}) / 2), 2) +
        COS(RADIANS(${lat})) * COS(RADIANS(${personnel.lat})) *
        POWER(SIN(RADIANS(${personnel.lng} - ${lng}) / 2), 2)
      ))
    `;

    const conditions = [
      ne(personnel.role, "pilgrim"),
      eq(personnel.isActive, true),
      sql`${personnel.lat} IS NOT NULL`,
      sql`${personnel.lng} IS NOT NULL`,
    ];
    if (excludeId) conditions.push(ne(personnel.id, excludeId));

    const results = await db
      .select({
        id: personnel.id,
        externalId: personnel.externalId,
        name: personnel.name,
        age: personnel.age,
        gender: personnel.gender,
        bloodType: personnel.bloodType,
        groupId: personnel.groupId,
        zone: personnel.zone,
        lat: personnel.lat,
        lng: personnel.lng,
        status: personnel.status,
        hr: personnel.hr,
        spo2: personnel.spo2,
        temp: personnel.temp,
        bp: personnel.bp,
        steps: personnel.steps,
        battery: personnel.battery,
        fallDetected: personnel.fallDetected,
        riskScore: personnel.riskScore,
        role: personnel.role,
        shiftHours: personnel.shiftHours,
        isActive: personnel.isActive,
        medicalHistory: personnel.medicalHistory,
        medications: personnel.medications,
        illnesses: personnel.illnesses,
        address: personnel.address,
        emergencyContact: personnel.emergencyContact,
        nationality: personnel.nationality,
        lastUpdated: personnel.lastUpdated,
        distance: haversine,
      })
      .from(personnel)
      .where(and(...conditions))
      .orderBy(haversine)
      .limit(limit);

    return results as (Personnel & { distance: number })[];
  }

  async getAnalytics(): Promise<{
    zoneStats: { zone: string; total: number; ok: number; warning: number; critical: number; avgRisk: number; avgHr: number; avgTemp: number }[];
    roleDistribution: { role: string; count: number }[];
    riskDistribution: { range: string; count: number }[];
    statusBreakdown: { status: string; count: number }[];
    alertStats: { total: number; critical: number; warning: number; acknowledged: number; unacknowledged: number };
    topCritical: Personnel[];
  }> {
    const zoneStats = await db.execute(sql`
      SELECT
        zone,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'ok')::int as ok,
        COUNT(*) FILTER (WHERE status = 'warning')::int as warning,
        COUNT(*) FILTER (WHERE status = 'critical')::int as critical,
        ROUND(AVG(risk_score)::numeric, 1)::float as "avgRisk",
        ROUND(AVG(hr)::numeric, 1)::float as "avgHr",
        ROUND(AVG(temp)::numeric, 1)::float as "avgTemp"
      FROM personnel
      WHERE zone IS NOT NULL
      GROUP BY zone
      ORDER BY total DESC
    `);

    const roleDistribution = await db.execute(sql`
      SELECT role, COUNT(*)::int as count
      FROM personnel
      GROUP BY role
      ORDER BY count DESC
    `);

    const riskDistribution = await db.execute(sql`
      SELECT
        CASE
          WHEN risk_score <= 20 THEN '0-20 Low'
          WHEN risk_score <= 40 THEN '21-40 Mild'
          WHEN risk_score <= 60 THEN '41-60 Moderate'
          WHEN risk_score <= 80 THEN '61-80 High'
          ELSE '81-100 Critical'
        END as range,
        COUNT(*)::int as count
      FROM personnel
      GROUP BY range
      ORDER BY range
    `);

    const statusBreakdown = await db.execute(sql`
      SELECT status, COUNT(*)::int as count
      FROM personnel
      GROUP BY status
    `);

    const alertStatsResult = await db.execute(sql`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE type = 'critical')::int as critical,
        COUNT(*) FILTER (WHERE type = 'warning')::int as warning,
        COUNT(*) FILTER (WHERE acknowledged = true)::int as acknowledged,
        COUNT(*) FILTER (WHERE acknowledged = false)::int as unacknowledged
      FROM alerts
    `);

    const topCritical = await db.select().from(personnel)
      .where(eq(personnel.status, "critical"))
      .orderBy(desc(personnel.riskScore))
      .limit(10);

    return {
      zoneStats: zoneStats.rows as any,
      roleDistribution: roleDistribution.rows as any,
      riskDistribution: riskDistribution.rows as any,
      statusBreakdown: statusBreakdown.rows as any,
      alertStats: (alertStatsResult.rows[0] || { total: 0, critical: 0, warning: 0, acknowledged: 0, unacknowledged: 0 }) as any,
      topCritical,
    };
  }

  async getBIAnalytics(): Promise<{
    conditionBreakdown: { condition: string; count: number; criticalCount: number }[];
    ageDistribution: { range: string; count: number; criticalCount: number }[];
    medicationUsage: { medication: string; count: number }[];
    staffCoverage: { zone: string; pilgrims: number; staff: number; ratio: string; gap: string }[];
    responseMetrics: { zone: string; avgAckTimeMin: number; pendingAlerts: number }[];
    conditionsByZone: { zone: string; conditions: Record<string, number> }[];
  }> {
    const allPersonnel = await db.select().from(personnel);

    const conditionMap = new Map<string, { count: number; criticalCount: number }>();
    const medMap = new Map<string, number>();
    const ageRanges: Record<string, { count: number; criticalCount: number }> = {
      "18-30": { count: 0, criticalCount: 0 },
      "31-45": { count: 0, criticalCount: 0 },
      "46-60": { count: 0, criticalCount: 0 },
      "61-75": { count: 0, criticalCount: 0 },
      "76+": { count: 0, criticalCount: 0 },
    };

    const zoneStaffMap = new Map<string, { pilgrims: number; staff: number }>();
    const zoneConditionMap = new Map<string, Record<string, number>>();

    for (const p of allPersonnel) {
      const age = p.age || 0;
      const range = age <= 30 ? "18-30" : age <= 45 ? "31-45" : age <= 60 ? "46-60" : age <= 75 ? "61-75" : "76+";
      if (ageRanges[range]) {
        ageRanges[range].count++;
        if (p.status === "critical") ageRanges[range].criticalCount++;
      }

      if (p.illnesses) {
        const conditions = p.illnesses.split(",").map(s => s.trim()).filter(Boolean);
        for (const c of conditions) {
          const key = c.toLowerCase();
          const existing = conditionMap.get(key) || { count: 0, criticalCount: 0 };
          existing.count++;
          if (p.status === "critical") existing.criticalCount++;
          conditionMap.set(key, existing);
        }

        if (p.zone) {
          if (!zoneConditionMap.has(p.zone)) zoneConditionMap.set(p.zone, {});
          const zc = zoneConditionMap.get(p.zone)!;
          for (const c of conditions) {
            const key = c.trim();
            zc[key] = (zc[key] || 0) + 1;
          }
        }
      }

      if (p.medications) {
        const meds = p.medications.split(",").map(s => s.trim().split(" ")[0]).filter(Boolean);
        for (const m of meds) {
          medMap.set(m, (medMap.get(m) || 0) + 1);
        }
      }

      if (p.zone) {
        if (!zoneStaffMap.has(p.zone)) zoneStaffMap.set(p.zone, { pilgrims: 0, staff: 0 });
        const z = zoneStaffMap.get(p.zone)!;
        if (p.role === "pilgrim") z.pilgrims++;
        else z.staff++;
      }
    }

    const alertStatsPerZone = await db.execute(sql`
      SELECT
        p.zone,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 60)::numeric, 1)::float as "avgAckTimeMin",
        COUNT(*) FILTER (WHERE a.acknowledged = false)::int as "pendingAlerts"
      FROM alerts a
      LEFT JOIN personnel p ON a.personnel_id = p.id
      WHERE p.zone IS NOT NULL
      GROUP BY p.zone
      ORDER BY "pendingAlerts" DESC
    `);

    const conditionBreakdown = Array.from(conditionMap.entries())
      .map(([condition, data]) => ({ condition: condition.charAt(0).toUpperCase() + condition.slice(1), ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const ageDistribution = Object.entries(ageRanges).map(([range, data]) => ({ range, ...data }));

    const medicationUsage = Array.from(medMap.entries())
      .map(([medication, count]) => ({ medication, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const staffCoverage = Array.from(zoneStaffMap.entries())
      .map(([zone, data]) => ({
        zone,
        pilgrims: data.pilgrims,
        staff: data.staff,
        ratio: data.staff > 0 ? `1:${Math.round(data.pilgrims / data.staff)}` : "No staff",
        gap: data.staff === 0 ? "CRITICAL" : data.pilgrims / data.staff > 20 ? "HIGH" : data.pilgrims / data.staff > 10 ? "MODERATE" : "ADEQUATE",
      }))
      .sort((a, b) => b.pilgrims - a.pilgrims);

    const responseMetrics = (alertStatsPerZone.rows as any[]).map(r => ({
      zone: r.zone || "Unknown",
      avgAckTimeMin: r.avgAckTimeMin || 0,
      pendingAlerts: r.pendingAlerts || 0,
    }));

    const conditionsByZone = Array.from(zoneConditionMap.entries())
      .map(([zone, conditions]) => ({ zone, conditions }))
      .sort((a, b) => Object.values(b.conditions).reduce((s, v) => s + v, 0) - Object.values(a.conditions).reduce((s, v) => s + v, 0));

    return {
      conditionBreakdown,
      ageDistribution,
      medicationUsage,
      staffCoverage,
      responseMetrics,
      conditionsByZone,
    };
  }

  async getStats(): Promise<{ total: number; active: number; ok: number; warning: number; critical: number; groupCount: number }> {
    const [totalResult] = await db.select({ count: count() }).from(personnel);
    const [activeResult] = await db.select({ count: count() }).from(personnel).where(eq(personnel.isActive, true));
    const [okResult] = await db.select({ count: count() }).from(personnel).where(eq(personnel.status, "ok"));
    const [warnResult] = await db.select({ count: count() }).from(personnel).where(eq(personnel.status, "warning"));
    const [critResult] = await db.select({ count: count() }).from(personnel).where(eq(personnel.status, "critical"));
    const [groupResult] = await db.select({ count: count() }).from(groups);

    return {
      total: totalResult?.count ?? 0,
      active: activeResult?.count ?? 0,
      ok: okResult?.count ?? 0,
      warning: warnResult?.count ?? 0,
      critical: critResult?.count ?? 0,
      groupCount: groupResult?.count ?? 0,
    };
  }

  async getTickets(opts?: { status?: string }): Promise<Ticket[]> {
    let query = db.select().from(tickets).$dynamic();
    if (opts?.status) query = query.where(eq(tickets.status, opts.status));
    return query.orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(t: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(t).returning();
    return ticket;
  }

  async updateTicket(id: number, t: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [ticket] = await db.update(tickets).set({ ...t, updatedAt: new Date() }).where(eq(tickets.id, id)).returning();
    return ticket;
  }

  async deleteTicket(id: number): Promise<boolean> {
    await db.delete(tickets).where(eq(tickets.id, id));
    return true;
  }

  async getLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(l: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(l).returning();
    return lead;
  }

  async updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db.update(leads).set(data).where(eq(leads.id, id)).returning();
    return lead;
  }

  async deleteLead(id: number): Promise<boolean> {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  async getLeadCalls(leadId: number): Promise<LeadCall[]> {
    return db.select().from(leadCalls).where(eq(leadCalls.leadId, leadId)).orderBy(desc(leadCalls.createdAt));
  }

  async getLeadCall(id: number): Promise<LeadCall | undefined> {
    const [call] = await db.select().from(leadCalls).where(eq(leadCalls.id, id));
    return call;
  }

  async createLeadCall(c: InsertLeadCall): Promise<LeadCall> {
    const [call] = await db.insert(leadCalls).values(c).returning();
    return call;
  }

  async updateLeadCall(id: number, data: Partial<InsertLeadCall>): Promise<LeadCall | undefined> {
    const [call] = await db.update(leadCalls).set(data).where(eq(leadCalls.id, id)).returning();
    return call;
  }

  async deleteLeadCall(id: number): Promise<boolean> {
    await db.delete(leadCalls).where(eq(leadCalls.id, id));
    return true;
  }

  private async enrichWatch(w: Watch): Promise<Watch & { person: Personnel | null; latestReading: WatchReading | null }> {
    const person = w.personnelId
      ? (await db.select().from(personnel).where(eq(personnel.id, w.personnelId)).limit(1))[0] ?? null
      : null;
    const [latestReading] = await db.select().from(watchReadings)
      .where(eq(watchReadings.watchDbId, w.id))
      .orderBy(desc(watchReadings.recordedAt))
      .limit(1);
    return { ...w, person: person ?? null, latestReading: latestReading ?? null };
  }

  async getWatches(): Promise<(Watch & { person: Personnel | null; latestReading: WatchReading | null })[]> {
    const all = await db.select().from(watches).orderBy(asc(watches.id));
    return Promise.all(all.map((w) => this.enrichWatch(w)));
  }

  async getWatch(id: number): Promise<(Watch & { person: Personnel | null; latestReading: WatchReading | null }) | undefined> {
    const [w] = await db.select().from(watches).where(eq(watches.id, id));
    if (!w) return undefined;
    return this.enrichWatch(w);
  }

  async createWatch(data: InsertWatch): Promise<Watch> {
    const [created] = await db.insert(watches).values(data).returning();
    return created;
  }

  async updateWatch(id: number, data: Partial<InsertWatch>): Promise<Watch | undefined> {
    const [updated] = await db.update(watches).set({ ...data, lastSync: new Date() }).where(eq(watches.id, id)).returning();
    return updated;
  }

  async deleteWatch(id: number): Promise<boolean> {
    await db.delete(watches).where(eq(watches.id, id));
    return true;
  }

  async getWatchReadings(watchDbId: number, limit = 24): Promise<WatchReading[]> {
    return db.select().from(watchReadings)
      .where(eq(watchReadings.watchDbId, watchDbId))
      .orderBy(desc(watchReadings.recordedAt))
      .limit(limit);
  }

  async addWatchReading(data: InsertWatchReading): Promise<WatchReading> {
    const [created] = await db.insert(watchReadings).values(data).returning();
    await db.update(watches).set({ lastSync: new Date() }).where(eq(watches.id, data.watchDbId));
    return created;
  }

  async getWebhookConfigs(): Promise<WebhookConfig[]> {
    return db.select().from(webhookConfigs).orderBy(asc(webhookConfigs.id));
  }

  async createWebhookConfig(data: InsertWebhookConfig): Promise<WebhookConfig> {
    const [created] = await db.insert(webhookConfigs).values(data).returning();
    return created;
  }

  async updateWebhookConfig(id: number, data: Partial<InsertWebhookConfig & { lastTriggered: Date }>): Promise<WebhookConfig | undefined> {
    const [updated] = await db.update(webhookConfigs).set(data).where(eq(webhookConfigs.id, id)).returning();
    return updated;
  }

  async deleteWebhookConfig(id: number): Promise<boolean> {
    await db.delete(webhookConfigs).where(eq(webhookConfigs.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
