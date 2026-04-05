import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import Dashboard from "@/pages/dashboard";
import AdminPortal from "@/pages/admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/admin" component={AdminPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setUser(data);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8fafc" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
            <img src="/srca-logo.png" alt="SRCA" className="w-full h-full object-cover" />
          </div>
          <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: "#b71c1c", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {user ? <Router /> : <Login onLogin={setUser} />}
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
