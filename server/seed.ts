import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users, groups, personnel, alerts } from "@shared/schema";
import { count } from "drizzle-orm";
import { hashPassword } from "./auth";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const HOLY_SITES = {
  haram: { lat: 21.4225, lng: 39.8262 },
  mina: { lat: 21.4133, lng: 39.8933 },
  arafat: { lat: 21.3547, lng: 39.9842 },
  muzdalifah: { lat: 21.3891, lng: 39.9242 },
  jamarat: { lat: 21.4214, lng: 39.8769 },
  hub: { lat: 21.4200, lng: 39.8300 },
};

const GROUP_DATA = [
  { name: "Grand Mosque Medical", description: "Emergency response and health monitoring within Al-Masjid al-Haram", color: "#ef4444", region: "Makkah - Haram", center: HOLY_SITES.haram, count: [15, 25] },
  { name: "Mina Camp Support", description: "General health checks and hydration monitoring in Mina tents", color: "#0ea5e9", region: "Mina", center: HOLY_SITES.mina, count: [70, 90] },
  { name: "Arafat Health Station", description: "Heat stroke prevention and vital monitoring at Mount Arafat", color: "#f59e0b", region: "Arafat", center: HOLY_SITES.arafat, count: [55, 75] },
  { name: "Muzdalifah Response", description: "Mobile medical units tracking pilgrims in Muzdalifah", color: "#10b981", region: "Muzdalifah", center: HOLY_SITES.muzdalifah, count: [45, 60] },
  { name: "Jamarat Safety", description: "Crowd health and injury monitoring at the Jamarat Bridge", color: "#ec4899", region: "Makkah - Jamarat", center: HOLY_SITES.jamarat, count: [25, 35] },
  { name: "Transport Hub Clinics", description: "Health screening at Haramain High Speed Rail and bus stations", color: "#8b5cf6", region: "Makkah - Hub", center: HOLY_SITES.hub, count: [15, 25] },
  { name: "Volunteer Medics", description: "Coordinating volunteer medical staff across all holy sites", color: "#06b6d4", region: "Holy Sites", center: HOLY_SITES.haram, count: [20, 30] },
  { name: "Elderly Pilgrim Care", description: "Specialized monitoring for high-risk senior pilgrims", color: "#a855f7", region: "Makkah", center: HOLY_SITES.haram, count: [25, 35] },
];

const FIRST_NAMES_M = ["Omar", "Khalid", "Yazeed", "Saleh", "Tariq", "Faisal", "Mohammed", "Abdullah", "Saud", "Nasser", "Badr", "Hamad", "Sultan", "Waleed", "Rashed", "Turki", "Majed", "Fahad", "Saad", "Nawaf", "Bandar", "Mishal", "Bader", "Abdulaziz"];
const FIRST_NAMES_F = ["Fatima", "Nora", "Aisha", "Rana", "Hind", "Sara", "Nouf", "Lama", "Reema", "Dalal", "Maha", "Hessa", "Reem", "Abeer", "Wafa", "Mona", "Latifa", "Haifa", "Lamia", "Deema", "Arwa", "Ghada", "Jouri", "Asma"];
const LAST_NAMES = ["Al-Rashid", "Al-Zahrani", "Al-Ghamdi", "Al-Otaibi", "Al-Harbi", "Al-Dosari", "Al-Mutairi", "Al-Shehri", "Al-Qahtani", "Al-Balawi", "Al-Malki", "Al-Shamrani", "Al-Yami", "Al-Shahrani", "Al-Subai", "Al-Jumaah", "Al-Dhaheri", "Al-Saud", "Al-Tamimi", "Al-Anazi"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const NATIONALITIES = [
  "Saudi Arabian", "Egyptian", "Pakistani", "Indonesian", "Turkish",
  "Malaysian", "Bangladeshi", "Nigerian", "Indian", "Jordanian",
  "Moroccan", "Algerian", "Sudanese", "Yemeni", "Iraqi",
  "Syrian", "Tunisian", "Libyan", "Somali", "Afghan",
];

const CITIES_BY_NATIONALITY: Record<string, string[]> = {
  "Saudi Arabian": ["Riyadh", "Jeddah", "Dammam", "Madinah", "Tabuk", "Abha", "Khobar"],
  "Egyptian": ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan"],
  "Pakistani": ["Karachi", "Lahore", "Islamabad", "Peshawar", "Faisalabad"],
  "Indonesian": ["Jakarta", "Surabaya", "Bandung", "Medan", "Yogyakarta"],
  "Turkish": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"],
  "Malaysian": ["Kuala Lumpur", "Penang", "Johor Bahru", "Kuching", "Kota Kinabalu"],
  "Bangladeshi": ["Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna"],
  "Nigerian": ["Lagos", "Abuja", "Kano", "Ibadan", "Kaduna"],
  "Indian": ["Mumbai", "Delhi", "Hyderabad", "Lucknow", "Chennai"],
  "Jordanian": ["Amman", "Zarqa", "Irbid", "Aqaba"],
  "Moroccan": ["Casablanca", "Rabat", "Marrakech", "Fez", "Tangier"],
  "Algerian": ["Algiers", "Oran", "Constantine", "Annaba"],
  "Sudanese": ["Khartoum", "Omdurman", "Port Sudan"],
  "Yemeni": ["Sanaa", "Aden", "Taiz", "Hodeidah"],
  "Iraqi": ["Baghdad", "Basra", "Erbil", "Mosul", "Najaf"],
  "Syrian": ["Damascus", "Aleppo", "Homs", "Latakia"],
  "Tunisian": ["Tunis", "Sfax", "Sousse", "Kairouan"],
  "Libyan": ["Tripoli", "Benghazi", "Misrata"],
  "Somali": ["Mogadishu", "Hargeisa", "Kismayo"],
  "Afghan": ["Kabul", "Herat", "Mazar-i-Sharif", "Kandahar"],
};

const ILLNESSES_BY_AGE: Record<string, { conditions: string[]; chance: number }[]> = {
  young: [
    { conditions: ["Asthma"], chance: 0.12 },
    { conditions: ["Anemia"], chance: 0.08 },
    { conditions: ["Migraine"], chance: 0.06 },
    { conditions: ["Allergies"], chance: 0.10 },
  ],
  middle: [
    { conditions: ["Hypertension"], chance: 0.20 },
    { conditions: ["Type 2 Diabetes"], chance: 0.18 },
    { conditions: ["Asthma"], chance: 0.08 },
    { conditions: ["Hyperlipidemia"], chance: 0.12 },
    { conditions: ["Obesity"], chance: 0.10 },
    { conditions: ["Gastric ulcer"], chance: 0.06 },
    { conditions: ["Thyroid disorder"], chance: 0.07 },
  ],
  senior: [
    { conditions: ["Hypertension"], chance: 0.35 },
    { conditions: ["Type 2 Diabetes"], chance: 0.30 },
    { conditions: ["Coronary artery disease", "Heart disease"], chance: 0.15 },
    { conditions: ["Osteoarthritis", "Arthritis"], chance: 0.20 },
    { conditions: ["Chronic kidney disease"], chance: 0.08 },
    { conditions: ["COPD"], chance: 0.10 },
    { conditions: ["Cardiac arrhythmia"], chance: 0.07 },
    { conditions: ["Osteoporosis"], chance: 0.10 },
    { conditions: ["Cataracts"], chance: 0.08 },
  ],
};

const MEDICATIONS: Record<string, string[]> = {
  "Hypertension": ["Lisinopril 10mg", "Amlodipine 5mg", "Losartan 50mg", "Hydrochlorothiazide 25mg"],
  "Type 2 Diabetes": ["Metformin 500mg", "Glimepiride 2mg", "Sitagliptin 100mg", "Insulin Glargine"],
  "Asthma": ["Salbutamol inhaler", "Fluticasone inhaler", "Montelukast 10mg"],
  "Coronary artery disease": ["Aspirin 81mg", "Atorvastatin 20mg", "Clopidogrel 75mg", "Metoprolol 50mg"],
  "Heart disease": ["Aspirin 81mg", "Atorvastatin 40mg", "Metoprolol 50mg", "Warfarin 5mg"],
  "Osteoarthritis": ["Ibuprofen 400mg", "Acetaminophen 500mg", "Celecoxib 200mg"],
  "Arthritis": ["Naproxen 500mg", "Prednisolone 5mg", "Methotrexate 15mg"],
  "Chronic kidney disease": ["Furosemide 40mg", "Calcium carbonate 500mg", "Epoetin alfa"],
  "COPD": ["Tiotropium inhaler", "Salbutamol inhaler", "Fluticasone/Salmeterol"],
  "Cardiac arrhythmia": ["Amiodarone 200mg", "Digoxin 0.25mg", "Warfarin 5mg"],
  "Hyperlipidemia": ["Atorvastatin 20mg", "Rosuvastatin 10mg"],
  "Obesity": ["Orlistat 120mg"],
  "Gastric ulcer": ["Omeprazole 20mg", "Pantoprazole 40mg"],
  "Thyroid disorder": ["Levothyroxine 50mcg", "Levothyroxine 100mcg"],
  "Anemia": ["Ferrous sulfate 325mg", "Folic acid 1mg"],
  "Migraine": ["Sumatriptan 50mg", "Propranolol 40mg"],
  "Allergies": ["Cetirizine 10mg", "Loratadine 10mg"],
  "Osteoporosis": ["Alendronate 70mg", "Calcium/Vitamin D"],
  "Cataracts": [],
};

const MEDICAL_HISTORY_ITEMS = [
  "Appendectomy (2018)", "Cholecystectomy (2020)", "Knee replacement (2022)",
  "Coronary stent placement (2021)", "Hip replacement (2019)",
  "Hernia repair (2017)", "Cataract surgery (2023)", "Tonsillectomy (childhood)",
  "Previous heat stroke episode", "Previous Hajj attendance (2019)",
  "Previous Hajj attendance (2023)", "Hospitalized for pneumonia (2022)",
  "Fractured wrist (2020)", "Cardiac bypass surgery (2018)",
  "Spinal disc surgery (2021)", "Allergic reaction to penicillin",
  "Allergic reaction to sulfa drugs", "Blood transfusion (2019)",
];

const EMERGENCY_CONTACT_RELATIONS = ["Spouse", "Son", "Daughter", "Brother", "Sister", "Parent", "Cousin", "Friend"];

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min: number, max: number, dec = 1) { return parseFloat((min + Math.random() * (max - min)).toFixed(dec)); }

function generateMedicalProfile(age: number) {
  const ageGroup = age < 40 ? "young" : age < 60 ? "middle" : "senior";
  const possibleConditions = ILLNESSES_BY_AGE[ageGroup];

  const illnessList: string[] = [];
  const medsList: string[] = [];
  const historyList: string[] = [];

  for (const { conditions, chance } of possibleConditions) {
    if (Math.random() < chance) {
      const condition = pick(conditions);
      illnessList.push(condition);
      const meds = MEDICATIONS[condition];
      if (meds && meds.length > 0) {
        medsList.push(pick(meds));
        if (Math.random() > 0.6 && meds.length > 1) {
          const secondMed = meds.find(m => !medsList.includes(m));
          if (secondMed) medsList.push(secondMed);
        }
      }
    }
  }

  if (Math.random() < 0.25) {
    historyList.push(pick(MEDICAL_HISTORY_ITEMS));
  }
  if (age > 55 && Math.random() < 0.3) {
    historyList.push(pick(MEDICAL_HISTORY_ITEMS.filter(h => !historyList.includes(h))));
  }

  const nationality = pick(NATIONALITIES);
  const cities = CITIES_BY_NATIONALITY[nationality] || ["Unknown"];
  const city = pick(cities);
  const streetNum = rand(1, 500);
  const district = pick(["Al-Olaya", "Al-Malaz", "Al-Rawdah", "Al-Naseem", "Al-Aziziyah", "Al-Faisaliah", "Al-Hamra", "Al-Safa"]);
  const address = `${streetNum} ${district} District, ${city}`;

  const contactFirstName = pick([...FIRST_NAMES_M, ...FIRST_NAMES_F]);
  const contactLastName = pick(LAST_NAMES);
  const contactRelation = pick(EMERGENCY_CONTACT_RELATIONS);
  const contactPhone = `+${rand(1, 99)}${rand(100, 999)}${rand(100, 999)}${rand(1000, 9999)}`;
  const emergencyContact = `${contactFirstName} ${contactLastName} (${contactRelation}) - ${contactPhone}`;

  return {
    illnesses: illnessList.length > 0 ? illnessList.join(", ") : null,
    medications: medsList.length > 0 ? medsList.join(", ") : null,
    medicalHistory: historyList.length > 0 ? historyList.join(", ") : null,
    nationality,
    address,
    emergencyContact,
  };
}

function generatePersonnel(idx: number, groupId: number, region: string, center: { lat: number, lng: number }) {
  const gender = Math.random() > 0.5 ? "M" : "F";
  const firstName = gender === "M" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  const statusRoll = Math.random();
  let status: string, hr: number, spo2: number, temp: number, riskScore: number;

  if (statusRoll < 0.05) {
    status = "critical";
    hr = rand(130, 165);
    spo2 = rand(85, 92);
    temp = randFloat(38.2, 39.5, 1);
    riskScore = rand(75, 98);
  } else if (statusRoll < 0.18) {
    status = "warning";
    hr = rand(100, 130);
    spo2 = rand(92, 95);
    temp = randFloat(37.3, 38.2, 1);
    riskScore = rand(40, 74);
  } else {
    status = "ok";
    hr = rand(60, 95);
    spo2 = rand(96, 100);
    temp = randFloat(36.2, 37.2, 1);
    riskScore = rand(2, 30);
  }

  const bpSys = status === "critical" ? rand(145, 180) : status === "warning" ? rand(130, 150) : rand(105, 130);
  const bpDia = status === "critical" ? rand(95, 110) : status === "warning" ? rand(85, 98) : rand(65, 85);

  const latOffset = (Math.random() - 0.5) * 0.015;
  const lngOffset = (Math.random() - 0.5) * 0.02;

  const roleRoll = Math.random();
  let role: string;
  if (roleRoll < 0.08) role = "paramedic";
  else if (roleRoll < 0.12) role = "doctor";
  else if (roleRoll < 0.16) role = "nurse";
  else role = "pilgrim";

  const age = role === "pilgrim" ? rand(22, 72) : rand(25, 55);
  const medProfile = generateMedicalProfile(age);

  return {
    externalId: `HC-${String(idx).padStart(4, "0")}`,
    name,
    age,
    gender,
    bloodType: pick(BLOOD_TYPES),
    groupId,
    zone: region,
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset,
    status: role !== "pilgrim" ? "ok" : status,
    hr: role !== "pilgrim" ? rand(60, 85) : hr,
    spo2: role !== "pilgrim" ? rand(97, 100) : spo2,
    temp: role !== "pilgrim" ? randFloat(36.2, 36.9, 1) : temp,
    bp: `${bpSys}/${bpDia}`,
    steps: rand(500, 12000),
    battery: role !== "pilgrim" ? rand(60, 100) : rand(15, 100),
    fallDetected: status === "critical" && role === "pilgrim" && Math.random() > 0.6,
    riskScore: role !== "pilgrim" ? rand(0, 10) : riskScore,
    role,
    shiftHours: randFloat(0.5, 10, 1),
    isActive: Math.random() > 0.05,
    ...medProfile,
  };
}

export async function seedDatabase() {
  const [existingUsers] = await db.select({ count: count() }).from(users);
  if (!existingUsers || existingUsers.count === 0) {
    const hashedPw = await hashPassword("admin123");
    await db.insert(users).values([
      { username: "admin", password: hashedPw, displayName: "System Administrator", role: "admin" },
      { username: "operator", password: await hashPassword("operator123"), displayName: "Control Room Operator", role: "operator" },
    ]);
    console.log("Created default users (admin/admin123, operator/operator123)");
  }

  const [existing] = await db.select({ count: count() }).from(personnel);
  if (existing && existing.count >= 200) {
    console.log(`Database already has ${existing.count} personnel, skipping seed.`);
    return;
  }

  if (existing && existing.count > 0) {
    console.log(`Database has only ${existing.count} personnel (stale seed), re-seeding...`);
    await db.delete(alerts);
    await db.delete(personnel);
    await db.delete(groups);
  }

  console.log("Seeding database with Hajj health monitoring data...");

  const groupsToInsert = GROUP_DATA.map(({ name, description, color, region }) => ({ name, description, color, region }));
  const createdGroups = await db.insert(groups).values(groupsToInsert).returning();
  console.log(`Created ${createdGroups.length} groups`);

  const personnelData = [];
  let idx = 1;
  for (let i = 0; i < createdGroups.length; i++) {
    const group = createdGroups[i];
    const groupMeta = GROUP_DATA[i];
    const personnelCount = rand(groupMeta.count[0], groupMeta.count[1]);
    for (let j = 0; j < personnelCount; j++) {
      personnelData.push(generatePersonnel(idx++, group.id, group.region || "Holy Sites", groupMeta.center));
    }
  }

  const createdPersonnel = await db.insert(personnel).values(personnelData).returning();
  console.log(`Created ${createdPersonnel.length} personnel`);

  const alertData = [];
  for (const p of createdPersonnel) {
    if (p.status === "critical") {
      alertData.push({
        type: "critical",
        title: `CRITICAL VITALS - ${p.externalId}`,
        description: `${p.name} - HR: ${p.hr} BPM / SpO2: ${p.spo2}% / Temp: ${p.temp}C. Multiple thresholds exceeded.`,
        personnelId: p.id,
        acknowledged: false,
      });
      if (p.fallDetected) {
        alertData.push({
          type: "critical",
          title: `FALL DETECTED - ${p.externalId}`,
          description: `${p.name} - ${p.zone} zone. Movement sensor triggered, no response.`,
          personnelId: p.id,
          acknowledged: false,
        });
      }
    } else if (p.status === "warning") {
      alertData.push({
        type: "warning",
        title: `ELEVATED VITALS - ${p.externalId}`,
        description: `${p.name} - HR ${p.hr} BPM. Monitor recommended.`,
        personnelId: p.id,
        acknowledged: false,
      });
    }
    if (p.battery < 25) {
      alertData.push({
        type: "warning",
        title: `LOW BATTERY - ${p.externalId}`,
        description: `${p.name} - Device battery at ${p.battery}%. Data loss risk.`,
        personnelId: p.id,
        acknowledged: false,
      });
    }
  }

  if (alertData.length > 0) {
    await db.insert(alerts).values(alertData);
    console.log(`Created ${alertData.length} alerts`);
  }

  console.log("Seed complete!");
}
