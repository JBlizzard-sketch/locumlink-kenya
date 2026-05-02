import { useGetMyClinic, useUpdateClinic } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      await updateClinic.mutateAsync({ data });
      toast({ title: "Clinic profile updated successfully" });
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
        <h1 className="text-3xl font-bold font-serif tracking-tight">Clinic Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your facility details visible to locums.</p>
      </div>

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