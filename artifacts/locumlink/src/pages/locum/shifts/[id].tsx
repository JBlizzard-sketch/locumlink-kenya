import { useRoute } from "wouter";
import { useGetShift, getGetShiftQueryKey, useApplyToShift, useListMatchedShifts } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, Clock, MapPin, ShieldCheck, BriefcaseMedical,
  CheckCircle2, ChevronLeft, DollarSign, Users, Star,
  AlertTriangle, Zap, Timer,
} from "lucide-react";
import { format, parseISO, differenceInDays, differenceInHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";

const BASE_URL = import.meta.env.BASE_URL as string;

function useMyApplicationsMap() {
  const token = localStorage.getItem("token");
  return useQuery<{ data: Record<string, { id: number; status: string }> }>({
    queryKey: ["my-applications-map"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/applications/my-map`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: Record<string, { id: number; status: string }> }>;
    },
    staleTime: 30_000,
  });
}

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function ShiftCountdown({ date }: { date: string }) {
  const days = differenceInDays(parseISO(date), new Date());
  const hours = differenceInHours(parseISO(date), new Date());
  if (days < 0) return <span className="text-muted-foreground text-sm">Shift has passed</span>;
  if (days === 0) return (
    <div className="flex items-center gap-1.5 text-red-600 font-semibold text-sm">
      <AlertTriangle className="h-4 w-4" /> Today!
    </div>
  );
  if (days === 1) return (
    <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-sm">
      <Timer className="h-4 w-4" /> Tomorrow
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
      <Timer className="h-4 w-4" /> In {days} days
    </div>
  );
}

function MatchScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-600"
    : score >= 55 ? "text-amber-600"
    : "text-gray-500";
  const bar =
    score >= 80 ? "[&>div]:bg-emerald-500"
    : score >= 55 ? "[&>div]:bg-amber-500"
    : "[&>div]:bg-gray-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Zap className="h-4 w-4 text-primary" /> Match score
        </span>
        <span className={`font-bold text-base ${color}`}>{score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
      </div>
      <Progress value={score} className={`h-2 ${bar}`} />
      <p className="text-xs text-muted-foreground">
        {score >= 80 ? "Excellent match — your profile strongly fits this shift."
          : score >= 55 ? "Good match — you meet most of the key criteria."
          : "Partial match — apply if you meet the specialty requirements."}
      </p>
    </div>
  );
}

const statusConfig: Record<string, { label: string; desc: string; cls: string; icon: React.ReactNode }> = {
  applied:     { label: "Application Pending",  desc: "The clinic is reviewing your profile.", cls: "border-blue-200 bg-blue-50 text-blue-700",   icon: <Clock className="h-8 w-8" /> },
  shortlisted: { label: "You're Shortlisted!",  desc: "The clinic has shortlisted you — stay ready.", cls: "border-purple-200 bg-purple-50 text-purple-700", icon: <Star className="h-8 w-8" /> },
  confirmed:   { label: "Shift Confirmed!",     desc: "You're booked. Show up on time.", cls: "border-green-200 bg-green-50 text-green-700",    icon: <CheckCircle2 className="h-8 w-8" /> },
  rejected:    { label: "Not Selected",         desc: "The clinic chose a different candidate.", cls: "border-red-200 bg-red-50 text-red-600",     icon: <CheckCircle2 className="h-8 w-8" /> },
};

export default function LocumShiftDetail() {
  const [, params] = useRoute("/locum/shifts/:id");
  const shiftId = Number(params?.id);
  const [coverMessage, setCoverMessage] = useState("");

  const { data: shift, isLoading } = useGetShift(shiftId, {
    query: { enabled: !!shiftId, queryKey: getGetShiftQueryKey(shiftId) },
  });
  const { data: matchedData } = useListMatchedShifts();
  const { data: appMapData } = useMyApplicationsMap();

  const applyToShift = useApplyToShift();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const matchScore = useMemo(() => {
    if (!matchedData?.data) return undefined;
    const found = (matchedData.data as any[]).find(s => s.id === shiftId);
    return found?.matchScore as number | undefined;
  }, [matchedData, shiftId]);

  const appEntry = appMapData?.data?.[shiftId];

  const handleApply = async () => {
    try {
      await applyToShift.mutateAsync({
        shiftId,
        data: { coverMessage: coverMessage || "Applying for this shift." },
      });
      toast({ title: "Application submitted", description: "The clinic will review your profile shortly." });
      queryClient.invalidateQueries({ queryKey: getGetShiftQueryKey(shiftId) });
      queryClient.invalidateQueries({ queryKey: ["my-applications-map"] });
    } catch (error: any) {
      toast({ title: "Failed to apply", description: error.error ?? "An error occurred", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-80 col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold">Shift not found</h2>
        <Link href="/locum/shifts"><Button variant="outline" className="mt-4">Back to shifts</Button></Link>
      </div>
    );
  }

  const urgencyColor = shift.urgency === "emergency" ? "bg-destructive" : shift.urgency === "urgent" ? "bg-amber-500" : "bg-primary";
  const daysUntil = differenceInDays(parseISO(shift.shiftDate), new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/locum/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to shifts
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: Main content */}
        <div className="flex-1 space-y-5 w-full">
          <Card className="overflow-hidden">
            <div className={`h-2 w-full ${urgencyColor}`} />
            <CardHeader>
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {shift.specialty?.name}
                  </Badge>
                  {shift.urgency !== "normal" && (
                    <Badge
                      variant={shift.urgency === "emergency" ? "destructive" : "outline"}
                      className={`uppercase text-[10px] font-bold tracking-wide ${shift.urgency === "urgent" ? "bg-amber-50 text-amber-700 border-amber-300" : ""}`}
                    >
                      {shift.urgency}
                    </Badge>
                  )}
                </div>
                <ShiftCountdown date={shift.shiftDate} />
              </div>
              <CardTitle className="text-2xl md:text-3xl">{shift.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Key stats */}
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: <Calendar className="h-5 w-5 text-primary" />, label: "Date", val: format(parseISO(shift.shiftDate), "EEEE, MMM d, yyyy") },
                  { icon: <Clock className="h-5 w-5 text-primary" />, label: "Time", val: `${shift.startTime} – ${shift.endTime}` },
                  { icon: <DollarSign className="h-5 w-5 text-primary" />, label: "Rate", val: formatKes(shift.rate) },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                    <div className="p-2 bg-background rounded-lg shadow-sm border shrink-0">{icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-semibold text-sm">{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 text-sm">
                {(shift as any).applicationCount > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{(shift as any).applicationCount} applicant{(shift as any).applicationCount !== 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{shift.positionsAvailable ?? 1} position{(shift.positionsAvailable ?? 1) !== 1 ? "s" : ""} available</span>
                </div>
                {shift.insuranceCovered === "yes" && (
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <ShieldCheck className="h-4 w-4" /> Indemnity covered
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="font-semibold text-base mb-2">About this shift</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {shift.description || "No description provided."}
                </p>
              </div>

              {shift.specificRequirements && (
                <div>
                  <h3 className="font-semibold text-base mb-2">Specific requirements</h3>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 whitespace-pre-wrap">
                    {shift.specificRequirements}
                  </div>
                </div>
              )}

              {shift.minYearsExperience && shift.minYearsExperience > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BriefcaseMedical className="h-4 w-4 shrink-0" />
                  <span>Minimum {shift.minYearsExperience} year{shift.minYearsExperience !== 1 ? "s" : ""} of experience required</span>
                </div>
              )}

              {/* Match score if available */}
              {matchScore !== undefined && (
                <>
                  <Separator />
                  <MatchScoreBar score={matchScore} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="w-full md:w-[300px] space-y-4 shrink-0">
          {/* Apply card */}
          <Card className="border-primary/30 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {appEntry ? "Your Application" : "Apply for Shift"}
              </CardTitle>
              {!appEntry && (
                <CardDescription>
                  {shift.positionsAvailable ?? 1} position{(shift.positionsAvailable ?? 1) !== 1 ? "s" : ""} available
                  {daysUntil >= 0 && daysUntil <= 2 && (
                    <span className="ml-2 text-amber-600 font-medium">· Apply soon!</span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {appEntry ? (
                (() => {
                  const cfg = statusConfig[appEntry.status] ?? statusConfig["applied"];
                  return (
                    <div className={`flex flex-col items-center text-center p-5 rounded-xl border ${cfg.cls}`}>
                      {cfg.icon}
                      <p className="font-semibold mt-2">{cfg.label}</p>
                      <p className="text-xs mt-1 opacity-80">{cfg.desc}</p>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cover message <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Textarea
                      placeholder="Briefly explain why you're a great fit..."
                      value={coverMessage}
                      onChange={e => setCoverMessage(e.target.value)}
                      className="resize-none h-24"
                    />
                  </div>
                  <Button className="w-full" size="lg" onClick={handleApply} disabled={applyToShift.isPending}>
                    {applyToShift.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                    By applying you commit to showing up if confirmed. Late cancellations incur reliability penalties.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinic card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Clinic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-bold">{shift.clinic?.name}</h4>
                <p className="text-xs text-muted-foreground capitalize">{shift.clinic?.facilityType?.replace(/_/g, " ")}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right max-w-[150px] truncate">
                    {[shift.clinic?.subCounty, shift.clinic?.county].filter(Boolean).join(", ")}
                  </span>
                </div>
                {shift.clinic?.address && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Address</span>
                    <span className="font-medium text-right text-xs">{shift.clinic.address}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium flex items-center gap-1 ${shift.clinic?.verificationStatus === "verified" ? "text-primary" : "text-amber-600"}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {shift.clinic?.verificationStatus === "verified" ? "Verified" : "Pending"}
                  </span>
                </div>
                {shift.clinic?.payerScore && Number(shift.clinic.payerScore) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payer score</span>
                    <span className="font-medium flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(shift.clinic.payerScore).toFixed(1)}
                    </span>
                  </div>
                )}
                {(shift.clinic as any)?.totalShiftsFilled > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shifts filled</span>
                    <span className="font-medium">{(shift.clinic as any).totalShiftsFilled}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
