import { type ReactNode } from "react";
import DottedMap from "dotted-map";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import {
  MapPin, Activity, Shield, Heart, Users, Brain,
  ArrowRight, Radio, Thermometer, AlertTriangle,
} from "lucide-react";

export function LandingFeatures() {
  return (
    <section className="py-20 bg-white" data-testid="landing-features">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="font-mono text-xs uppercase tracking-[3px] text-teal-600 font-semibold">Platform Capabilities</span>
          <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 tracking-[1px] mt-3">
            Everything You Need to Protect Pilgrims
          </h2>
          <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
            A unified command center combining real-time monitoring, AI-powered risk analysis,
            and rapid emergency response across all holy sites.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2">

          <div className="relative overflow-hidden bg-slate-50 border border-slate-200 p-6 rounded-tl-2xl md:rounded-tl-2xl" data-testid="feature-map">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="font-mono text-xs uppercase tracking-wider">Pilgrim Tracking</span>
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">
              Real-time GPS across all holy sites.{" "}
              <span className="text-slate-400 font-normal">Track every pilgrim from Mina to Arafat to Muzdalifah with live location updates.</span>
            </h3>
            <div className="relative mt-4">
              <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-white text-slate-800 rounded-lg text-xs font-mono font-bold shadow-md flex items-center gap-2 border border-slate-200">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                674 pilgrims tracked live
              </div>
              <PilgrimMap />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 p-6 border border-slate-200 bg-white rounded-tr-2xl md:rounded-tr-2xl" data-testid="feature-stats">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <Shield className="w-4 h-4 text-teal-600" />
                <span className="font-mono text-xs uppercase tracking-wider">AI Health Intelligence</span>
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900">
                Personalized risk scoring for every pilgrim.{" "}
                <span className="text-slate-400 font-normal">AI analyzes vitals, medical history, and environmental conditions to predict health emergencies before they happen.</span>
              </h3>
            </div>
            <LiveAlertsFeed />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 space-y-4 rounded-bl-2xl md:rounded-bl-2xl" data-testid="feature-chart">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <Activity className="w-4 h-4 text-teal-600" />
              <span className="font-mono text-xs uppercase tracking-wider">Vital Sign Monitoring</span>
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900">
              Continuous biometric data streams.{" "}
              <span className="text-slate-400 font-normal">Heart rate, SpO2, temperature, and blood pressure from every wearable device.</span>
            </h3>
            <VitalsChart />
          </div>

          <div className="grid grid-cols-2 rounded-br-2xl md:rounded-br-2xl overflow-hidden" data-testid="feature-cards">
            <FeatureCard
              icon={<Brain className="w-4 h-4 text-teal-600" />}
              title="AI Risk Engine"
              subtitle="Predictive Analysis"
              description="Medication interactions, heat stroke risk, and Hajj-specific health warnings generated automatically."
            />
            <FeatureCard
              icon={<Users className="w-4 h-4 text-teal-600" />}
              title="Responder Dispatch"
              subtitle="Nearest Available"
              description="Locate and dispatch the closest paramedic, doctor, or nurse with one click."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, subtitle, description }: { icon: ReactNode; title: string; subtitle: string; description: string }) {
  return (
    <div className="relative flex flex-col gap-3 p-5 border border-slate-200 bg-white transition group" data-testid={`feature-card-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div>
        <span className="text-xs flex items-center gap-2 text-slate-500 mb-3 font-mono uppercase tracking-wider">
          {icon}
          {title}
        </span>
        <h3 className="text-lg font-display font-bold text-slate-900">
          {subtitle}{" "}
          <span className="text-slate-400 font-normal text-base">{description}</span>
        </h3>
      </div>
      <div className="absolute bottom-3 right-3 p-2.5 flex items-center gap-2 border border-slate-200 rounded-full group-hover:-rotate-45 transition bg-white">
        <ArrowRight className="w-4 h-4 text-teal-600" />
      </div>
    </div>
  );
}

const map = new DottedMap({ height: 55, grid: "diagonal" });
const points = map.getPoints();

function PilgrimMap() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-auto text-teal-300">
      {points.map((point, i) => (
        <circle key={i} cx={point.x} cy={point.y} r={0.15} fill="currentColor" />
      ))}
      <circle cx={43.5} cy={22.5} r={1.2} fill="#0d9488" opacity={0.8} />
      <circle cx={43.5} cy={22.5} r={2} fill="#0d9488" opacity={0.15} />
      <circle cx={43.5} cy={22.5} r={3} fill="#0d9488" opacity={0.05} />
    </svg>
  );
}

const vitalsData = [
  { time: "00:00", hr: 72, spo2: 98, temp: 36.6 },
  { time: "02:00", hr: 74, spo2: 97, temp: 36.7 },
  { time: "04:00", hr: 78, spo2: 97, temp: 36.8 },
  { time: "06:00", hr: 85, spo2: 96, temp: 37.0 },
  { time: "08:00", hr: 92, spo2: 95, temp: 37.2 },
  { time: "10:00", hr: 105, spo2: 94, temp: 37.6 },
  { time: "12:00", hr: 118, spo2: 93, temp: 38.0 },
  { time: "14:00", hr: 110, spo2: 94, temp: 37.8 },
  { time: "16:00", hr: 95, spo2: 96, temp: 37.3 },
  { time: "18:00", hr: 82, spo2: 97, temp: 37.0 },
  { time: "20:00", hr: 76, spo2: 98, temp: 36.7 },
  { time: "22:00", hr: 70, spo2: 98, temp: 36.5 },
];

function VitalsChart() {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={vitalsData}>
          <defs>
            <linearGradient id="fillHr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillSpo2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <CartesianGrid vertical={false} stroke="#f1f5f9" />
          <Tooltip
            contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ fontWeight: 600, color: "#0f172a" }}
          />
          <Area type="monotone" dataKey="hr" stroke="#f43f5e" fill="url(#fillHr)" strokeWidth={2} dot={false} name="Heart Rate" />
          <Area type="monotone" dataKey="spo2" stroke="#0d9488" fill="url(#fillSpo2)" strokeWidth={2} dot={false} name="SpO2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AlertMsg {
  icon: ReactNode;
  title: string;
  time: string;
  content: string;
  color: string;
}

const alertMessages: AlertMsg[] = [
  {
    icon: <AlertTriangle className="w-4 h-4" />,
    title: "Critical Vitals Alert",
    time: "1m ago",
    content: "HR 145 BPM, SpO2 85% - Patient in Mina zone requires immediate attention.",
    color: "from-rose-400 to-rose-600",
  },
  {
    icon: <Thermometer className="w-4 h-4" />,
    title: "Heat Risk Warning",
    time: "3m ago",
    content: "12 pilgrims in Arafat zone showing elevated body temperature above 38C.",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: <Heart className="w-4 h-4" />,
    title: "Cardiac Monitor",
    time: "5m ago",
    content: "Arrhythmia pattern detected in elderly pilgrim. Medical escort assigned.",
    color: "from-violet-400 to-purple-600",
  },
  {
    icon: <Radio className="w-4 h-4" />,
    title: "Responder Dispatched",
    time: "8m ago",
    content: "Paramedic en route to Jamarat Bridge, ETA 3 minutes.",
    color: "from-teal-400 to-emerald-600",
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: "AI Risk Assessment",
    time: "10m ago",
    content: "26 pilgrims flagged as high-risk due to pre-existing conditions and heat index.",
    color: "from-blue-400 to-indigo-600",
  },
];

function LiveAlertsFeed() {
  return (
    <div className="w-full max-w-sm mx-auto h-[260px] overflow-hidden relative">
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent z-10" />
      <div className="space-y-2.5 relative z-0">
        {alertMessages.map((msg, i) => (
          <div
            key={i}
            className="flex gap-3 items-start p-3 border border-slate-200 rounded-xl bg-slate-50 transform transition duration-300 ease-in-out animate-fade-in"
            style={{ animationDelay: `${i * 200}ms`, animationFillMode: "forwards", opacity: 0 }}
            data-testid={`alert-feed-${i}`}
          >
            <div className={`w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] rounded-xl bg-gradient-to-br ${msg.color} flex items-center justify-center text-white`}>
              {msg.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                {msg.title}
                <span className="text-[10px] text-slate-400 font-mono font-normal">{msg.time}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
