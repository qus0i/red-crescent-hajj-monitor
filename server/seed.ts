import { db, pool } from "./storage";
import { users, groups, personnel, alerts } from "@shared/schema";
import { count } from "drizzle-orm";
import { hashPassword } from "./auth";

/**
 * Syncs real devices from the watch-dashboard `devices` table
 * into the red-crescent-hajj-monitor `personnel` table.
 * Also pulls latest health_data and locations for each device.
 */
async function syncDevicesIntoPersonnel() {
  const client = await pool.connect();
  try {
    // Query real devices with their latest health + location data
    const { rows: deviceRows } = await client.query(`
      SELECT
        d.id AS device_id,
        d.imei,
        d.user_name,
        d.user_phone,
        d.sim_number,
        d.device_model,
        d.is_active,
        d.last_connection,
        d.notes,
        h.heart_rate,
        h.blood_pressure_systolic AS sbp,
        h.blood_pressure_diastolic AS dbp,
        h.spo2,
        h.body_temperature AS temp,
        h.battery_level,
        l.latitude,
        l.longitude,
        s.step_count
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT * FROM health_data
        WHERE device_id = d.id
        ORDER BY timestamp DESC LIMIT 1
      ) h ON true
      LEFT JOIN LATERAL (
        SELECT * FROM locations
        WHERE device_id = d.id
        ORDER BY timestamp DESC LIMIT 1
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT * FROM daily_steps
        WHERE device_id = d.id
        ORDER BY date DESC LIMIT 1
      ) s ON true
      ORDER BY d.id
    `);

    if (deviceRows.length === 0) {
      console.log("No devices found in the database. Skipping personnel sync.");
      return;
    }

    console.log(`Found ${deviceRows.length} real devices. Syncing to personnel...`);

    // Ensure we have a default group
    const existingGroups = await db.select({ count: count() }).from(groups);
    let groupId: number;
    if (!existingGroups[0] || existingGroups[0].count === 0) {
      const [g] = await db.insert(groups).values({
        name: "Monitored Devices",
        description: "Real GPS watch devices actively being tracked",
        color: "#dc2626",
        region: "Jordan",
      }).returning();
      groupId = g.id;
      console.log(`Created group: Monitored Devices (id: ${groupId})`);
    } else {
      const allGroups = await db.select().from(groups);
      groupId = allGroups[0].id;
    }

    // Clear old fake personnel and alerts (from the seed), then insert real ones
    await db.delete(alerts);
    await db.delete(personnel);
    console.log("Cleared old personnel and alerts.");

    for (const device of deviceRows) {
      const hr = device.heart_rate || 0;
      const spo2Val = device.spo2 || 0;
      const tempVal = device.temp ? parseFloat(device.temp) : 0;
      const sbp = device.sbp || 0;
      const dbp = device.dbp || 0;
      const battery = device.battery_level || 0;
      const steps = device.step_count || 0;
      const lat = device.latitude ? parseFloat(device.latitude) : null;
      const lng = device.longitude ? parseFloat(device.longitude) : null;

      // Determine health status from real vitals
      let status = "ok";
      if (hr > 150 || hr < 50 || spo2Val < 90 || tempVal > 39 || tempVal < 35 || sbp > 180 || sbp < 80) {
        status = "critical";
      } else if (hr > 100 || hr < 60 || spo2Val < 95 || tempVal > 38 || tempVal < 36 || sbp > 140 || sbp < 90) {
        status = "warning";
      }

      // Risk score based on vitals
      let riskScore = 0;
      if (hr > 100 || hr < 60) riskScore += 15;
      if (hr > 150 || hr < 50) riskScore += 30;
      if (spo2Val > 0 && spo2Val < 95) riskScore += 20;
      if (spo2Val > 0 && spo2Val < 90) riskScore += 30;
      if (tempVal > 38) riskScore += 15;
      if (tempVal > 39) riskScore += 25;
      if (sbp > 140) riskScore += 10;
      if (sbp > 180) riskScore += 20;
      riskScore = Math.min(riskScore, 100);

      // Check if device is online (connected in last 10 minutes)
      const isOnline = device.last_connection
        ? (Date.now() - new Date(device.last_connection).getTime()) < 10 * 60 * 1000
        : false;

      const externalId = `DEV-${String(device.device_id).padStart(3, "0")}`;

      const [created] = await db.insert(personnel).values({
        externalId,
        name: device.user_name || `Device ${device.imei}`,
        age: 0, // Real age not tracked by watch
        gender: "M",
        groupId,
        zone: "Jordan",
        lat,
        lng,
        status,
        hr,
        spo2: spo2Val || 98,
        temp: tempVal || 36.6,
        bp: sbp && dbp ? `${sbp}/${dbp}` : "0/0",
        steps,
        battery,
        fallDetected: false,
        riskScore,
        role: "pilgrim",
        shiftHours: 0,
        isActive: isOnline,
        nationality: "Jordanian",
        address: device.user_phone || "",
        emergencyContact: device.sim_number || "",
      }).returning();

      console.log(`  → ${created.name} (${externalId}) status=${status} HR=${hr} SpO2=${spo2Val} Temp=${tempVal}`);

      // Create alerts for warning/critical vitals
      if (status === "critical") {
        await db.insert(alerts).values({
          type: "critical",
          title: `CRITICAL VITALS - ${created.name}`,
          description: `${created.name} - HR: ${hr} BPM / SpO2: ${spo2Val}% / Temp: ${tempVal}°C. Immediate attention required.`,
          personnelId: created.id,
          acknowledged: false,
        });
      } else if (status === "warning") {
        await db.insert(alerts).values({
          type: "warning",
          title: `ELEVATED VITALS - ${created.name}`,
          description: `${created.name} - HR: ${hr} BPM / SpO2: ${spo2Val}% / Temp: ${tempVal}°C. Monitoring recommended.`,
          personnelId: created.id,
          acknowledged: false,
        });
      }

      if (battery > 0 && battery < 25) {
        await db.insert(alerts).values({
          type: "warning",
          title: `LOW BATTERY - ${created.name}`,
          description: `${created.name} - Device battery at ${battery}%. Data loss risk.`,
          personnelId: created.id,
          acknowledged: false,
        });
      }
    }

    console.log(`Synced ${deviceRows.length} real devices into personnel table.`);
  } finally {
    client.release();
  }
}

export async function seedDatabase() {
  // Create default login users if none exist
  const [existingUsers] = await db.select({ count: count() }).from(users);
  if (!existingUsers || existingUsers.count === 0) {
    const hashedPw = await hashPassword("admin123");
    await db.insert(users).values([
      { username: "admin", password: hashedPw, displayName: "System Administrator", role: "admin" },
      { username: "operator", password: await hashPassword("operator123"), displayName: "Control Room Operator", role: "operator" },
    ]);
    console.log("Created default users (admin/admin123, operator/operator123)");
  }

  // Sync real device data into personnel
  await syncDevicesIntoPersonnel();

  console.log("Seed complete!");
}

/**
 * Periodic sync: updates personnel records with latest device health/location data.
 * Called every 60 seconds from index.ts.
 */
export async function periodicSync() {
  const client = await pool.connect();
  try {
    const { rows: deviceRows } = await client.query(`
      SELECT
        d.id AS device_id,
        d.imei,
        d.user_name,
        d.is_active,
        d.last_connection,
        h.heart_rate,
        h.blood_pressure_systolic AS sbp,
        h.blood_pressure_diastolic AS dbp,
        h.spo2,
        h.body_temperature AS temp,
        h.battery_level,
        l.latitude,
        l.longitude,
        s.step_count
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT * FROM health_data
        WHERE device_id = d.id
        ORDER BY timestamp DESC LIMIT 1
      ) h ON true
      LEFT JOIN LATERAL (
        SELECT * FROM locations
        WHERE device_id = d.id
        ORDER BY timestamp DESC LIMIT 1
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT * FROM daily_steps
        WHERE device_id = d.id
        ORDER BY date DESC LIMIT 1
      ) s ON true
      ORDER BY d.id
    `);

    for (const device of deviceRows) {
      const externalId = `DEV-${String(device.device_id).padStart(3, "0")}`;
      const hr = device.heart_rate || 0;
      const spo2Val = device.spo2 || 0;
      const tempVal = device.temp ? parseFloat(device.temp) : 0;
      const sbp = device.sbp || 0;
      const dbp = device.dbp || 0;
      const battery = device.battery_level || 0;
      const steps = device.step_count || 0;
      const lat = device.latitude ? parseFloat(device.latitude) : null;
      const lng = device.longitude ? parseFloat(device.longitude) : null;

      let status = "ok";
      if (hr > 150 || hr < 50 || spo2Val < 90 || tempVal > 39 || tempVal < 35 || sbp > 180 || sbp < 80) {
        status = "critical";
      } else if (hr > 100 || hr < 60 || spo2Val < 95 || tempVal > 38 || tempVal < 36 || sbp > 140 || sbp < 90) {
        status = "warning";
      }

      let riskScore = 0;
      if (hr > 100 || hr < 60) riskScore += 15;
      if (hr > 150 || hr < 50) riskScore += 30;
      if (spo2Val > 0 && spo2Val < 95) riskScore += 20;
      if (spo2Val > 0 && spo2Val < 90) riskScore += 30;
      if (tempVal > 38) riskScore += 15;
      if (tempVal > 39) riskScore += 25;
      if (sbp > 140) riskScore += 10;
      if (sbp > 180) riskScore += 20;
      riskScore = Math.min(riskScore, 100);

      const isOnline = device.last_connection
        ? (Date.now() - new Date(device.last_connection).getTime()) < 10 * 60 * 1000
        : false;

      // Update existing personnel row
      await client.query(`
        UPDATE personnel SET
          name = $1,
          hr = $2,
          spo2 = $3,
          temp = $4,
          bp = $5,
          steps = $6,
          battery = $7,
          lat = $8,
          lng = $9,
          status = $10,
          risk_score = $11,
          is_active = $12,
          fall_detected = false,
          last_updated = NOW()
        WHERE external_id = $13
      `, [
        device.user_name || `Device ${device.imei}`,
        hr, spo2Val || 98, tempVal || 36.6,
        sbp && dbp ? `${sbp}/${dbp}` : "0/0",
        steps, battery,
        lat, lng,
        status, riskScore, isOnline,
        externalId,
      ]);
    }
  } catch (err) {
    console.error("Periodic sync error:", err);
  } finally {
    client.release();
  }
}
