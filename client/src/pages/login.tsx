import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, User, Eye, EyeOff, ArrowRight, Languages, Activity, Users, Clock, Building2, Wifi, Navigation } from "lucide-react";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginProps {
  onLogin: (user: { id: number; username: string; displayName: string; role: string }) => void;
}

const STATS = [
  { icon: Users, value: "2.5M", label: "Pilgrims" },
  { icon: Clock, value: "<90s", label: "Response" },
  { icon: Building2, value: "4", label: "Departments" },
];

export default function Login({ onLogin }: LoginProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t, lang, toggleLang } = useI18n();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", data);
      const user = await res.json();
      onLogin(user);
    } catch {
      toast({ title: "Login Failed", description: "Invalid username or password", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#f8fafc" }} data-testid="login-page">
      <style>{`
        @keyframes map-drift {
          0%   { transform: translate(0, 0) scale(1.08); }
          33%  { transform: translate(-18px, 12px) scale(1.12); }
          66%  { transform: translate(10px, -16px) scale(1.06); }
          100% { transform: translate(0, 0) scale(1.08); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.18; }
          50%       { opacity: 0.38; }
        }
        .map-drift { animation: map-drift 28s ease-in-out infinite; }
        .pulse-dot { animation: pulse-dot 3s ease-in-out infinite; }
      `}</style>

      <div className="hidden lg:flex lg:w-[55%] relative flex-col overflow-hidden" style={{ background: "#0d0505" }}>
        <div className="map-drift absolute inset-[-10%] pointer-events-none" style={{ willChange: "transform" }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.07 }}>
            <defs>
              <pattern id="mapdots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="1.2" fill="#ffffff" />
              </pattern>
              <pattern id="mapgrid" x="0" y="0" width="128" height="128" patternUnits="userSpaceOnUse">
                <rect width="128" height="128" fill="url(#mapdots)" />
                <rect width="128" height="1" y="63" fill="rgba(255,255,255,0.06)" />
                <rect width="1" height="128" x="63" fill="rgba(255,255,255,0.06)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)" />
            {[
              { cx: "22%", cy: "38%" }, { cx: "48%", cy: "52%" },
              { cx: "65%", cy: "30%" }, { cx: "35%", cy: "65%" },
              { cx: "78%", cy: "60%" }, { cx: "55%", cy: "75%" },
            ].map(({ cx, cy }, i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="18" fill="rgba(183,28,28,0.12)" className="pulse-dot" style={{ animationDelay: `${i * 0.6}s` }} />
                <circle cx={cx} cy={cy} r="4" fill="rgba(183,28,28,0.35)" />
                <circle cx={cx} cy={cy} r="1.5" fill="#b71c1c" />
              </g>
            ))}
            <line x1="22%" y1="38%" x2="48%" y2="52%" stroke="rgba(183,28,28,0.18)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="48%" y1="52%" x2="65%" y2="30%" stroke="rgba(183,28,28,0.18)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="48%" y1="52%" x2="35%" y2="65%" stroke="rgba(183,28,28,0.18)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="48%" y1="52%" x2="78%" y2="60%" stroke="rgba(183,28,28,0.18)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>

        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 25% 55%, rgba(183,28,28,0.28) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(85,107,47,0.10) 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.7) 0%, transparent 60%)",
        }} />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_30px_rgba(183,28,28,0.5)]">
              <img src="/srca-logo.png" alt="SRCA" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-[3px] uppercase">Saudi Red Crescent</div>
              <div className="text-white/50 text-[10px] font-mono tracking-[2px] uppercase">هيئة الهلال الأحمر السعودي</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono tracking-[2px] uppercase border" style={{ color: "#b71c1c", borderColor: "rgba(183,28,28,0.4)", background: "rgba(183,28,28,0.1)" }}>
                Hajj Season 2026 — Active
              </span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-2">
              Hajj Health<br />
              <span style={{ color: "#b71c1c" }}>Command</span> Center
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm mt-4">
              AI-powered health monitoring for the Kingdom of Saudi Arabia. Real-time vital tracking, risk scoring, and emergency dispatch across all holy sites.
            </p>

            <div className="flex gap-5 mt-10">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex-1 rounded-2xl p-5 border border-white/10 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="text-3xl font-black text-white tracking-tight">{value}</div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Icon className="w-3 h-3" style={{ color: "#b71c1c" }} />
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/40 text-[11px] font-mono tracking-wider uppercase">All Systems Operational</span>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(183,28,28,0.4), transparent)" }} />
      </div>

      <div className="flex-1 flex flex-col" style={{ background: "#f8fafc" }}>
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "#e2e8f0", background: "rgba(255,255,255,0.9)" }}>
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 rounded-full overflow-hidden border" style={{ borderColor: "#e2e8f0" }}>
              <img src="/srca-logo.png" alt="SRCA" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm tracking-[2px] uppercase" style={{ color: "#1f1f1f" }}>Red Crescent</span>
          </div>
          <div className="lg:ml-auto">
            <button
              onClick={toggleLang}
              data-testid="button-landing-lang-toggle"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-xs font-bold transition-colors cursor-pointer border"
              style={{ background: "#ffffff", borderColor: "#e2e8f0", color: "#1f1f1f" }}
            >
              <Languages className="w-3.5 h-3.5" style={{ color: "#b71c1c" }} />
              {lang === "en" ? "عربي" : "EN"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 border-2 shadow-lg" style={{ borderColor: "rgba(183,28,28,0.3)", boxShadow: "0 4px 20px rgba(183,28,28,0.2)" }}>
                <img src="/srca-logo.png" alt="SRCA" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "#1f1f1f" }}>Operator Access</h2>
              <p className="text-sm mt-1 font-mono" style={{ color: "#4a4a4a" }}>Sign in to the command center</p>
            </div>

            <div className="rounded-2xl p-8 border shadow-md" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
              <div className="flex items-center gap-2 mb-6 pb-5 border-b" style={{ borderColor: "#e2e8f0" }}>
                <Lock className="w-3.5 h-3.5" style={{ color: "#b71c1c" }} />
                <span className="font-mono text-[10px] uppercase tracking-[2px]" style={{ color: "#4a4a4a" }}>{t("Operator Login")}</span>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "#4a4a4a" }}>{t("Username")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#4a4a4a" }} />
                          <Input
                            {...field}
                            placeholder="Enter username"
                            className="pl-10 h-11 rounded-xl border font-mono text-sm"
                            style={{ background: "#f8fafc", borderColor: "#e2e8f0", color: "#1f1f1f" }}
                            data-testid="input-username"
                            autoComplete="username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "#4a4a4a" }}>{t("Password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#4a4a4a" }} />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            className="pl-10 pr-10 h-11 rounded-xl border font-mono text-sm"
                            style={{ background: "#f8fafc", borderColor: "#e2e8f0", color: "#1f1f1f" }}
                            data-testid="input-password"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-opacity hover:opacity-70"
                            style={{ color: "#4a4a4a" }}
                            data-testid="button-toggle-password"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <button
                    type="submit"
                    disabled={isLoading}
                    data-testid="button-login"
                    className="w-full h-11 rounded-xl font-bold text-sm uppercase tracking-[2px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white mt-2"
                    style={{ background: "#b71c1c" }}
                  >
                    {isLoading ? (
                      <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        {t("Access Dashboard")}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </Form>
            </div>

            <div className="mt-5 flex items-center justify-center gap-0 rounded-xl overflow-hidden border" style={{ borderColor: "#e2e8f0", background: "#ffffff" }}>
              {[
                { icon: Activity, label: "AI Dispatch", color: "#b71c1c" },
                { icon: Wifi, label: "eSIM Voice", color: "#556b2f" },
                { icon: Navigation, label: "GPS Tracking", color: "#4682b4" },
              ].map(({ icon: Icon, label, color }, i) => (
                <div key={label} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 ${i < 2 ? "border-r" : ""}`} style={{ borderColor: "#e2e8f0" }}>
                  <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                  <span className="text-[10px] font-mono font-semibold" style={{ color: "#1f1f1f" }}>{label}</span>
                </div>
              ))}
            </div>

            <p className="text-center mt-6 text-[10px] font-mono tracking-wider" style={{ color: "#4a4a4a" }}>
              {t("Kingdom of Saudi Arabia - Ministry of Health")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
