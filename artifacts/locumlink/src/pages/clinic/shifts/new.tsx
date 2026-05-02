import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateShift, useListSpecialties,
  useListShiftTemplates, useCreateShiftTemplate,
  getListShiftTemplatesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Info, LayoutTemplate, Save, CheckCircle2, Clock, Banknote } from "lucide-react";

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

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export default function ClinicPostShift() {
  const { data: specialties } = useListSpecialties();
  const { data: templatesData } = useListShiftTemplates({
    query: { queryKey: getListShiftTemplatesQueryKey() },
  });
  const createShift = useCreateShift();
  const saveTemplate = useCreateShiftTemplate();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const qc = useQueryClient();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null);
  const [templateLoaded, setTemplateLoaded] = useState<string | null>(null);

  const templates = templatesData?.data ?? [];

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

  // Load template from ?templateId= query param
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const templateId = params.get("templateId");
    if (!templateId || !templates.length) return;
    const tmpl = templates.find(t => t.id === Number(templateId));
    if (!tmpl) return;
    form.reset({
      title: tmpl.title ?? "",
      specialtyId: tmpl.specialtyId ?? 0,
      shiftDate: "",
      startTime: tmpl.startTime ?? "",
      endTime: tmpl.endTime ?? "",
      rate: tmpl.rate ?? 0,
      urgency: (tmpl.urgency as "normal" | "urgent" | "emergency") ?? "normal",
      positionsAvailable: tmpl.positionsAvailable ?? 1,
      description: tmpl.description ?? "",
      specificRequirements: tmpl.specificRequirements ?? "",
      minYearsExperience: tmpl.minYearsExperience ?? undefined,
    });
    setTemplateLoaded(tmpl.name);
  }, [searchStr, templates, form]);

  // Pre-fill from ?repost= direct params (reposting an existing shift)
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    if (!params.get("title") || params.get("templateId")) return; // only run for repost, not template
    const specialtyId = Number(params.get("specialtyId") || "0");
    const minYearsExp = Number(params.get("minYearsExperience") || "0");
    form.reset({
      title: params.get("title") ?? "",
      specialtyId: specialtyId || 0,
      shiftDate: "",
      startTime: params.get("startTime") ?? "",
      endTime: params.get("endTime") ?? "",
      rate: Number(params.get("rate") || "0"),
      urgency: (params.get("urgency") as "normal" | "urgent" | "emergency") ?? "normal",
      positionsAvailable: Number(params.get("positionsAvailable") || "1"),
      description: params.get("description") ?? "",
      specificRequirements: params.get("specificRequirements") ?? "",
      minYearsExperience: minYearsExp || undefined,
    });
    setTemplateLoaded("Reposted shift");
  }, [searchStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSpecialtyId = form.watch("specialtyId");
  const selectedSpecialty = specialties?.data?.find(s => s.id === selectedSpecialtyId);

  const onSubmit = async (data: ShiftFormValues) => {
    try {
      const res = await createShift.mutateAsync({ data });
      toast({ title: "Shift posted successfully" });
      setSavedId(res.id);
      setLocation(`/clinic/shifts/${res.id}`);
    } catch (error: any) {
      toast({ title: "Failed to post shift", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }
    const vals = form.getValues();
    try {
      await saveTemplate.mutateAsync({
        data: {
          name: templateName.trim(),
          title: vals.title || undefined,
          specialtyId: vals.specialtyId || undefined,
          startTime: vals.startTime || undefined,
          endTime: vals.endTime || undefined,
          rate: vals.rate || undefined,
          urgency: vals.urgency,
          positionsAvailable: vals.positionsAvailable || undefined,
          description: vals.description || undefined,
          specificRequirements: vals.specificRequirements || undefined,
          minYearsExperience: vals.minYearsExperience || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListShiftTemplatesQueryKey() });
      toast({ title: `Template "${templateName}" saved`, description: "Load it anytime from the Templates page." });
      setSaveDialogOpen(false);
      setTemplateName("");
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const applyTemplate = (tmplId: number) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    form.reset({
      ...form.getValues(),
      title: tmpl.title ?? form.getValues("title"),
      specialtyId: tmpl.specialtyId ?? form.getValues("specialtyId"),
      startTime: tmpl.startTime ?? form.getValues("startTime"),
      endTime: tmpl.endTime ?? form.getValues("endTime"),
      rate: tmpl.rate ?? form.getValues("rate"),
      urgency: (tmpl.urgency as "normal" | "urgent" | "emergency") ?? form.getValues("urgency"),
      positionsAvailable: tmpl.positionsAvailable ?? form.getValues("positionsAvailable"),
      description: tmpl.description ?? form.getValues("description"),
      specificRequirements: tmpl.specificRequirements ?? form.getValues("specificRequirements"),
      minYearsExperience: tmpl.minYearsExperience ?? form.getValues("minYearsExperience"),
    });
    setTemplateLoaded(tmpl.name);
    toast({ title: `"${tmpl.name}" loaded`, description: "Form pre-filled. Set the date to post." });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link href="/clinic/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to shifts
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Post a New Shift</h1>
          <p className="text-muted-foreground mt-1">Fill out the details to find the right locum for your clinic.</p>
        </div>
        {templates.length > 0 && (
          <Select onValueChange={(val) => applyTemplate(Number(val))}>
            <SelectTrigger className="w-[200px] gap-2 shrink-0">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Load Template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  <div className="flex flex-col items-start">
                    <span>{t.name}</span>
                    {(t.startTime || t.rate) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-2">
                        {t.startTime && t.endTime && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{t.startTime}–{t.endTime}</span>}
                        {t.rate && <span className="flex items-center gap-0.5"><Banknote className="h-3 w-3" />{formatKes(t.rate)}</span>}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Template loaded banner */}
      {templateLoaded && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span>Form pre-filled from <strong>"{templateLoaded}"</strong> template — just pick a date and adjust as needed.</span>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
            onClick={() => setTemplateLoaded(null)}
          >
            Dismiss
          </button>
        </div>
      )}

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
                          <Info className="h-3 w-3" /> Market benchmark: KES {selectedSpecialty.suggestedRateMin} – {selectedSpecialty.suggestedRateMax}
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
                    <FormControl><Textarea className="h-24 resize-none" placeholder="Describe the duties and expectations..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Save className="h-4 w-4" /> Save as Template
                </Button>
                <div className="flex gap-3 ml-auto">
                  <Link href="/clinic/shifts">
                    <Button variant="outline" type="button">Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={createShift.isPending}>
                    {createShift.isPending ? "Posting…" : "Post Shift"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Save as Template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Give this shift configuration a name so you can load it quickly next time.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                placeholder='e.g. "Weekend GP Cover", "ICU Night Shift"'
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveTemplate()}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setSaveDialogOpen(false); setTemplateName(""); }}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={saveTemplate.isPending}>
                {saveTemplate.isPending ? "Saving…" : "Save Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
