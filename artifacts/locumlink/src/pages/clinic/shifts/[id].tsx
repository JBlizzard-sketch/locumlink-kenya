import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetShift,
  getGetShiftQueryKey,
  useListShiftApplications,
  useShortlistApplication,
  useConfirmApplication,
  useRejectApplication,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft, MapPin, Calendar, Clock, Star, AlertCircle, CheckCircle2,
  XCircle, Sparkles, Zap, Users, Briefcase, FileText, Info,
  ChevronRight, ShieldCheck,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type AppStatus = "applied" | "shortlisted" | "confirmed" | "rejected" | "withdrawn";
type FilterTab = "all" | AppStatus;
type SortKey = "match" | "date" | "exp";

const STATUS_STYLES: Record<AppStatus, string> = {
  applied:     "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
  confirmed:   "bg-green-50 text-green-700 border-green-200",
  rejected:    "bg-red-50 text-red-600 border-red-200",
  withdrawn:   "bg-gray-50 text-gray-500 border-gray-200",
};

const URGENCY_STYLES: Record<string, string> = {
  normal:    "bg-blue-50 text-blue-700 border-blue-200",
  urgent:    "bg-amber-50 text-amber-700 border-amber-300",
  emergency: "bg-red-50 text-red-700 border-red-300",
};

const URGENCY_STRIPE: Record<string, string> = {
  normal:    "bg-primary",
  urgent:    "bg-amber-500",
  emergency: "bg-destructive",
};

const SORT_LABELS: Record<SortKey, string> = {
  match: "Best match",
  date:  "Applied date",
  exp:   "Most experienced",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function MatchBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-500"}`}>
        {score}%
      </span>
    </div>
  );
}

function DaysUntil({ date }: { date: string }) {
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Past</span>;
  if (days === 0) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Today</span>;
  if (days === 1) return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Tomorrow</span>;
  return <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">In {days}d</span>;
}

export default function ClinicShiftDetail() {
  const [, params] = useRoute("/clinic/shifts/:id");
  const shiftId = Number(params?.id);

  const { data: shift, isLoading: shiftLoading } = useGetShift(shiftId, {
    query: { enabled: !!shiftId, queryKey: getGetShiftQueryKey(shiftId) },
  });

  const { data: applications, isLoading: appsLoading } = useListShiftApplications(shiftId, {
    query: { queryKey: [`/api/shifts/${shiftId}/applications`], enabled: !!shiftId },
  });

  const shortlist = useShortlistApplication();
  const confirm  = useConfirmApplication();
  const reject   = useRejectApplication();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab]   = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortKey>("match");

  const allApps = applications?.data ?? [];

  const tabCounts = useMemo(() => {
    const c: Partial<Record<FilterTab, number>> = { all: allApps.length };
    for (const a of allApps) c[a.status as AppStatus] = (c[a.status as AppStatus] ?? 0) + 1;
    return c;
  }, [allApps]);

  const displayed = useMemo(() => {
    const filtered = tab === "all" ? allApps : allApps.filter((a) => a.status === tab);
    return [...filtered].sort((a, b) => {
      if (sort === "match") return Number(b.matchScore ?? 0) - Number(a.matchScore ?? 0);
      if (sort === "exp")   return Number(b.locum?.yearsExperience ?? 0) - Number(a.locum?.yearsExperience ?? 0);
      return 0; // date — keep server order
    });
  }, [allApps, tab, sort]);

  const handleAction = async (appId: number, action: "shortlist" | "confirm" | "reject") => {
    try {
      if (action === "shortlist") await shortlist.mutateAsync({ id: appId });
      if (action === "confirm")   await confirm.mutateAsync({ id: appId });
      if (action === "reject")    await reject.mutateAsync({ id: appId });
      toast({ title: `Application ${action}ed` });
      queryClient.invalidateQueries({ queryKey: getGetShiftQueryKey(shiftId) });
      queryClient.invalidateQueries({ queryKey: [`/api/shifts/${shiftId}/applications`] });
    } catch (error: any) {
      toast({ title: "Action failed", description: error.error ?? "An error occurred", variant: "destructive" });
    }
  };

  if (shiftLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!shift) return (
    <div className="max-w-5xl mx-auto py-20 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium">Shift not found</p>
      <Link href="/clinic/shifts"><Button variant="outline" className="mt-4">Back to shifts</Button></Link>
    </div>
  );

  const filled    = shift.positionsFilled ?? 0;
  const available = shift.positionsAvailable ?? 1;
  const fillPct   = Math.min(100, Math.round((filled / available) * 100));
  const isFull    = filled >= available;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/clinic/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> All shifts
        </Link>
        <Link href={`/clinic/shifts/${shiftId}/matched`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Zap className="h-4 w-4 text-primary" /> AI-Match Locums
          </Button>
        </Link>
      </div>

      {/* Shift header card */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className={`h-1.5 w-full ${URGENCY_STRIPE[shift.urgency ?? "normal"] ?? "bg-primary"}`} />
        <CardHeader className="bg-muted/10 border-b pb-5 pt-5">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="bg-background">
              {shift.specialty?.name ?? "—"}
            </Badge>
            {shift.urgency && shift.urgency !== "normal" && (
              <Badge variant="outline" className={`uppercase text-[10px] font-bold tracking-wide ${URGENCY_STYLES[shift.urgency]}`}>
                {shift.urgency}
              </Badge>
            )}
            <Badge variant="outline" className="capitalize ml-auto">
              {shift.status}
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl">{shift.title}</CardTitle>
        </CardHeader>

        <CardContent className="pt-5 pb-6 space-y-5">
          {/* Core meta row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1.5">Date</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">{shift.shiftDate ? format(parseISO(shift.shiftDate), "EEE d MMM") : "—"}</span>
                {shift.shiftDate && <DaysUntil date={shift.shiftDate} />}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1.5">Time</p>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">{shift.startTime} – {shift.endTime}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1.5">Rate</p>
              <p className="font-bold text-primary text-base">{fmt(shift.rate)}</p>
            </div>
            {shift.minYearsExperience != null && shift.minYearsExperience > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-1.5">Min. Experience</p>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{shift.minYearsExperience} yrs</span>
                </div>
              </div>
            )}
          </div>

          {/* Fill progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Positions filled</span>
              <span className={`font-semibold ${isFull ? "text-green-600" : "text-foreground"}`}>
                {filled} / {available}
                {isFull && <CheckCircle2 className="inline h-3.5 w-3.5 ml-1" />}
              </span>
            </div>
            <Progress value={fillPct} className={`h-2 ${isFull ? "[&>div]:bg-green-500" : ""}`} />
          </div>

          {/* Description */}
          {shift.description && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Description
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{shift.description}</p>
            </div>
          )}

          {/* Requirements */}
          {shift.specificRequirements && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> Specific requirements
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{shift.specificRequirements}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applicants section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Users className="h-6 w-6 text-muted-foreground" />
            Applicants
            <span className="text-muted-foreground text-base font-normal">({allApps.length})</span>
          </h2>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[170px]">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status tabs */}
        <div className="overflow-x-auto pb-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="flex-nowrap w-max">
              {(["all", "applied", "shortlisted", "confirmed", "rejected"] as FilterTab[]).map((t) => {
                const count = tabCounts[t] ?? 0;
                const label = t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1);
                return (
                  <TabsTrigger key={t} value={t} className="gap-1.5 whitespace-nowrap">
                    {label}
                    {count > 0 && (
                      <span className="text-[10px] font-semibold bg-muted rounded-full px-1.5 py-0.5 leading-none">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {appsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium">
              {tab === "all" ? "No applicants yet" : `No ${tab} applicants`}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {tab === "all"
                ? "We've notified matching locums. Applications will appear here."
                : "Try a different filter."}
            </p>
            {tab !== "all" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("all")}>
                Clear filter
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((app) => {
              const s = app.status as AppStatus;
              const isActionable = s === "applied" || s === "shortlisted";
              return (
                <Card
                  key={app.id}
                  className={`overflow-hidden transition-shadow hover:shadow-md ${s === "confirmed" ? "border-green-200 bg-green-50/20" : s === "rejected" ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Locum info */}
                      <div className="flex items-start gap-4 flex-1 p-5">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm shrink-0">
                          <AvatarImage src={app.locum?.profilePhotoUrl ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {app.locum?.firstName?.charAt(0)}{app.locum?.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base">
                              {app.locum?.firstName} {app.locum?.lastName}
                            </span>
                            {app.locum?.verificationStatus === "verified" && (
                              <span title="Verified">
                                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ml-auto shrink-0 ${STATUS_STYLES[s] ?? ""}`}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                              <span className="font-medium text-foreground">
                                {app.locum?.reliabilityScore ? Number(app.locum.reliabilityScore).toFixed(1) : "New"}
                              </span>
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{app.locum?.yearsExperience ?? 0} yrs exp</span>
                            {app.locum?.subCounty && (
                              <>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{app.locum.subCounty}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Match score bar */}
                          {app.matchScore != null && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="shrink-0">Match</span>
                              <MatchBar score={Number(app.matchScore)} />
                            </div>
                          )}

                          {/* Cover message */}
                          {app.coverMessage && (
                            <p className="text-sm text-foreground/80 italic border-l-2 border-primary/20 pl-3 mt-1 line-clamp-2">
                              "{app.coverMessage}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions panel */}
                      <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-2 px-5 pb-4 md:pb-0 md:border-l md:w-40 md:px-4">
                        {/* View profile */}
                        {app.locum?.id && (
                          <Link href={`/clinic/locums/${app.locum.id}`} className="w-full">
                            <Button variant="ghost" size="sm" className="w-full gap-1 text-xs text-muted-foreground">
                              Profile <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}

                        {/* State-specific actions */}
                        {s === "confirmed" && (
                          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Confirmed
                          </div>
                        )}

                        {s === "rejected" && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <XCircle className="h-4 w-4" /> Rejected
                          </div>
                        )}

                        {isActionable && (
                          <div className="flex flex-row md:flex-col gap-2 w-full">
                            {s === "applied" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handleAction(app.id, "shortlist")}
                                disabled={shortlist.isPending}
                              >
                                Shortlist
                              </Button>
                            )}
                            {s === "shortlisted" && (
                              <Badge variant="outline" className={`text-xs justify-center ${STATUS_STYLES.shortlisted}`}>
                                Shortlisted
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => handleAction(app.id, "confirm")}
                              disabled={confirm.isPending || isFull}
                            >
                              {isFull ? "Full" : "Confirm"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleAction(app.id, "reject")}
                              disabled={reject.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
