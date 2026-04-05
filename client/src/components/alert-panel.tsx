import { AlertTriangle, CircleAlert, Bell, Check, Clock, Phone } from "lucide-react";
import type { Alert } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AlertPanelProps {
  alerts: Alert[];
  isLoading: boolean;
}

function getTimeAgo(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function AlertPanel({ alerts, isLoading }: AlertPanelProps) {
  const activeCount = alerts.filter((a) => !a.acknowledged).length;
  const { toast } = useToast();

  const ackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const handleCall = (a: Alert) => {
    const label = a.title ? `re: ${a.title}` : "alert";
    toast({
      title: `Calling ${label}...`,
      description: "Dispatching call to responding unit.",
    });
  };

  return (
    <div className="border-b border-h-border flex flex-col flex-1 min-h-0" data-testid="alert-section">
      <div className="px-4 py-3 border-b border-h-border flex items-center justify-between flex-shrink-0">
        <span className="font-display font-bold text-xs tracking-[2px] uppercase text-h-text-dim flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-h-amber" />
          Alerts
        </span>
        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
          activeCount > 0 ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
        }`} data-testid="text-alert-count">
          {activeCount > 0 ? `${activeCount} ACTIVE` : "ALL CLEAR"}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 scrollbar-thin" data-testid="alert-list">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-h-surface2 border border-h-border rounded-lg p-3 animate-pulse">
                <div className="h-3 bg-h-surface3 rounded w-3/4 mb-2" />
                <div className="h-2.5 bg-h-surface3 rounded w-full" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="font-mono text-xs text-h-text-dim">No active alerts</p>
          </div>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              data-testid={`alert-item-${a.id}`}
              className={`rounded-lg p-2.5 px-3 mb-1.5 flex items-start gap-2.5 transition-all border-l-[3px] border ${
                a.acknowledged ? "opacity-40" : "animate-fade-in-up"
              } ${
                a.type === "critical"
                  ? "border-l-rose-500 border-rose-100 bg-rose-50/50"
                  : "border-l-amber-500 border-amber-100 bg-amber-50/50"
              } ${!a.acknowledged && a.type === "critical" ? "vital-glow-critical" : ""}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {a.type === "critical" ? (
                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                    <CircleAlert className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-xs text-h-text-bright tracking-[0.5px] truncate" data-testid={`text-alert-title-${a.id}`}>
                  {a.title}
                </div>
                <div className="text-[11px] text-h-text-dim mt-0.5 leading-snug line-clamp-2">
                  {a.description}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-[9px] text-h-text-dim flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {getTimeAgo(a.createdAt)}
                  </span>
                  {!a.acknowledged && (
                    <>
                      <button
                        onClick={() => ackMutation.mutate(a.id)}
                        disabled={ackMutation.isPending}
                        data-testid={`button-ack-${a.id}`}
                        className="font-mono text-[9px] px-2 py-0.5 rounded cursor-pointer uppercase tracking-[0.5px] border transition-all bg-teal-50 border-teal-200 text-teal-700 hover-elevate"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleCall(a)}
                        data-testid={`button-call-${a.id}`}
                        title="Call dispatch"
                        className="p-0.5 rounded cursor-pointer border transition-all bg-emerald-50 border-emerald-200 text-emerald-700 hover-elevate flex items-center justify-center"
                      >
                        <Phone className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
