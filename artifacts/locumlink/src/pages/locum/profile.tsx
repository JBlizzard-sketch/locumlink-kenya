import { useGetMyLocum, useUpdateLocum, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";

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

export default function LocumProfile() {
  const { data: profile, isLoading } = useGetMyLocum();
  const { data: specialties } = useListSpecialties();
  const updateLocum = useUpdateLocum();
  const { toast } = useToast();

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
        primarySpecialtyId: profile.primarySpecialtyId,
        yearsExperience: profile.yearsExperience || 0,
        preferredRatePerShift: profile.preferredRatePerShift || 0,
        subCounty: profile.subCounty || "",
        isAvailableForUrgent: profile.isAvailableForUrgent || false,
      });
      initialized.current = true;
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateLocum.mutateAsync({ data });
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Failed to update", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your professional identity and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your details as seen by clinics.</CardDescription>
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
                    <FormControl><Textarea className="h-24" placeholder="Tell clinics about your experience..." {...field} /></FormControl>
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
                          {specialties?.data?.map(s => (
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
                      <FormControl><Input type="number" {...field} /></FormControl>
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
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subCounty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Sub-County)</FormLabel>
                      <FormControl><Input placeholder="e.g. Westlands" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isAvailableForUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Available for Urgent Shifts</FormLabel>
                      <CardDescription>
                        Turn on to receive SMS alerts for emergency shifts matching your specialty.
                      </CardDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateLocum.isPending}>
                {updateLocum.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}