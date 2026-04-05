import { useQuery } from "@tanstack/react-query";
import { Stethoscope, MapPin, Navigation, Phone, Clock } from "lucide-react";
import type { Personnel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface NearestRespondersProps {
  personnelId: number;
  personnelName: string;
}

interface ResponderWithDistance extends Personnel {
  distance: number;
}

const ROLE_ICONS: Record<string, { bg: string; text: string; label: string }> = {
  paramedic: { bg: "bg-red-50", text: "text-red-600", label: "Paramedic" },
  doctor: { bg: "bg-blue-50", text: "text-blue-600", label: "Doctor" },
  nurse: { bg: "bg-purple-50", text: "text-purple-600", label: "Nurse" },
};

export function NearestResponders({ personnelId, personnelName }: NearestRespondersProps) {
  const { toast } = useToast();

  const { data: responders = [], isLoading } = useQuery<ResponderWithDistance[]>({
    queryKey: ["/api/personnel", personnelId, "nearest-responders"],
    queryFn: async () => {
      const res = await fetch(`/api/personnel/${personnelId}/nearest-responders?limit=5`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!personnelId,
  });

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const estimateETA = (km: number) => {
    const walkingMinutes = (km / 5) * 60;
    if (walkingMinutes < 1) return "< 1 min";
    if (walkingMinutes < 60) return `~${Math.round(walkingMinutes)} min`;
    return `~${(walkingMinutes / 60).toFixed(1)} hr`;
  };

  const handleDispatch = (responder: ResponderWithDistance) => {
    toast({
      title: "Responder Dispatched",
      description: `${responder.name} (${ROLE_ICONS[responder.role]?.label || responder.role}) dispatched to ${personnelName}. ETA: ${estimateETA(responder.distance)}`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-3 border-t border-h-border">
        <div className="font-mono text-[9px] tracking-[2px] text-h-teal uppercase mb-2 flex items-center gap-1.5">
          <Stethoscope className="w-3 h-3" />
          Nearest Responders
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-h-surface2 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-h-border" data-testid="nearest-responders">
      <div className="font-mono text-[9px] tracking-[2px] text-h-teal uppercase mb-2 flex items-center gap-1.5">
        <Stethoscope className="w-3 h-3" />
        Nearest Medical Responders
      </div>

      {responders.length === 0 ? (
        <div className="text-center py-4">
          <p className="font-mono text-[10px] text-h-text-dim">No responders available nearby</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {responders.map((r, index) => {
            const roleInfo = ROLE_ICONS[r.role] || { bg: "bg-slate-50", text: "text-slate-600", label: r.role };
            return (
              <div
                key={r.id}
                data-testid={`responder-${r.id}`}
                className="bg-h-surface2 border border-h-border rounded-md p-2 px-2.5 hover:border-h-teal/30 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] text-h-text-dim w-4">{index + 1}.</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${roleInfo.bg} ${roleInfo.text}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-h-teal">
                    <Navigation className="w-2.5 h-2.5" />
                    {formatDistance(r.distance)}
                  </div>
                </div>

                <div className="font-display font-bold text-[11px] text-h-text-bright truncate">{r.name}</div>
                <div className="font-mono text-[9px] text-h-text-dim">{r.externalId}</div>

                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2 text-[9px] font-mono text-h-text-dim">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{r.zone}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{estimateETA(r.distance)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDispatch(r)}
                    data-testid={`button-dispatch-${r.id}`}
                    className="font-mono text-[8px] px-2 py-0.5 rounded cursor-pointer uppercase tracking-[0.5px] border bg-h-rose/10 border-h-rose-dim/50 text-h-rose hover:bg-h-rose/20 transition-all"
                  >
                    Dispatch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
