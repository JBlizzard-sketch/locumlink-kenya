import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useCompleteLocumOnboarding, useCompleteClinicOnboarding, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ActivitySquare, ArrowRight, CheckCircle2, Building2, UserCircle2, ChevronLeft } from "lucide-react";

// ─── Locum schemas ─────────────────────────────────────────────────
const locumStep1Schema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  registrationBody: z.enum(["KMPDC", "NCK", "KDTTB", "KPhB", "KORK", "PPB", "other"]),
  registrationNumber: z.string().min(3, "Registration number required"),
});

const locumStep2Schema = z.object({
  primarySpecialtyId: z.coerce.number().min(1, "Please select your specialty"),
  yearsExperience: z.coerce.number().min(0).default(0),
  subCounty: z.string().min(1, "Sub-county required"),
  mpesaNumber: z.string().optional(),
  bio: z.string().optional(),
  isAvailableForUrgent: z.boolean().default(false),
});

// ─── Clinic schemas ─────────────────────────────────────────────────
const clinicStep1Schema = z.object({
  name: z.string().min(2, "Clinic name required"),
  facilityType: z.enum(["general_practice", "specialist_clinic", "hospital", "dental_clinic",
    "maternity_clinic", "diagnostic_centre", "pharmacy", "physiotherapy", "eye_clinic", "other"]),
  address: z.string().min(5, "Full address required"),
  subCounty: z.string().min(1, "Sub-county required"),
});

const clinicStep2Schema = z.object({
  contactName: z.string().min(2, "Contact name required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().min(10, "Phone number required"),
  mohFacilityNumber: z.string().optional(),
  bio: z.string().optional(),
});

type LocumStep1 = z.infer<typeof locumStep1Schema>;
type LocumStep2 = z.infer<typeof locumStep2Schema>;
type ClinicStep1 = z.infer<typeof clinicStep1Schema>;
type ClinicStep2 = z.infer<typeof clinicStep2Schema>;

const NAIROBI_SUB_COUNTIES = [
  "Westlands", "Starehe", "Langata", "Karen", "Kileleshwa", "Kilimani",
  "Lavington", "Embakasi", "Kasarani", "Roysambu", "Ruaraka", "Dagoretti",
  "Makadara", "Mathare", "Kibra", "Njiru",
];

const REGISTRATION_BODIES = [
  { value: "KMPDC", label: "KMPDC — Kenya Medical Practitioners & Dentists Council" },
  { value: "NCK", label: "NCK — Nursing Council of Kenya" },
  { value: "KDTTB", label: "KDTTB — Kenya Dietitians & Nutritionists Board" },
  { value: "KPhB", label: "KPhB — Kenya Pharmacy & Poisons Board" },
  { value: "KORK", label: "KORK — Kenya Orthopaedic & Rehabilitation Council" },
  { value: "PPB", label: "PPB — Pharmacy & Poisons Board" },
  { value: "other", label: "Other" },
];

const FACILITY_TYPES = [
  { value: "general_practice", label: "General Practice" },
  { value: "specialist_clinic", label: "Specialist Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "dental_clinic", label: "Dental Clinic" },
  { value: "maternity_clinic", label: "Maternity Clinic" },
  { value: "diagnostic_centre", label: "Diagnostic Centre" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "eye_clinic", label: "Eye Clinic" },
  { value: "other", label: "Other" },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
            i < current
              ? "bg-primary text-primary-foreground"
              : i === current
              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
              : "bg-muted text-muted-foreground"
          }`}>
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-12 transition-colors ${i < current ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LOCUM ONBOARDING ───────────────────────────────────────────────
function LocumOnboarding() {
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<LocumStep1 | null>(null);
  const { data: specialties } = useListSpecialties();
  const completeOnboarding = useCompleteLocumOnboarding();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form1 = useForm<LocumStep1>({ resolver: zodResolver(locumStep1Schema) });
  const form2 = useForm<LocumStep2>({
    resolver: zodResolver(locumStep2Schema),
    defaultValues: { yearsExperience: 0, isAvailableForUrgent: false },
  });

  const onStep1 = (data: LocumStep1) => {
    setStep1Data(data);
    setStep(1);
  };

  const onStep2 = async (data: LocumStep2) => {
    if (!step1Data) return;
    try {
      await completeOnboarding.mutateAsync({
        data: {
          ...step1Data,
          primarySpecialtyId: data.primarySpecialtyId,
          yearsExperience: data.yearsExperience,
          subCounty: data.subCounty,
          mpesaNumber: data.mpesaNumber || undefined,
          bio: data.bio || undefined,
          isAvailableForUrgent: data.isAvailableForUrgent,
        },
      });
      toast({ title: "Welcome to LocumLink!", description: "Your profile has been created. Start browsing shifts." });
      setLocation("/locum/dashboard");
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.error || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div>
      <StepIndicator current={step} total={2} />

      {step === 0 && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-serif">Your professional identity</h2>
            <p className="text-muted-foreground mt-1">We need your registration details to verify your credentials.</p>
          </div>
          <Form {...form1}>
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form1.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form1.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input placeholder="Wanjiku" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form1.control} name="registrationBody" render={({ field }) => (
                <FormItem>
                  <FormLabel>Licensing Body</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select your licensing body" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REGISTRATION_BODIES.map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form1.control} name="registrationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration / Licence Number</FormLabel>
                  <FormControl><Input placeholder="e.g. A12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full gap-2" size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Form>
        </>
      )}

      {step === 1 && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-serif">Specialty & preferences</h2>
            <p className="text-muted-foreground mt-1">Help clinics match you to the right shifts.</p>
          </div>
          <Form {...form2}>
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-5">
              <FormField control={form2.control} name="primarySpecialtyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Specialty</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(specialties?.data ?? []).map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="yearsExperience" render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl><Input type="number" min="0" max="50" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="subCounty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nairobi Sub-County (base location)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NAIROBI_SUB_COUNTIES.map(sc => (
                        <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="mpesaNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>M-Pesa Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="07XXXXXXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Bio <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Textarea placeholder="Brief summary of your experience and availability..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="isAvailableForUrgent" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Available for urgent shifts</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive SMS alerts for same-day emergency gaps</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending ? "Saving..." : "Complete Setup"}
                  {!completeOnboarding.isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}

// ─── CLINIC ONBOARDING ──────────────────────────────────────────────
function ClinicOnboarding() {
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<ClinicStep1 | null>(null);
  const completeOnboarding = useCompleteClinicOnboarding();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const form1 = useForm<ClinicStep1>({ resolver: zodResolver(clinicStep1Schema) });
  const form2 = useForm<ClinicStep2>({
    resolver: zodResolver(clinicStep2Schema),
    defaultValues: { contactEmail: user?.email ?? "" },
  });

  const onStep1 = (data: ClinicStep1) => {
    setStep1Data(data);
    setStep(1);
  };

  const onStep2 = async (data: ClinicStep2) => {
    if (!step1Data) return;
    try {
      await completeOnboarding.mutateAsync({
        data: {
          ...step1Data,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          mohFacilityNumber: data.mohFacilityNumber || undefined,
          bio: data.bio || undefined,
        },
      });
      toast({ title: "Welcome to LocumLink!", description: "Your clinic profile is live. Start posting shifts." });
      setLocation("/clinic/dashboard");
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.error || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div>
      <StepIndicator current={step} total={2} />

      {step === 0 && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-serif">Your facility details</h2>
            <p className="text-muted-foreground mt-1">Tell locums about your clinic so they can find you.</p>
          </div>
          <Form {...form1}>
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-5">
              <FormField control={form1.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic / Facility Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Premier Clinic Kilimani" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form1.control} name="facilityType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Facility Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select facility type" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FACILITY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form1.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl><Input placeholder="e.g. 4th Floor, Yaya Centre, Kilimani" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form1.control} name="subCounty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-County</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NAIROBI_SUB_COUNTIES.map(sc => (
                        <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full gap-2" size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </Form>
        </>
      )}

      {step === 1 && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold font-serif">Contact & compliance</h2>
            <p className="text-muted-foreground mt-1">HR contact and regulatory information.</p>
          </div>
          <Form {...form2}>
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-5">
              <FormField control={form2.control} name="contactName" render={({ field }) => (
                <FormItem>
                  <FormLabel>HR / Contact Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Grace Njeri" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="contactEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input type="email" placeholder="hr@yourclinic.co.ke" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="contactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl><Input placeholder="0712345678" type="tel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="mohFacilityNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>MOH Facility Number <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g. 14/3/2016/12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form2.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>About Your Facility <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl><Textarea placeholder="Brief description for locums viewing your profile..." rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending ? "Saving..." : "Complete Setup"}
                  {!completeOnboarding.isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────
export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const isLocum = user?.role === "locum";
  const isClinic = user?.role === "clinic_admin" || user?.role === "clinic_hr";

  if (!isLoading && !user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-primary mb-6">
            <ActivitySquare className="h-8 w-8" />
            <span>LocumLink</span>
          </Link>

          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 ${
            isLocum ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-600"
          }`}>
            {isLocum ? <UserCircle2 className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            {isLocum ? "Set up your locum profile" : "Set up your clinic"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isLocum
              ? "Takes 2 minutes. You'll be browsing verified shifts right after."
              : "Takes 2 minutes. Post your first shift immediately after."}
          </p>
        </div>

        {/* Step card */}
        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-8 pb-6 px-6">
            {isLocum && <LocumOnboarding />}
            {isClinic && <ClinicOnboarding />}
            {!isLocum && !isClinic && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Onboarding is only available for locums and clinics.</p>
                <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
                  Return home
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          You can update all of this later in your profile settings.
        </p>
      </div>
    </div>
  );
}
