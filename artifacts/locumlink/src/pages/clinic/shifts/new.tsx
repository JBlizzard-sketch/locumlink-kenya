import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateShift, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Info } from "lucide-react";

const shiftSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  specialtyId: z.coerce.number().min(1, "Please select a specialty"),
  shiftDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  rate: z.coerce.number().min(500, "Rate must be at least 500 KES"),
  urgency: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  positionsAvailable: z.coerce.number().min(1).default(1),
  description: z.string().optional(),
  specificRequirements: z.string().optional(),
  minYearsExperience: z.coerce.number().optional(),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

export default function ClinicPostShift() {
  const { data: specialties } = useListSpecialties();
  const createShift = useCreateShift();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      title: "",
      urgency: "normal",
      positionsAvailable: 1,
      rate: 0,
      description: "",
    },
  });

  const selectedSpecialtyId = form.watch("specialtyId");
  const selectedSpecialty = specialties?.data?.find(s => s.id === selectedSpecialtyId);

  const onSubmit = async (data: ShiftFormValues) => {
    try {
      const res = await createShift.mutateAsync({ data });
      toast({ title: "Shift posted successfully" });
      setLocation(`/clinic/shifts/${res.id}`);
    } catch (error: any) {
      toast({ title: "Failed to post shift", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/clinic/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to shifts
      </Link>

      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Post a New Shift</h1>
        <p className="text-muted-foreground mt-1">Fill out the details to find the right locum for your clinic.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Shift Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Weekend GP Cover" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="specialtyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Specialty</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger></FormControl>
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
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Rate (KES)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      {selectedSpecialty && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Info className="h-3 w-3" /> Market benchmark: KES {selectedSpecialty.suggestedRateMin} - {selectedSpecialty.suggestedRateMax}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="shiftDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent (Next 48h)</SelectItem>
                          <SelectItem value="emergency">Emergency (Next 12h)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="positionsAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Positions Available</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea className="h-24" placeholder="Describe the duties and expectations..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t flex justify-end gap-4">
                <Link href="/clinic/shifts">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createShift.isPending}>
                  {createShift.isPending ? "Posting..." : "Post Shift"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}