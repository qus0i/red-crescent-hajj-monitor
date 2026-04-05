import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group } from "@shared/schema";
import { Users, Plus, Trash2, Edit2, X, Check, FolderOpen } from "lucide-react";

interface GroupsPanelProps {
  selectedGroupId: number | null;
  onSelectGroup: (id: number | null) => void;
}

export function GroupsPanel({ selectedGroupId, onSelectGroup }: GroupsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState("#0d9488");

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; color: string }) =>
      apiRequest("POST", "/api/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setIsCreating(false);
      setFormName("");
      setFormDesc("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      if (selectedGroupId) onSelectGroup(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description: string; color: string } }) =>
      apiRequest("PATCH", `/api/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setEditingId(null);
    },
  });

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormDesc(g.description || "");
    setFormColor(g.color);
  };

  const colors = ["#0d9488", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4", "#ef4444", "#a855f7", "#f97316"];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden card-premium" data-testid="groups-panel">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <span className="font-display font-bold text-sm tracking-[1.5px] uppercase text-h-text-dim flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-h-teal" />
          Groups
        </span>
        <button
          onClick={() => { setIsCreating(!isCreating); setEditingId(null); setFormName(""); setFormDesc(""); }}
          data-testid="button-create-group"
          className="font-mono text-[10px] px-2.5 py-1 rounded-md cursor-pointer uppercase tracking-[0.5px] border transition-all bg-h-teal/10 border-h-teal-dim text-h-teal hover-elevate flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {isCreating && (
        <div className="p-3 border-b border-h-border bg-h-surface2 space-y-2">
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Group name..."
            data-testid="input-group-name"
            className="w-full bg-h-surface border border-h-border rounded-md px-3 py-1.5 text-xs text-h-text-bright placeholder:text-h-text-dim font-mono focus:outline-none focus:border-h-teal"
          />
          <input
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Description..."
            data-testid="input-group-desc"
            className="w-full bg-h-surface border border-h-border rounded-md px-3 py-1.5 text-xs text-h-text-bright placeholder:text-h-text-dim font-mono focus:outline-none focus:border-h-teal"
          />
          <div className="flex gap-1 flex-wrap">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setFormColor(c)}
                className={`w-5 h-5 rounded-full cursor-pointer border-2 transition-all ${formColor === c ? "border-h-text-bright scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate({ name: formName, description: formDesc, color: formColor })}
              disabled={!formName || createMutation.isPending}
              data-testid="button-save-group"
              className="font-mono text-[10px] px-3 py-1.5 rounded-md cursor-pointer uppercase border bg-h-teal/20 border-h-teal-dim text-h-teal hover-elevate disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="font-mono text-[10px] px-3 py-1.5 rounded-md cursor-pointer uppercase border bg-h-surface border-h-border text-h-text-dim hover-elevate"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
        <button
          onClick={() => onSelectGroup(null)}
          data-testid="button-all-groups"
          className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer border-b border-h-border ${
            selectedGroupId === null ? "bg-h-teal/10 text-h-teal-bright" : "text-h-text-dim hover-elevate"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="font-display font-semibold text-xs tracking-[1px] uppercase">All Groups</span>
        </button>

        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-h-surface2 rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g.id}
              data-testid={`group-item-${g.id}`}
              className={`px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer border-b border-h-border group ${
                selectedGroupId === g.id ? "bg-h-teal/10" : "hover-elevate"
              }`}
            >
              {editingId === g.id ? (
                <div className="flex-1 space-y-1.5">
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-h-surface border border-h-border rounded px-2 py-1 text-xs text-h-text-bright font-mono focus:outline-none focus:border-h-teal"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateMutation.mutate({ id: g.id, data: { name: formName, description: formDesc, color: formColor } })}
                      className="p-1 text-h-emerald"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-h-text-dim">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                  />
                  <div className="flex-1 min-w-0" onClick={() => onSelectGroup(g.id)}>
                    <div className="font-display font-semibold text-xs text-h-text-bright tracking-[0.5px] truncate">
                      {g.name}
                    </div>
                    {g.description && (
                      <div className="font-mono text-[9px] text-h-text-dim truncate">{g.description}</div>
                    )}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(g)} className="p-1 text-h-text-dim" data-testid={`button-edit-group-${g.id}`}>
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(g.id)} className="p-1 text-h-rose" data-testid={`button-delete-group-${g.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
