import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("operator"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#0d9488"),
  region: text("region"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const personnel = pgTable("personnel", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 1 }).notNull(),
  bloodType: varchar("blood_type", { length: 5 }),
  groupId: integer("group_id").references(() => groups.id),
  zone: text("zone"),
  lat: real("lat"),
  lng: real("lng"),
  status: varchar("status", { length: 20 }).notNull().default("ok"),
  hr: integer("hr").notNull().default(72),
  spo2: integer("spo2").notNull().default(98),
  temp: real("temp").notNull().default(36.6),
  bp: varchar("bp", { length: 10 }).notNull().default("120/80"),
  steps: integer("steps").notNull().default(0),
  battery: integer("battery").notNull().default(100),
  fallDetected: boolean("fall_detected").notNull().default(false),
  riskScore: integer("risk_score").notNull().default(0),
  role: varchar("role", { length: 20 }).notNull().default("pilgrim"),
  shiftHours: real("shift_hours").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  medicalHistory: text("medical_history"),
  medications: text("medications"),
  illnesses: text("illnesses"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  nationality: text("nationality"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const alerts = pgTable("hajj_alerts", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  personnelId: integer("personnel_id").references(() => personnel.id),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  title: text("title").notNull(),
  callerName: text("caller_name"),
  callerContact: text("caller_contact"),
  description: text("description").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("not_emergency"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  zone: text("zone"),
  personnelId: integer("personnel_id").references(() => personnel.id),
  dispatchedTo: text("dispatched_to"),
  notes: text("notes"),
  audioUrl: text("audio_url"),
  audioName: text("audio_name"),
  transcriptText: text("transcript_text"),
  transcriptUrl: text("transcript_url"),
  transcriptName: text("transcript_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  watchId: text("watch_id"),
  status: varchar("status", { length: 30 }).notNull().default("not_emergency"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadCalls = pgTable("lead_calls", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url"),
  audioName: text("audio_name"),
  audioLength: integer("audio_length"),
  transcriptText: text("transcript_text"),
  callStatus: varchar("call_status", { length: 30 }).notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watches = pgTable("watches", {
  id: serial("id").primaryKey(),
  watchId: varchar("watch_id", { length: 30 }).notNull().unique(),
  personnelId: integer("personnel_id").references(() => personnel.id),
  model: text("model").notNull().default("Generic Smartwatch"),
  firmware: varchar("firmware", { length: 20 }).default("1.0.0"),
  batteryLevel: integer("battery_level").notNull().default(100),
  lastSync: timestamp("last_sync").defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchReadings = pgTable("watch_readings", {
  id: serial("id").primaryKey(),
  watchDbId: integer("watch_db_id").notNull().references(() => watches.id, { onDelete: "cascade" }),
  heartRate: integer("heart_rate"),
  bloodSugar: real("blood_sugar"),
  spo2: integer("spo2"),
  temperature: real("temperature"),
  respirationRate: integer("respiration_rate"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  steps: integer("steps"),
  calories: integer("calories"),
  skinTemp: real("skin_temp"),
  stressLevel: integer("stress_level"),
  ecgStatus: varchar("ecg_status", { length: 30 }).default("normal"),
  fallDetected: boolean("fall_detected").default(false),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  triggerOnCritical: boolean("trigger_on_critical").notNull().default(true),
  triggerOnWarning: boolean("trigger_on_warning").notNull().default(false),
  triggerOnFall: boolean("trigger_on_fall").notNull().default(true),
  triggerOnBloodSugar: boolean("trigger_on_blood_sugar").notNull().default(true),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export const insertPersonnelSchema = createInsertSchema(personnel).omit({ id: true, lastUpdated: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertLeadCallSchema = createInsertSchema(leadCalls).omit({ id: true, createdAt: true });

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type Personnel = typeof personnel.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLeadCall = z.infer<typeof insertLeadCallSchema>;
export type LeadCall = typeof leadCalls.$inferSelect;

export const insertWatchSchema = createInsertSchema(watches).omit({ id: true, createdAt: true, lastSync: true });
export const insertWatchReadingSchema = createInsertSchema(watchReadings).omit({ id: true, recordedAt: true });
export const insertWebhookConfigSchema = createInsertSchema(webhookConfigs).omit({ id: true, createdAt: true, lastTriggered: true });

export type InsertWatch = z.infer<typeof insertWatchSchema>;
export type Watch = typeof watches.$inferSelect;
export type InsertWatchReading = z.infer<typeof insertWatchReadingSchema>;
export type WatchReading = typeof watchReadings.$inferSelect;
export type InsertWebhookConfig = z.infer<typeof insertWebhookConfigSchema>;
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
