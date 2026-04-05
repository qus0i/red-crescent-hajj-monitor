import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
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
  PhoneCall, Plus, Mic, FileText, Clock, MapPin, User,
  ChevronRight, Trash2, Pencil, Play, Pause, X,
} from "lucide-react";
import type { Ticket } from "@shared/schema";
import { AIAssistant } from "@/components/ui/ai-assistant";

const STATUSES = [
  { key: "not_emergency", label: "Not Emergency", labelAr: "غير طارئ", color: "bg-[#aaaaaa] border-slate-200", headerColor: "bg-slate-700", badge: "bg-slate-200 text-slate-700" },
  { key: "dispatched_paramedic", label: "Dispatched — Paramedic", labelAr: "تم إرسال المسعف", color: "bg-blue-50 border-blue-100", headerColor: "bg-blue-700", badge: "bg-blue-100 text-blue-700" },
  { key: "dispatched_ambulance", label: "Dispatched — Ambulance", labelAr: "تم إرسال سيارة إسعاف", color: "bg-rose-50 border-rose-100", headerColor: "bg-rose-700", badge: "bg-rose-100 text-rose-700" },
  { key: "dispatched_volunteer", label: "Dispatched — Volunteer", labelAr: "تم إرسال متطوع", color: "bg-amber-50 border-amber-100", headerColor: "bg-amber-700", badge: "bg-amber-100 text-amber-700" },
  { key: "resolved", label: "Resolved", labelAr: "تم الحل", color: "bg-emerald-50 border-emerald-100", headerColor: "bg-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
];

const PRIORITY_STYLES: Record<string, { badge: string; label: string; labelAr: string }> = {
  low:      { badge: "bg-[#aaaaaa] text-slate-700", label: "Low", labelAr: "منخفض" },
  medium:   { badge: "bg-amber-100 text-amber-700", label: "Medium", labelAr: "متوسط" },
  high:     { badge: "bg-orange-100 text-orange-700", label: "High", labelAr: "عالٍ" },
  critical: { badge: "bg-rose-100 text-rose-700", label: "Critical", labelAr: "حرج" },
};

const ZONES = [
  "Masjid Al-Haram", "Mina", "Arafat", "Muzdalifah",
  "Jamarat", "Al-Aziziyah", "Al-Nahr", "Medical City", "Other",
];

const ticketFormSchema = z.object({
  title: z.string().min(3, "Title required"),
  description: z.string().min(5, "Description required"),
  callerName: z.string().optional(),
  callerContact: z.string().optional(),
  zone: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  notes: z.string().optional(),
});
type TicketFormValues = z.infer<typeof ticketFormSchema>;

function formatAge(date: string | Date | null) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AudioPlayer({ url, name }: { url: string; name?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-full bg-blue-600 text-white"
        onClick={toggle}
        data-testid="button-audio-play"
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>
      <span className="text-xs text-blue-700 truncate max-w-[180px]">{name || "Audio recording"}</span>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
    </div>
  );
}

function FileUploadField({
  label, accept, onUploaded, current, currentName, onClear,
}: {
  label: string; accept: string;
  onUploaded: (url: string, name: string) => void;
  current?: string | null; currentName?: string | null;
  onClear: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!resp.ok) throw new Error("Upload failed");
      const data = await resp.json();
      onUploaded(data.url, file.name);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {current ? (
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
          <FileText className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs text-slate-600 truncate flex-1">{currentName || current}</span>
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-rose-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 hover:border-blue-400 bg-white"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragEnter={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          data-testid={`upload-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              <span className="text-xs text-slate-500">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dragging ? "bg-blue-100" : "bg-[#aaaaaa]"}`}>
                <FileText className={`h-4 w-4 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
              </div>
              <span className={`text-xs font-medium ${dragging ? "text-blue-600" : "text-slate-500"}`}>
                {dragging ? "Drop to upload" : "Drag & drop or click to upload"}
              </span>
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket, onClick, onMove, lang,
}: {
  ticket: Ticket; onClick: () => void; onMove: (status: string) => void; lang: string;
}) {
  const [showMove, setShowMove] = useState(false);
  const prio = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium;
  const statusDef = STATUSES.find(s => s.key === ticket.status);

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm cursor-pointer group"
      data-testid={`card-ticket-${ticket.id}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-slate-400">{ticket.ticketNumber}</span>
        <Badge className={`text-[10px] px-1.5 py-0 h-4 rounded-sm font-medium ${prio.badge}`}>
          {lang === "ar" ? prio.labelAr : prio.label}
        </Badge>
      </div>

      <p className="text-sm font-semibold text-slate-800 leading-snug mb-2">{ticket.title}</p>

      <div className="space-y-1">
        {ticket.zone && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3" />
            <span>{ticket.zone}</span>
          </div>
        )}
        {ticket.callerName && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <User className="h-3 w-3" />
            <span>{ticket.callerName}</span>
            {ticket.callerContact && <span className="text-slate-400">· {ticket.callerContact}</span>}
          </div>
        )}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{formatAge(ticket.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200">
        {ticket.audioUrl && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5">
            <Mic className="h-2.5 w-2.5" /> Audio
          </span>
        )}
        {(ticket.transcriptUrl || ticket.transcriptText) && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-slate-50 text-slate-500 rounded px-1.5 py-0.5">
            <FileText className="h-2.5 w-2.5" /> Transcript
          </span>
        )}
        <div className="flex-1" />
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
            onClick={() => setShowMove(v => !v)}
            data-testid={`button-move-ticket-${ticket.id}`}
          >
            Move <ChevronRight className="h-3 w-3" />
          </button>
          {showMove && (
            <div className="absolute bottom-6 right-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg w-52 py-1">
              {STATUSES.filter(s => s.key !== ticket.status).map(s => (
                <button
                  key={s.key}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700"
                  onClick={() => { onMove(s.key); setShowMove(false); }}
                  data-testid={`button-status-${s.key}`}
                >
                  {lang === "ar" ? s.labelAr : s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetailDialog({
  ticket, open, onClose, onStatusChange, onEdit, onDelete,
}: {
  ticket: Ticket | null; open: boolean; onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: number) => void;
}) {
  const { t, lang } = useI18n();
  if (!ticket) return null;
  const prio = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium;
  const statusDef = STATUSES.find(s => s.key === ticket.status);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-blue-600" />
            <span className="font-mono text-sm text-slate-400">{ticket.ticketNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg text-slate-800">{ticket.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs ${prio.badge}`}>{lang === "ar" ? prio.labelAr : prio.label}</Badge>
              {statusDef && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusDef.badge}`}>
                  {lang === "ar" ? statusDef.labelAr : statusDef.label}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {ticket.callerName && (
              <div>
                <span className="text-xs text-slate-400 block">{t("callerName")}</span>
                <span className="font-medium text-slate-700">{ticket.callerName}</span>
              </div>
            )}
            {ticket.callerContact && (
              <div>
                <span className="text-xs text-slate-400 block">{t("callerContact")}</span>
                <span className="font-medium text-slate-700">{ticket.callerContact}</span>
              </div>
            )}
            {ticket.zone && (
              <div>
                <span className="text-xs text-slate-400 block">{t("zone")}</span>
                <span className="font-medium text-slate-700">{ticket.zone}</span>
              </div>
            )}
            <div>
              <span className="text-xs text-slate-400 block">{t("created")}</span>
              <span className="font-medium text-slate-700">{formatAge(ticket.createdAt)}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1">{t("description")}</span>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {ticket.notes && (
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t("notes")}</span>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{ticket.notes}</p>
            </div>
          )}

          {ticket.audioUrl && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">{t("audioRecording")}</span>
              <AudioPlayer url={ticket.audioUrl} name={ticket.audioName} />
            </div>
          )}

          {ticket.transcriptUrl && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">{t("transcriptFile")}</span>
              <a
                href={ticket.transcriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 underline"
              >
                <FileText className="h-4 w-4" />
                {ticket.transcriptName || "View transcript"}
              </a>
            </div>
          )}

          {ticket.transcriptText && (
            <div>
              <span className="text-xs text-slate-400 block mb-1">{t("transcriptText")}</span>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
                {ticket.transcriptText}
              </p>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-400 block mb-2">{t("moveToColumn")}</span>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.filter(s => s.key !== ticket.status).map(s => (
                <button
                  key={s.key}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${s.badge} border-current/20`}
                  onClick={() => { onStatusChange(ticket.id, s.key); onClose(); }}
                  data-testid={`button-detail-status-${s.key}`}
                >
                  {lang === "ar" ? s.labelAr : s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => { onDelete(ticket.id); onClose(); }}
            data-testid="button-delete-ticket"
          >
            <Trash2 className="h-4 w-4 mr-1" /> {t("delete")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} data-testid="button-close-detail">
              {t("close")}
            </Button>
            <Button type="button" size="sm" onClick={() => { onEdit(ticket); onClose(); }} data-testid="button-edit-ticket">
              <Pencil className="h-4 w-4 mr-1" /> {t("edit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TicketFormDialog({
  open, onClose, editTicket,
}: {
  open: boolean; onClose: () => void; editTicket?: Ticket | null;
}) {
  const { t, lang } = useI18n();
  const [audioUrl, setAudioUrl] = useState(editTicket?.audioUrl || "");
  const [audioName, setAudioName] = useState(editTicket?.audioName || "");
  const [transcriptUrl, setTranscriptUrl] = useState(editTicket?.transcriptUrl || "");
  const [transcriptName, setTranscriptName] = useState(editTicket?.transcriptName || "");

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: editTicket?.title || "",
      description: editTicket?.description || "",
      callerName: editTicket?.callerName || "",
      callerContact: editTicket?.callerContact || "",
      zone: editTicket?.zone || "",
      priority: (editTicket?.priority as any) || "medium",
      notes: editTicket?.notes || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tickets", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/tickets/${editTicket!.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }); onClose(); },
  });

  const onSubmit = (values: TicketFormValues) => {
    const payload = {
      ...values,
      audioUrl: audioUrl || null,
      audioName: audioName || null,
      transcriptUrl: transcriptUrl || null,
      transcriptName: transcriptName || null,
    };
    if (editTicket) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-blue-600" />
            {editTicket ? t("editTicket") : t("newTicket")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("ticketTitle")}</FormLabel>
                <FormControl>
                  <Input placeholder={lang === "ar" ? "عنوان البلاغ..." : "Incident title..."} {...field} data-testid="input-ticket-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("priority")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORITY_STYLES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{lang === "ar" ? v.labelAr : v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="zone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("zone")}</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-zone">
                        <SelectValue placeholder={lang === "ar" ? "اختر المنطقة" : "Select zone"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="callerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("callerName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={lang === "ar" ? "اسم المتصل" : "Caller name"} {...field} data-testid="input-caller-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="callerContact" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("callerContact")}</FormLabel>
                  <FormControl>
                    <Input placeholder="+966 5xx xxx xxxx" {...field} data-testid="input-caller-contact" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={lang === "ar" ? "وصف الحادثة..." : "Incident description..."}
                    rows={3}
                    {...field}
                    data-testid="textarea-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("notes")} <span className="text-xs text-slate-400">({lang === "ar" ? "اختياري" : "optional"})</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={lang === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
                    rows={2}
                    {...field}
                    data-testid="textarea-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-3 border-t border-slate-200 pt-3">
              <p className="text-sm font-medium text-slate-600">{t("attachments")}</p>
              <FileUploadField
                label={lang === "ar" ? "تسجيل صوتي" : "Audio Recording"}
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                current={audioUrl}
                currentName={audioName}
                onUploaded={(url, name) => { setAudioUrl(url); setAudioName(name); }}
                onClear={() => { setAudioUrl(""); setAudioName(""); }}
              />
              <FileUploadField
                label={lang === "ar" ? "ملف النص" : "Transcript File"}
                accept=".txt,.pdf,.docx,.doc"
                current={transcriptUrl}
                currentName={transcriptName}
                onUploaded={(url, name) => { setTranscriptUrl(url); setTranscriptName(name); }}
                onClear={() => { setTranscriptUrl(""); setTranscriptName(""); }}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-ticket">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-ticket">
                {isPending ? t("saving") : editTicket ? t("saveChanges") : t("createTicket")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function OutboundTickets() {
  const { t, lang } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [editTicket, setEditTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/tickets/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tickets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tickets"] }),
  });

  const byStatus = (status: string) => tickets.filter(t => t.status === status);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">{t("outboundTickets")}</h2>
          <Badge className="bg-[#aaaaaa] text-slate-600 ml-1">{tickets.length}</Badge>
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => { setEditTicket(null); setFormOpen(true); }}
          data-testid="button-new-ticket"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Patient
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-2 h-full p-3">
            {STATUSES.map(col => {
              const colTickets = byStatus(col.key);
              return (
                <div
                  key={col.key}
                  className={`flex flex-col flex-1 min-w-0 rounded-xl border ${col.color}`}
                  data-testid={`column-${col.key}`}
                >
                  <div className={`${col.headerColor} text-white rounded-t-xl px-2.5 py-2 flex items-center justify-between gap-1`}>
                    <span className="text-xs font-semibold truncate">
                      {lang === "ar" ? col.labelAr : col.label}
                    </span>
                    <span className="bg-white/20 text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {colTickets.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-200px)]">
                    {colTickets.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-xs text-slate-400">
                        {lang === "ar" ? "لا توجد بطاقات" : "No tickets"}
                      </div>
                    ) : (
                      colTickets.map(ticket => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          lang={lang}
                          onClick={() => setDetailTicket(ticket)}
                          onMove={status => moveMutation.mutate({ id: ticket.id, status })}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
          <AIAssistant />
        </div>
      )}

      <TicketFormDialog
        open={formOpen || !!editTicket}
        onClose={() => { setFormOpen(false); setEditTicket(null); }}
        editTicket={editTicket}
      />

      <TicketDetailDialog
        ticket={detailTicket}
        open={!!detailTicket}
        onClose={() => setDetailTicket(null)}
        onStatusChange={(id, status) => moveMutation.mutate({ id, status })}
        onEdit={t => { setDetailTicket(null); setEditTicket(t); }}
        onDelete={id => deleteMutation.mutate(id)}
      />
    </div>
  );
}
