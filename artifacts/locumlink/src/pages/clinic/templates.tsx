import { useState } from "react";
import {
  useListShiftTemplates,
  useCreateShiftTemplate,
  useDeleteShiftTemplate,
  useListSpecialties,
  getListShiftTemplatesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Trash2,
  LayoutTemplate,
  Clock,
  Banknote,
  BriefcaseMedical,
  AlertCircle,
  Copy,
} from "lucide-react";

const URGENCY_LABELS: Record<string, string> = {
  normal: "Normal",
  urgent: "Urgent",
  emergency: "Emergency",
};
const URGENCY_COLORS: Record<string, string> = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
};

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function CreateTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rate, setRate] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [positionsAvailable, setPositionsAvailable] = useState("1");
  const [description, setDescription] = useState("");
  const [specificRequirements, setSpecificRequirements] = useState("");
  const [minYearsExperience, setMinYearsExperience] = useState("");

  const { data: specialties } = useListSpecialties();
  const createTemplate = useCreateShiftTemplate();
  const { toast } = useToast();

  const reset = () => {
    setName(""); setTitle(""); setSpecialtyId(""); setStartTime(""); setEndTime("");
    setRate(""); setUrgency("normal"); setPositionsAvailable("1"); setDescription("");
    setSpecificRequirements(""); setMinYearsExperience("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }
    try {
      await createTemplate.mutateAsync({
        data: {
          name: name.trim(),
          title: title.trim() || undefined,
          specialtyId: specialtyId ? Number(specialtyId) : undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          rate: rate ? Number(rate) : undefined,
          urgency: urgency as "normal" | "urgent" | "emergency",
          positionsAvailable: positionsAvailable ? Number(positionsAvailable) : undefined,
          description: description || undefined,
          specificRequirements: specificRequirements || undefined,
          minYearsExperience: minYearsExperience ? Number(minYearsExperience) : undefined,
        },
      });
      toast({ title: "Template saved" });
      setOpen(false);
      reset();
      onCreated();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save Shift Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Template Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder='e.g. "Weekend GP Cover", "ICU Night Shift"'
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">A short label for your own reference.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Shift Title</Label>
              <Input placeholder="e.g. Weekend GP Locum" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Specialty</Label>
              <Select value={specialtyId} onValueChange={setSpecialtyId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {specialties?.data?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate (KES)</Label>
              <Input type="number" placeholder="8000" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent (48h)</SelectItem>
                  <SelectItem value="emergency">Emergency (12h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Positions Available</Label>
              <Input type="number" min={1} value={positionsAvailable} onChange={e => setPositionsAvailable(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              className="h-20 resize-none"
              placeholder="Duties and expectations..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Specific Requirements</Label>
              <Input placeholder="e.g. BLS certified" value={specificRequirements} onChange={e => setSpecificRequirements(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Min. Years Experience</Label>
              <Input type="number" min={0} value={minYearsExperience} onChange={e => setMinYearsExperience(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending}>
              {createTemplate.isPending ? "Saving…" : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ClinicTemplates() {
  const qc = useQueryClient();
  const { data, isLoading } = useListShiftTemplates({
    query: { queryKey: getListShiftTemplatesQueryKey() },
  });
  const deleteTemplate = useDeleteShiftTemplate();
  const { data: specialties } = useListSpecialties();
  const { toast } = useToast();

  const templates = data?.data ?? [];

  const getSpecialtyName = (id?: number | null) =>
    id ? specialties?.data?.find(s => s.id === id)?.name ?? "—" : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: getListShiftTemplatesQueryKey() });

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteTemplate.mutateAsync({ id });
      toast({ title: `"${name}" deleted` });
      invalidate();
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Shift Templates</h1>
          <p className="text-muted-foreground mt-1">
            Save recurring shift configurations and load them when posting — no repeated form-filling.
          </p>
        </div>
        <CreateTemplateDialog onCreated={invalidate} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed bg-muted/20 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
          <h3 className="text-lg font-semibold">No templates yet</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            Save a template from a shift you post regularly to speed up future postings.
          </p>
          <CreateTemplateDialog onCreated={invalidate} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow group relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{t.name}</CardTitle>
                    {t.title && (
                      <CardDescription className="truncate mt-0.5">{t.title}</CardDescription>
                    )}
                  </div>
                  {t.urgency && t.urgency !== "normal" && (
                    <Badge variant="outline" className={`text-xs shrink-0 ${URGENCY_COLORS[t.urgency] ?? ""}`}>
                      {URGENCY_LABELS[t.urgency] ?? t.urgency}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  {getSpecialtyName(t.specialtyId) && (
                    <span className="flex items-center gap-1.5">
                      <BriefcaseMedical className="h-3.5 w-3.5" />
                      {getSpecialtyName(t.specialtyId)}
                    </span>
                  )}
                  {t.startTime && t.endTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {t.startTime} – {t.endTime}
                    </span>
                  )}
                  {t.rate && (
                    <span className="flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5" />
                      {formatKes(t.rate)}
                    </span>
                  )}
                  {t.positionsAvailable && t.positionsAvailable > 1 && (
                    <span className="text-xs">{t.positionsAvailable} positions</span>
                  )}
                </div>

                {t.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Link
                    href={`/clinic/shifts/new?templateId=${t.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Copy className="h-3.5 w-3.5" /> Use Template
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={deleteTemplate.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {templates.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-dashed bg-muted/20">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Templates pre-fill the shift form — you can always adjust the date, time, or rate before posting.
            <Link href="/clinic/shifts/new" className="text-primary hover:underline ml-1">
              Post a new shift →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
