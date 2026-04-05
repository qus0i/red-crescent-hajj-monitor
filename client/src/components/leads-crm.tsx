import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Phone, Plus, Upload, Trash2, Pencil, Play, Pause,
  MapPin, ChevronDown, ChevronUp, Calendar, BarChart3,
  Clock, User, Search,
} from "lucide-react";
import type { Lead, LeadCall } from "@shared/schema";

const CASE_STATUSES = [
  { key: "not_emergency", label: "Not Emergency", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "dispatched_paramedic", label: "Dispatched Paramedic", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "dispatched_ambulance", label: "Dispatched Ambulance", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { key: "dispatched_volunteer", label: "Dispatched Volunteer", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "resolved", label: "Resolved", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

const CALL_STATUSES = [
  { key: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { key: "no_answer", label: "No Answer", color: "bg-amber-100 text-amber-700" },
  { key: "voicemail", label: "Voicemail", color: "bg-blue-100 text-blue-700" },
  { key: "follow_up_needed", label: "Follow-Up Needed", color: "bg-rose-100 text-rose-700" },
];

function getStatusDef(key: string) {
  return CASE_STATUSES.find(s => s.key === key) || CASE_STATUSES[0];
}

function getCallStatusDef(key: string) {
  return CALL_STATUSES.find(s => s.key === key) || CALL_STATUSES[0];
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(date: string | Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(date: string | Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  watchId: z.string().optional(),
  status: z.string().default("not_emergency"),
});
type LeadFormValues = z.infer<typeof leadFormSchema>;

function CallAudioPlayer({ url, name }: { url: string; name?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = parseFloat(e.target.value);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const idx = speeds.indexOf(speed);
    const next = speeds[(idx + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button" size="icon" variant="ghost"
          className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          onClick={toggle} data-testid="button-call-audio-play"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <div className="flex-1 space-y-1">
          <input
            type="range" min={0} max={duration || 0} step={0.1} value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 accent-blue-600 cursor-pointer"
            data-testid="input-audio-seek"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <button
          type="button" onClick={cycleSpeed}
          className="text-[10px] font-mono bg-slate-200 hover:bg-slate-300 rounded px-1.5 py-0.5 text-slate-600 shrink-0"
          data-testid="button-audio-speed"
        >
          {speed}x
        </button>
      </div>
      {name && <p className="text-[11px] text-slate-500 truncate">{name}</p>}
      <audio
        ref={audioRef} src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

function TranscriptBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n").filter(Boolean);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600"
        data-testid="button-toggle-transcript"
      >
        <span>Transcript ({lines.length} lines)</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="p-3 max-h-48 overflow-y-auto space-y-1.5">
          {lines.map((line, i) => {
            const isAgent = line.toLowerCase().startsWith("agent:");
            const isUser = line.toLowerCase().startsWith("user:") || line.toLowerCase().startsWith("caller:");
            return (
              <div key={i} className="flex gap-2 text-xs">
                {(isAgent || isUser) && (
                  <span className={`shrink-0 font-semibold ${isAgent ? "text-blue-600" : "text-emerald-600"}`}>
                    {isAgent ? "Agent" : "Caller"}:
                  </span>
                )}
                <span className="text-slate-700">
                  {isAgent || isUser ? line.replace(/^(agent|user|caller):\s*/i, "") : line}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadFormDialog({
  open, onClose, editLead,
}: {
  open: boolean; onClose: () => void; editLead?: Lead | null;
}) {
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: editLead?.name || "",
      phone: editLead?.phone || "",
      address: editLead?.address || "",
      watchId: editLead?.watchId || "",
      status: editLead?.status || "not_emergency",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: LeadFormValues) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leads"] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: LeadFormValues) => apiRequest("PATCH", `/api/leads/${editLead!.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leads"] }); onClose(); },
  });

  const onSubmit = (values: LeadFormValues) => {
    if (editLead) updateMutation.mutate(values);
    else createMutation.mutate(values);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editLead ? "Edit Case" : "New Case"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Full name..." {...field} data-testid="input-lead-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-lead-phone" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input placeholder="123 Main St..." {...field} data-testid="input-lead-address" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="watchId" render={({ field }) => (
              <FormItem>
                <FormLabel>Watch ID</FormLabel>
                <FormControl><Input placeholder="WTC-001" {...field} data-testid="input-lead-watchid" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-lead-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CASE_STATUSES.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-lead">Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-lead">
                {isPending ? "Saving..." : editLead ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UploadCallDialog({
  open, onClose, leadId,
}: {
  open: boolean; onClose: () => void; leadId: number;
}) {
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [callStatus, setCallStatus] = useState("completed");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  interface CallPayload {
    audioUrl: string | null;
    audioName: string | null;
    transcriptText: string | null;
    callStatus: string;
  }

  const createMutation = useMutation({
    mutationFn: (data: CallPayload) => apiRequest("POST", `/api/leads/${leadId}/calls`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "calls"] });
      onClose();
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      setAudioUrl(data.url);
      setAudioName(file.name);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    createMutation.mutate({
      audioUrl: audioUrl || null,
      audioName: audioName || null,
      transcriptText: transcriptText || null,
      callStatus,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Call Recording</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Audio File</label>
            {audioUrl ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="text-xs text-emerald-700 truncate flex-1">{audioName}</span>
                <button type="button" onClick={() => { setAudioUrl(""); setAudioName(""); }} className="text-slate-400 hover:text-rose-500 text-xs">Remove</button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => inputRef.current?.click()}
                data-testid="upload-call-audio"
              >
                {uploading
                  ? <span className="text-xs text-slate-500">Uploading...</span>
                  : <span className="text-xs text-slate-400">Click to upload audio file</span>
                }
                <input
                  ref={inputRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Call Status</label>
            <Select value={callStatus} onValueChange={setCallStatus}>
              <SelectTrigger data-testid="select-call-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALL_STATUSES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Transcript (optional)</label>
            <Textarea
              placeholder={"Agent: Hello, emergency line...\nCaller: I need help, my pilgrim..."}
              value={transcriptText}
              onChange={e => setTranscriptText(e.target.value)}
              rows={5}
              data-testid="input-call-transcript"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-call">Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-save-call">
            {createMutation.isPending ? "Saving..." : "Save Call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadListPanel({
  leads, selectedId, onSelect, onNewLead, searchQuery, onSearchChange,
}: {
  leads: Lead[]; selectedId: number | null; onSelect: (id: number) => void;
  onNewLead: () => void; searchQuery: string; onSearchChange: (q: string) => void;
}) {
  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery) ||
    (l.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[320px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white" data-testid="lead-list-panel">
      <div className="p-3 border-b border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-800">Cases</h2>
          <Button size="sm" onClick={onNewLead} className="h-7 text-xs gap-1" data-testid="button-new-lead">
            <Plus className="h-3.5 w-3.5" /> New Case
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
            data-testid="input-search-leads"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            {leads.length === 0 ? "No cases yet. Create one to get started." : "No cases match your search."}
          </div>
        ) : (
          filtered.map(lead => {
            const status = getStatusDef(lead.status);
            return (
              <div
                key={lead.id}
                onClick={() => onSelect(lead.id)}
                className={`px-3 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
                  selectedId === lead.id ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-slate-50"
                }`}
                data-testid={`lead-row-${lead.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {getInitials(lead.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{lead.name}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 h-4 rounded-sm font-medium border ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </div>
                    {lead.address && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" /> {lead.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LeadDetailPanel({
  lead, calls, isLoadingCalls, onEdit, onDelete, onStatusChange, onUploadCall,
}: {
  lead: Lead; calls: LeadCall[]; isLoadingCalls: boolean;
  onEdit: () => void; onDelete: () => void;
  onStatusChange: (status: string) => void; onUploadCall: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes || "");
  const [notesEdited, setNotesEdited] = useState(false);

  useEffect(() => {
    setNotes(lead.notes || "");
    setNotesEdited(false);
  }, [lead.id, lead.notes]);

  const updateNotesMutation = useMutation({
    mutationFn: (newNotes: string) => apiRequest("PATCH", `/api/leads/${lead.id}`, { notes: newNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setNotesEdited(false);
    },
  });

  const deleteCallMutation = useMutation({
    mutationFn: (callId: number) => apiRequest("DELETE", `/api/leads/${lead.id}/calls/${callId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "calls"] }); },
  });

  const status = getStatusDef(lead.status);
  const completedCallsCount = calls.filter(c => c.callStatus === "completed").length;

  return (
    <div className="flex-1 flex overflow-hidden" data-testid="lead-detail-panel">
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {getInitials(lead.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800">{lead.name}</h2>
              <Badge className={`text-xs px-2 py-0.5 rounded-sm font-medium border ${status.color}`}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-sm">
              <a
                href={`tel:${lead.phone}`}
                className="text-blue-600 hover:underline flex items-center gap-1"
                data-testid="link-lead-phone"
              >
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </a>
              {lead.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                  data-testid="link-lead-address"
                >
                  <MapPin className="h-3.5 w-3.5" /> {lead.address}
                </a>
              )}
            </div>
            {lead.watchId && (
              <div className="text-xs text-slate-500 mt-1">Watch ID: {lead.watchId}</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={lead.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs" data-testid="select-detail-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_STATUSES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit} data-testid="button-edit-lead">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={onDelete} data-testid="button-delete-lead">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Call Timeline</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onUploadCall} data-testid="button-upload-call">
              <Upload className="h-3.5 w-3.5" /> Upload Call
            </Button>
          </div>
          {isLoadingCalls ? (
            <div className="text-xs text-slate-400 p-4 text-center">Loading calls...</div>
          ) : calls.length === 0 ? (
            <div className="text-xs text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-lg">
              No calls recorded yet. Upload a call recording to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map(call => {
                const callStatus = getCallStatusDef(call.callStatus);
                return (
                  <div key={call.id} className="border border-slate-200 rounded-lg p-3 space-y-2" data-testid={`call-card-${call.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs text-slate-600">{formatDateTime(call.createdAt)}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 h-4 rounded-sm font-medium ${callStatus.color}`}>
                          {callStatus.label}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteCallMutation.mutate(call.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors"
                        data-testid={`button-delete-call-${call.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {call.audioUrl && (
                      <CallAudioPlayer url={call.audioUrl} name={call.audioName} />
                    )}
                    {call.transcriptText && (
                      <TranscriptBlock text={call.transcriptText} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-[260px] shrink-0 border-l border-slate-200 p-4 space-y-4 overflow-y-auto bg-slate-50/50">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</h4>
          <Textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesEdited(true); }}
            onBlur={() => { if (notesEdited) updateNotesMutation.mutate(notes); }}
            placeholder="Add notes about this case..."
            rows={6}
            className="text-xs resize-none"
            data-testid="textarea-lead-notes"
          />
          {updateNotesMutation.isPending && (
            <span className="text-[10px] text-slate-400 mt-1 block">Saving...</span>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Stats</h4>
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800" data-testid="text-total-calls">{calls.length}</div>
                <div className="text-[10px] text-slate-500">Total Calls</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800" data-testid="text-appointments-count">{completedCallsCount}</div>
                <div className="text-[10px] text-slate-500">Completed Calls</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-800" data-testid="text-created-date">{formatDate(lead.createdAt)}</div>
                <div className="text-[10px] text-slate-500">Created</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeadsCRM() {
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [showUploadCall, setShowUploadCall] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leadsList = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const selectedLead = leadsList.find(l => l.id === selectedLeadId) || null;

  const { data: calls = [], isLoading: callsLoading } = useQuery<LeadCall[]>({
    queryKey: ["/api/leads", selectedLeadId, "calls"],
    queryFn: async () => {
      if (!selectedLeadId) return [];
      const res = await fetch(`/api/leads/${selectedLeadId}/calls`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calls");
      return res.json();
    },
    enabled: !!selectedLeadId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLeadId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/leads/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/leads"] }); },
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-white" data-testid="leads-crm">
      <LeadListPanel
        leads={leadsList}
        selectedId={selectedLeadId}
        onSelect={setSelectedLeadId}
        onNewLead={() => setShowNewLead(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          calls={calls}
          isLoadingCalls={callsLoading}
          onEdit={() => setEditLead(selectedLead)}
          onDelete={() => { if (confirm("Delete this case and all its calls?")) deleteMutation.mutate(selectedLead.id); }}
          onStatusChange={(status) => statusMutation.mutate({ id: selectedLead.id, status })}
          onUploadCall={() => setShowUploadCall(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center" data-testid="lead-empty-state">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
              <User className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500">Select a case to view details</p>
            <p className="text-xs text-slate-400">or create a new case to get started</p>
          </div>
        </div>
      )}

      {showNewLead && (
        <LeadFormDialog open={true} onClose={() => setShowNewLead(false)} />
      )}

      {editLead && (
        <LeadFormDialog open={true} onClose={() => setEditLead(null)} editLead={editLead} />
      )}

      {showUploadCall && selectedLeadId && (
        <UploadCallDialog open={true} onClose={() => setShowUploadCall(false)} leadId={selectedLeadId} />
      )}
    </div>
  );
}
