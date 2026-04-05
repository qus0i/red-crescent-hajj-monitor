import { useState, useEffect } from "react";
import { Activity, Bell, Search, Radio, Zap, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DashboardHeaderProps {
  alertCount: number;
  totalPersonnel: number;
  onSearch: (query: string) => void;
}

export function DashboardHeader({ alertCount, totalPersonnel, onSearch }: DashboardHeaderProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const { t, lang, toggleLang } = useI18n();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Riyadh" }));
      setDate(now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Riyadh" }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    onSearch(val);
  };

  return (
    <header className="flex items-center justify-between px-3 md:px-5 h-12 glass-panel-strong border-b border-h-border flex-shrink-0 relative z-50" data-testid="header">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-800 to-transparent opacity-40" />
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-red-700/60 to-transparent animate-scan-line" />
      </div>

      <div className="flex items-center gap-2" data-testid="logo">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
          <img src="/srca-logo.png" alt="SRCA" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-[12px] md:text-[14px] tracking-[2px] text-h-text-bright uppercase" data-testid="text-logo-title">
            {t("Red Crescent")}
          </span>
          <span className="hidden md:block font-mono text-[8px] text-h-text tracking-[1.5px] uppercase">
            {t("Hajj Health Command Center")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2.5" data-testid="header-right">
        {/* Search — desktop only */}
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-h-text-dim absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder={t("Search...")}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="input-search"
            className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-h-text-bright placeholder:text-h-text-dim font-mono tracking-wide w-36 focus:outline-none focus:border-h-teal focus:ring-1 focus:ring-h-teal/20 transition-all"
          />
        </div>

        {/* Lang toggle */}
        <button
          onClick={toggleLang}
          data-testid="button-lang-toggle"
          className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold text-h-text tracking-[1px] cursor-pointer hover:bg-[#aaaaaa] transition-colors"
          title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
        >
          <Languages className="w-3.5 h-3.5 text-h-teal" />
          <span className="hidden sm:inline">{lang === "en" ? "عربي" : "EN"}</span>
        </button>

        {/* Live badge */}
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1" data-testid="live-badge">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-pulse-ring" />
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-emerald-700 font-bold tracking-[1.5px]">{t("LIVE")}</span>
          <Radio className="w-3 h-3 text-emerald-500 animate-subtle-breathe" />
        </div>

        {/* Alert count */}
        {alertCount > 0 && (
          <div className="bg-rose-50 text-rose-700 font-mono text-[11px] font-bold px-2 py-1 rounded-lg animate-alert-glow flex items-center gap-1 border border-rose-200" data-testid="text-alert-counter">
            <Bell className="w-3 h-3" />
            {alertCount}
          </div>
        )}

        {/* Personnel count — desktop only */}
        <div className="hidden md:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" data-testid="text-personnel-count">
          <Zap className="w-3 h-3 text-h-teal" />
          <span className="font-mono text-[11px] text-h-text font-semibold">{totalPersonnel}</span>
          <span className="font-mono text-[9px] text-h-text-dim uppercase">{t("tracked")}</span>
        </div>

        {/* Clock — desktop only */}
        <div className="hidden md:flex flex-col items-end" data-testid="text-clock">
          <span className="font-mono text-[12px] text-h-text-bright font-bold tracking-[1px] leading-tight">{time}</span>
          <span className="font-mono text-[8px] text-h-text-dim tracking-[1px] uppercase leading-tight">{date} AST</span>
        </div>
      </div>
    </header>
  );
}
