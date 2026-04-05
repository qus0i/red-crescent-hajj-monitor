import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  UserPlus, Watch, User, Heart, MapPin, Phone, Globe,
  Pill, FileText, ShieldAlert, CheckCircle, AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Group } from "@shared/schema";

const registerSchema = z.object({
  externalId: z.string().min(3, "Watch ID must be at least 3 characters").max(20, "Watch ID max 20 characters"),
  name: z.string().min(2, "Name is required"),
  age: z.coerce.number().min(1, "Age must be at least 1").max(120, "Invalid age"),
  gender: z.enum(["M", "F"], { required_error: "Select gender" }),
  bloodType: z.string().optional(),
  role: z.enum(["pilgrim", "paramedic", "doctor", "nurse"]).default("pilgrim"),
  groupId: z.coerce.number().optional(),
  zone: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  illnesses: z.string().optional(),
  medications: z.string().optional(),
  medicalHistory: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ZONES = ["Mina", "Arafat", "Muzdalifah", "Grand Mosque", "Jamarat"];

export function RegisterPersonnel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

  const { data: groupsData } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      externalId: "",
      name: "",
      age: 30,
      gender: "M",
      bloodType: "",
      role: "pilgrim",
      zone: "",
      nationality: "",
      address: "",
      emergencyContact: "",
      illnesses: "",
      medications: "",
      medicalHistory: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const body: Record<string, unknown> = {
        ...data,
        hr: 72,
        spo2: 98,
        temp: 36.6,
        bp: "120/80",
        steps: 0,
        battery: 100,
        riskScore: 0,
        status: "ok",
        isActive: true,
        shiftHours: data.role === "pilgrim" ? 0 : 8,
        lat: 21.4225 + (Math.random() - 0.5) * 0.02,
        lng: 39.8262 + (Math.random() - 0.5) * 0.02,
      };
      if (!body.groupId) delete body.groupId;
      if (!body.bloodType) delete body.bloodType;
      if (!body.zone) delete body.zone;
      if (!body.nationality) delete body.nationality;
      if (!body.address) delete body.address;
      if (!body.emergencyContact) delete body.emergencyContact;
      if (!body.illnesses) delete body.illnesses;
      if (!body.medications) delete body.medications;
      if (!body.medicalHistory) delete body.medicalHistory;
      const res = await apiRequest("POST", "/api/personnel", body);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Person Registered", description: `${data.name} registered with Watch ID: ${data.externalId}` });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RegisterForm) => {
    mutation.mutate(data);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" data-testid="register-personnel">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 tracking-[1px] uppercase" data-testid="text-register-title">
              {t("Register New Person")}
            </h2>
            <p className="text-sm text-slate-500 font-mono">{t("Add a pilgrim or medical staff member")}</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in" data-testid="register-success">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm text-emerald-700 font-medium">Person registered successfully and is now being tracked on the map.</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <SectionCard title="Watch Device" icon={<Watch className="w-4 h-4 text-teal-600" />}>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="externalId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Watch ID / Device Serial</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. WD-001234" className="font-mono" data-testid="input-watch-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pilgrim">Pilgrim</SelectItem>
                        <SelectItem value="paramedic">Paramedic (EMT)</SelectItem>
                        <SelectItem value="doctor">Doctor (DR)</SelectItem>
                        <SelectItem value="nurse">Nurse (RN)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            <SectionCard title="Personal Information" icon={<User className="w-4 h-4 text-blue-600" />}>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full name" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Age</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" data-testid="input-age" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bloodType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Blood Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-blood-type">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BLOOD_TYPES.map((bt) => (
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nationality" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Nationality</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Saudi Arabia" data-testid="input-nationality" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            <SectionCard title="Assignment" icon={<MapPin className="w-4 h-4 text-amber-600" />}>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="groupId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Pilgrim Group</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v ? parseInt(v) : undefined)} defaultValue={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-group">
                          <SelectValue placeholder="Select group (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(groupsData || []).map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="zone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Initial Zone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone">
                          <SelectValue placeholder="Select zone (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ZONES.map((z) => (
                          <SelectItem key={z} value={z}>{z}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            <SectionCard title="Contact & Emergency" icon={<Phone className="w-4 h-4 text-emerald-600" />}>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Home Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Address" data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="emergencyContact" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Emergency Contact</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Name, relation, phone" data-testid="input-emergency-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            <SectionCard title="Medical Information" icon={<Heart className="w-4 h-4 text-rose-500" />}>
              <div className="space-y-4">
                <FormField control={form.control} name="illnesses" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Current Conditions / Illnesses</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g. Diabetes Type 2, Hypertension (comma-separated)" rows={2} data-testid="input-illnesses" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="medications" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Current Medications</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g. Metformin 500mg, Lisinopril 10mg (comma-separated)" rows={2} data-testid="input-medications" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="medicalHistory" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase tracking-wider text-slate-600">Medical History</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="e.g. Knee replacement 2019, Heart stent 2020 (comma-separated)" rows={2} data-testid="input-medical-history" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </SectionCard>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => form.reset()}
                data-testid="button-clear-form"
                className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-[#aaaaaa] text-slate-600 border border-slate-200 hover-elevate transition-colors cursor-pointer"
              >
                {t("Clear Form")}
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-register"
                className="px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-teal-600 text-white hover-elevate transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {mutation.isPending ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {t("Register Person")}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        {icon}
        <span className="font-display font-bold text-sm uppercase tracking-[1px] text-slate-700">{title}</span>
      </div>
      {children}
    </div>
  );
}
