import { useGetMyLocum, useUpdateLocum, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useMemo, useState } from "react";
import { Link } from "wouter";
import { useUpload } from "@workspace/object-storage-web";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  AlertCircle,
  User,
  FileText,
  Star,
  Zap,
  Camera,
  Loader2,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL as string;

const profileSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  bio: z.string().optional(),
  primarySpecialtyId: z.coerce.number().optional(),
  yearsExperience: z.coerce.number().min(0).optional(),
  preferredRatePerShift: z.coerce.number().min(0).optional(),
  mpesaNumber: z.string().optional(),
  subCounty: z.string().optional(),
  isAvailableForUrgent: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface CheckItem {
  label: string;
  done: boolean;
  href?: string;
  icon: React.ElementType;
}

function strengthLabel(score: number) {
  if (score >= 90) return { text: "Complete", color: "text-green-600", bg: "bg-green-100" };
  if (score >= 65) return { text: "Strong", color: "text-blue-600", bg: "bg-blue-100" };
  if (score >= 35) return { text: "Getting There", color: "text-amber-600", bg: "bg-amber-100" };
  return { text: "Starter", color: "text-muted-foreground", bg: "bg-muted" };
}

export default function LocumProfile() {
  const { data: profile, isLoading, refetch } = useGetMyLocum();
  const { data: specialties } = useListSpecialties();
  const updateLocum = useUpdateLocum();
  const { toast } = useToast();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);

  const { uploadFile } = useUpload({
    basePath: `${BASE_URL}api/storage`,
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  async function handlePhotoUpload(file: File) {
    if (!profile) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please select a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Profile photo must be under 5 MB.", variant: "destructive" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const result = await uploadFile(file);
      if (!result) return;
      const token = localStorage.getItem("token");
      const patchRes = await fetch(`${BASE_URL}api/locums/${profile.id}/documents`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ profilePhotoUrl: result.objectPath }),
      });
      if (!patchRes.ok) throw new Error("Failed to save photo");
      await refetch();
      setPhotoKey((k) => k + 1);
      toast({ title: "Photo updated", description: "Your profile photo has been saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  }

  function triggerPhotoPicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handlePhotoUpload(file);
    };
    input.click();
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      bio: "",
      yearsExperience: 0,
      preferredRatePerShift: 0,
      mpesaNumber: "",
      subCounty: "",
      isAvailableForUrgent: false,
    },
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (profile && !initialized.current) {
      form.reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        bio: profile.bio || "",
        primarySpecialtyId: profile.primarySpecialtyId ?? undefined,
        yearsExperience: profile.yearsExperience || 0,
        preferredRatePerShift: profile.preferredRatePerShift || 0,
        mpesaNumber: (profile as any).mpesaNumber || "",
        subCounty: profile.subCounty || "",
        isAvailableForUrgent: profile.isAvailableForUrgent || false,
      });
      initialized.current = true;
    }
  }, [profile, form]);

  const completionItems: CheckItem[] = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "First & last name", done: !!(profile.firstName && profile.lastName), icon: User },
      { label: "Professional bio", done: !!profile.bio?.trim(), icon: FileText },
      { label: "Primary specialty", done: !!profile.primarySpecialtyId, icon: Star },
      { label: "Years of experience", done: (profile.yearsExperience ?? 0) > 0, icon: Zap },
      { label: "Preferred rate set", done: !!(profile.preferredRatePerShift && profile.preferredRatePerShift > 0), icon: Zap },
      { label: "M-Pesa number", done: !!(profile as any).mpesaNumber?.trim(), icon: Zap },
      { label: "Sub-county / location", done: !!profile.subCounty?.trim(), icon: User },
      { label: "Profile photo", done: !!(profile as any).profilePhotoUrl, icon: User },
      { label: "ID document uploaded", done: !!(profile as any).idDocumentUrl, href: "/locum/documents", icon: FileText },
      { label: "Practicing certificate", done: !!(profile as any).practicingCertUrl, href: "/locum/documents", icon: FileText },
      { label: "Registration certificate", done: !!(profile as any).registrationCertUrl, href: "/locum/documents", icon: FileText },
    ];
  }, [profile]);

  const completionScore = useMemo(() => {
    const weights = [10, 15, 15, 10, 5, 10, 5, 10, 10, 5, 5];
    return completionItems.reduce((acc, item, i) => acc + (item.done ? weights[i] : 0), 0);
  }, [completionItems]);

  const strength = strengthLabel(completionScore);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateLocum.mutateAsync({ id: profile?.id ?? 0, data: data as any });
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Your profile is your storefront — clinics see this when reviewing your applications.</p>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Photo</CardTitle>
          <CardDescription>A clear headshot builds trust with clinics. Max 5 MB (JPG, PNG, WebP).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-border">
                <AvatarImage
                  key={photoKey}
                  src={
                    (profile as any)?.profilePhotoUrl
                      ? `${BASE_URL}api/locums/${profile!.id}/photo?t=${photoKey}`
                      : undefined
                  }
                />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                  {profile?.firstName?.charAt(0) ?? <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={triggerPhotoPicker}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                title="Change photo"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={triggerPhotoPicker}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    {(profile as any)?.profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                  </>
                )}
              </Button>
              {(profile as any)?.profilePhotoUrl && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Photo uploaded
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion Widget */}
      <Card className="border-l-4 border-l-primary overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Profile Completeness
            </CardTitle>
            <Badge className={`${strength.bg} ${strength.color} border-0 font-semibold`}>
              {strength.text}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <Progress value={completionScore} className="h-2" />
            <p className="text-xs text-muted-foreground">{completionScore}% complete — fill in the items below to strengthen your profile</p>
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
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
                {!item.done && item.href && (
                  <Link href={item.href} className="text-xs text-primary hover:underline ml-auto shrink-0">
                    Upload →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      {profile && (
        <Card className={`border ${
          profile.verificationStatus === "verified"
            ? "border-green-200 bg-green-50/20"
            : profile.verificationStatus === "rejected"
              ? "border-red-200 bg-red-50/20"
              : "border-amber-200 bg-amber-50/20"
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            {profile.verificationStatus === "verified" ? (
              <ShieldCheck className="h-6 w-6 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {profile.verificationStatus === "verified"
                  ? "Your credentials are verified"
                  : profile.verificationStatus === "rejected"
                    ? "Verification requires attention"
                    : "Verification pending review"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile.verificationStatus === "verified"
                  ? "You appear as verified on all shift listings and clinic searches."
                  : profile.verificationStatus === "rejected"
                    ? (profile as any).verificationNotes || "Please re-upload your documents."
                    : "Our team is reviewing your uploaded documents. This usually takes 1–2 business days."}
              </p>
            </div>
            {profile.verificationStatus !== "verified" && (
              <Button variant="outline" size="sm" className="ml-auto shrink-0" asChild>
                <Link href="/locum/documents">View Documents</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your details as seen by clinics reviewing your applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-24 resize-none"
                        placeholder="Tell clinics about your experience, specialisations, and approach to patient care..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primarySpecialtyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Specialty</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {specialties?.data?.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearsExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferredRatePerShift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Rate (KES/shift)</FormLabel>
                      <FormControl><Input type="number" min={0} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mpesaNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>M-Pesa Number</FormLabel>
                      <FormControl><Input placeholder="e.g. 0712345678" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subCounty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Sub-County)</FormLabel>
                    <FormControl><Input placeholder="e.g. Westlands, Langata, Embakasi…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isAvailableForUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Available for Urgent Shifts</FormLabel>
                      <CardDescription>
                        Receive SMS alerts for emergency shifts matching your specialty.
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateLocum.isPending} className="w-full sm:w-auto">
                {updateLocum.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
