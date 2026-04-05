import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase, periodicSync } from "./seed";
import { setupAuth } from "./auth";
import { pool } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static("public/uploads"));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});

async function ensureTablesExist() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'operator'
      );
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#0d9488',
        region TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS personnel (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(20) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender VARCHAR(1) NOT NULL,
        blood_type VARCHAR(5),
        group_id INTEGER REFERENCES groups(id),
        zone TEXT,
        lat REAL,
        lng REAL,
        status VARCHAR(20) NOT NULL DEFAULT 'ok',
        hr INTEGER NOT NULL DEFAULT 72,
        spo2 INTEGER NOT NULL DEFAULT 98,
        temp REAL NOT NULL DEFAULT 36.6,
        bp VARCHAR(10) NOT NULL DEFAULT '120/80',
        steps INTEGER NOT NULL DEFAULT 0,
        battery INTEGER NOT NULL DEFAULT 100,
        fall_detected BOOLEAN NOT NULL DEFAULT false,
        risk_score INTEGER NOT NULL DEFAULT 0,
        role VARCHAR(20) NOT NULL DEFAULT 'pilgrim',
        shift_hours REAL NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        medical_history TEXT,
        medications TEXT,
        illnesses TEXT,
        address TEXT,
        emergency_contact TEXT,
        nationality TEXT,
        last_updated TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS hajj_alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        personnel_id INTEGER REFERENCES personnel(id),
        acknowledged BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(20) NOT NULL UNIQUE,
        title TEXT NOT NULL,
        caller_name TEXT,
        caller_contact TEXT,
        description TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'not_emergency',
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        zone TEXT,
        personnel_id INTEGER REFERENCES personnel(id),
        dispatched_to TEXT,
        notes TEXT,
        audio_url TEXT,
        audio_name TEXT,
        transcript_text TEXT,
        transcript_url TEXT,
        transcript_name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        watch_id TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'not_emergency',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS lead_calls (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        audio_url TEXT,
        audio_name TEXT,
        audio_length INTEGER,
        transcript_text TEXT,
        call_status VARCHAR(30) NOT NULL DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS watches (
        id SERIAL PRIMARY KEY,
        watch_id VARCHAR(30) NOT NULL UNIQUE,
        personnel_id INTEGER REFERENCES personnel(id),
        model TEXT NOT NULL DEFAULT 'Generic Smartwatch',
        firmware VARCHAR(20) DEFAULT '1.0.0',
        battery_level INTEGER NOT NULL DEFAULT 100,
        last_sync TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS watch_readings (
        id SERIAL PRIMARY KEY,
        watch_db_id INTEGER NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
        heart_rate INTEGER,
        blood_sugar REAL,
        spo2 INTEGER,
        temperature REAL,
        respiration_rate INTEGER,
        systolic INTEGER,
        diastolic INTEGER,
        steps INTEGER,
        calories INTEGER,
        skin_temp REAL,
        stress_level INTEGER,
        ecg_status VARCHAR(30) DEFAULT 'normal',
        fall_detected BOOLEAN DEFAULT false,
        recorded_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS webhook_configs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        trigger_on_critical BOOLEAN NOT NULL DEFAULT true,
        trigger_on_warning BOOLEAN NOT NULL DEFAULT false,
        trigger_on_fall BOOLEAN NOT NULL DEFAULT true,
        trigger_on_blood_sugar BOOLEAN NOT NULL DEFAULT true,
        last_triggered TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Database tables verified/created successfully.");
  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    client.release();
  }
}

(async () => {
  await ensureTablesExist();
  setupAuth(app);
  await seedDatabase().catch((err) => console.error("Seed error:", err));
  await registerRoutes(httpServer, app);

  // Periodic sync: update personnel with latest real device data every 60 seconds
  setInterval(() => {
    periodicSync().catch((err) => console.error("Periodic sync error:", err));
  }, 60_000);
  log("Periodic device sync started (every 60s)");

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
