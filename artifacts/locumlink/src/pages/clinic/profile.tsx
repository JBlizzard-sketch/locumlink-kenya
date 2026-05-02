import { useGetMyClinic, useUpdateClinic } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, AlertCircle, CheckCircle2, Circle, Building2, FileText, Phone, MapPin } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Clinic name required"),
  facilityType: z.string().min(2, "Facility type required"),
  address: z.string().min(5, "Address required"),
  subCounty: z.string().min(2, "Sub-county required"),
  contactName: z.string().min(2, "Contact person required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().min(10, "Valid phone required"),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ClinicProfile() {
  const { data: clinic, isLoading } = useGetMyClinic();
  const updateClinic = useUpdateClinic();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      facilityType: "",
      address: "",
      subCounty: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      bio: "",
    },
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (clinic && !initialized.current) {
      form.reset({
        name: clinic.name || "",
        facilityType: clinic.facilityType || "",
        address: clinic.address || "",
        subCounty: clinic.subCounty || "",
        contactName: clinic.contactName || "",
        contactEmail: clinic.contactEmail || "",
        contactPhone: clinic.contactPhone || "",
        bio: clinic.bio || "",
      });
      initialized.current = true;
    }
  }, [clinic, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateClinic.mutateAsync({ id: clinic?.id ?? 0, data: data as any });
      toast({ title: "Clinic profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const completionItems = useMemo(() => {
    if (!clinic) return [];
    return [
      { label: "Clinic name", done: !!clinic.name?.trim(), icon: Building2 },
      { label: "Facility type", done: !!clinic.facilityType, icon: Building2 },
      { label: "Physical address", done: !!clinic.address?.trim(), icon: MapPin },
      { label: "Sub-county", done: !!clinic.subCounty?.trim(), icon: MapPin },
      { label: "About the clinic (bio)", done: !!clinic.bio?.trim(), icon: FileText },
      { label: "Contact person name", done: !!clinic.contactName?.trim(), icon: Phone },
      { label: "Contact email", done: !!clinic.contactEmail?.trim(), icon: Phone },
      { label: "Contact phone", done: !!clinic.contactPhone?.trim(), icon: Phone },
    ];
  }, [clinic]);

  const completionScore = useMemo(() => {
    const weights = [15, 10, 15, 10, 20, 10, 10, 10];
    return completionItems.reduce((acc, item, i) => acc + (item.done ? weights[i] : 0), 0);
  }, [completionItems]);

  const strengthLabel = completionScore >= 90 ? { text: "Complete", color: "text-green-600", bg: "bg-green-100" }
    : completionScore >= 65 ? { text: "Strong", color: "text-blue-600", bg: "bg-blue-100" }
    : completionScore >= 35 ? { text: "Getting There", color: "text-amber-600", bg: "bg-amber-100" }
    : { text: "Starter", color: "text-muted-foreground", bg: "bg-muted" };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Clinic Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your facility details visible to locums applying to your shifts.</p>
      </div>

      {/* Profile Completion Widget */}
      <Card className="border-l-4 border-l-primary overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Profile Completeness</CardTitle>
            <Badge className={`${strengthLabel.bg} ${strengthLabel.color} border-0 font-semibold`}>
              {strengthLabel.text}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <Progress value={completionScore} className="h-2" />
            <p className="text-xs text-muted-foreground">{completionScore}% complete — a complete profile attracts more locum applications</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {completionItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      {clinic && (
        <Card className={`border ${
          clinic.verificationStatus === "verified"
            ? "border-green-200 bg-green-50/20"
            : clinic.verificationStatus === "rejected"
              ? "border-red-200 bg-red-50/20"
              : "border-amber-200 bg-amber-50/20"
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            {clinic.verificationStatus === "verified" ? (
              <ShieldCheck className="h-6 w-6 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {clinic.verificationStatus === "verified"
                  ? "Clinic verified by LocumLink"
                  : clinic.verificationStatus === "rejected"
                    ? "Verification requires attention"
                    : "Verification pending review"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clinic.verificationStatus === "verified"
                  ? "Your clinic appears with a verified badge on all shift listings. Locums trust verified clinics more."
                  : clinic.verificationStatus === "rejected"
                    ? ((clinic as any).verificationNotes ?? "Please contact support to re-submit your documents.")
                    : "The LocumLink team is reviewing your registration documents. This usually takes 1–2 business days."}
              </p>
            </div>
            {clinic.verificationStatus === "verified" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Facility Information</CardTitle>
          <CardDescription>This information helps locums find and evaluate your clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinic Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facilityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Hospital">Hospital</SelectItem>
                          <SelectItem value="Clinic">Clinic</SelectItem>
                          <SelectItem value="Medical Centre">Medical Centre</SelectItem>
                          <SelectItem value="Dispensary">Dispensary</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subCounty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub-County (Nairobi)</FormLabel>
                      <FormControl><Input placeholder="e.g. Westlands" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Address</FormLabel>
                    <FormControl><Input placeholder="Building, Street Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About the Clinic</FormLabel>
                    <FormControl><Textarea className="h-24" placeholder="Briefly describe your facility, equipment, and environment..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">Contact Person (HR / Admin)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direct Phone</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Direct Email</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={updateClinic.isPending}>
                {updateClinic.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}