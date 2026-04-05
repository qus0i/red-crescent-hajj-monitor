import { useQuery } from "@tanstack/react-query";
import type { Group } from "@shared/schema";
import { Users } from "lucide-react";

interface GroupsPanelCompactProps {
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}

export function GroupsPanelCompact({ selectedGroupId, onSelectGroup }: GroupsPanelCompactProps) {
  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  return (
    <div className="flex flex-col items-center gap-1.5" data-testid="groups-panel-compact">
      <button
        onClick={() => onSelectGroup(null)}
        data-testid="button-all-groups-compact"
        title="All Groups"
        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
          selectedGroupId === null
            ? "border-h-teal bg-h-teal/20 text-h-teal-bright"
            : "border-h-border bg-h-surface2 text-h-text-dim hover:border-h-teal hover:text-h-teal"
        }`}
      >
        <Users className="w-3 h-3" />
      </button>
      {isLoading ? (
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-5 h-5 rounded-full bg-h-surface2 animate-pulse" />
          ))}
        </div>
      ) : (
        groups.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            data-testid={`button-group-dot-${g.id}`}
            title={g.name}
            className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer flex-shrink-0 ${
              selectedGroupId === g.id
                ? "scale-125 border-white shadow-md"
                : "border-transparent opacity-80 hover:opacity-100 hover:scale-110"
            }`}
            style={{ backgroundColor: g.color }}
          />
        ))
      )}
    </div>
  );
}
