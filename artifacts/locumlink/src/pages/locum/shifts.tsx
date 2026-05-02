import { useState, useMemo } from "react";
import { useListShifts, useListSpecialties, useApplyToShift, useListMatchedShifts } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import {
  Calendar, Clock, MapPin, ShieldCheck, Filter, Zap, ArrowUpDown,
  CheckCircle2, Clock4, Star, AlertTriangle, X, SlidersHorizontal,
  TrendingUp, ChevronRight, Send,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL as string;

function useMyInvitations() {
  const token = localStorage.getItem("token");
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ["my-invitations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/shifts/my-invitations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60_000,
  });
}

const NAIROBI_SUB_COUNTIES = [
  "Westlands", "Starehe", "Langata", "Karen", "Kileleshwa", "Kilimani",
  "Lavington", "Embakasi", "Kasarani", "Roysambu", "Ruaraka", "Dagoretti",
  "Makadara", "Mathare", "Kibra", "Njiru",
];

interface AppMapEntry { id: number; status: string; }

function useMyApplicationsMap() {
  const token = localStorage.getItem("token");
  return useQuery<{ data: Record<string, AppMapEntry> }>({
    queryKey: ["my-applications-map"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/applications/my-map`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ data: Record<string, AppMapEntry> }>;
    },
    staleTime: 30_000,
  });
}

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

const urgencyStripe: Record<string, string> = {
  normal: "bg-primary",
  urgent: "bg-amber-500",
  emergency: "bg-destructive",
};

const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  applied:     { label: "Applied",     cls: "bg-blue-50 text-blue-700 border-blue-200",   icon: <Clock4 className="h-3 w-3" /> },
  shortlisted: { label: "Shortlisted", cls: "bg-purple-50 text-purple-700 border-purple-200", icon: <Star className="h-3 w-3" /> },
  confirmed:   { label: "Confirmed",   cls: "bg-green-50 text-green-700 border-green-200",    icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:    { label: "Not selected",cls: "bg-red-50 text-red-600 border-red-200",     icon: <X className="h-3 w-3" /> },
};

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score >= 55 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-gray-500 bg-gray-50 border-gray-200";
  return (
    <div className={`flex flex-col items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold shrink-0 ${cls}`}>
      <span className="text-base leading-none font-black">{score}</span>
      <span className="font-normal">match</span>
    </div>
  );
}

function DaysTag({ date }: { date: string }) {
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) return null;
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`;
  const cls = days === 0 ? "bg-red-100 text-red-700" : days <= 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}

function ShiftCard({
  shift, appEntry, matchScore, onQuickApply, applying,
}: {
  shift: any;
  appEntry?: AppMapEntry;
  matchScore?: number;
  onQuickApply: (id: number) => void;
  applying: boolean;
}) {
  const st = appEntry ? statusMeta[appEntry.status] : null;
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow overflow-hidden group relative">
      <div className={`h-1.5 w-full ${urgencyStripe[shift.urgency] ?? "bg-primary"}`} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20">
              {shift.specialty?.name ?? "—"}
            </Badge>
            {shift.urgency !== "normal" && (
              <Badge
                variant={shift.urgency === "emergency" ? "destructive" : "outline"}
                className={`text-[10px] uppercase font-bold tracking-wide ${shift.urgency === "urgent" ? "bg-amber-50 text-amber-700 border-amber-300" : ""}`}
              >
                {shift.urgency}
              </Badge>
            )}
          </div>
          {matchScore !== undefined ? (
            <ScoreBadge score={matchScore} />
          ) : null}
        </div>
        <CardTitle className="text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {shift.title}
        </CardTitle>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{shift.clinic?.name}</span>
          {shift.clinic?.verificationStatus === "verified" && (
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{format(parseISO(shift.shiftDate), "MMM d")}</span>
            <DaysTag date={shift.shiftDate} />
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{shift.startTime}</span>
          </span>
        </div>
        {shift.clinic?.subCounty && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{shift.clinic.subCounty}
          </div>
        )}
        <div className="flex items-end justify-between pt-2 border-t">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Shift rate</p>
            <p className="text-lg font-bold text-primary leading-none">{formatKes(shift.rate)}</p>
          </div>
          {st && (
            <div className={`flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${st.cls}`}>
              {st.icon}{st.label}
            </div>
          )}
          {!st && shift.clinic?.payerScore && (
            <div className="flex items-center gap-0.5 text-xs text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{shift.clinic.payerScore}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Link href={`/locum/shifts/${shift.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">Details</Button>
        </Link>
        {!appEntry ? (
          <Button size="sm" className="flex-1" onClick={() => onQuickApply(shift.id)} disabled={applying}>
            Quick Apply
          </Button>
        ) : (
          <Link href={`/locum/shifts/${shift.id}`} className="flex-1">
            <Button size="sm" variant="secondary" className="w-full gap-1">
              View <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

function FilterPanel({
  specialtyId, setSpecialtyId,
  subCounty, setSubCounty,
  urgency, setUrgency,
  minRate, setMinRate,
  dateFrom, setDateFrom,
  specialties,
  onReset,
}: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs text-muted-foreground">
          Reset
        </Button>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Specialty</Label>
        <Select value={specialtyId} onValueChange={setSpecialtyId}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All specialties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All specialties</SelectItem>
            {specialties?.data?.map((s: any) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Sub-County</Label>
        <Select value={subCounty} onValueChange={setSubCounty}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any location</SelectItem>
            {NAIROBI_SUB_COUNTIES.map(sc => (
              <SelectItem key={sc} value={sc}>{sc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Urgency</Label>
        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Any urgency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any urgency</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Shifts from date</Label>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Min rate (KES)</Label>
        <Input
          type="number"
          placeholder="e.g. 5000"
          value={minRate}
          onChange={e => setMinRate(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-1.5 w-full bg-muted" />
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-2/3 mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LocumShifts() {
  const [tab, setTab] = useState<"all" | "recommended" | "invited">("all");
  const [specialtyId, setSpecialtyId] = useState("all");
  const [subCounty, setSubCounty] = useState("all");
  const [urgency, setUrgency] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [minRate, setMinRate] = useState("");
  const [sortBy, setSortBy] = useState("date_asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: specialties } = useListSpecialties();
  const { data: matchedData, isLoading: matchedLoading } = useListMatchedShifts();
  const { data: invitedData, isLoading: invitedLoading } = useMyInvitations();
  const { data: appMapData } = useMyApplicationsMap();
  const applyToShift = useApplyToShift();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const { data: shiftsData, isLoading: shiftsLoading } = useListShifts({
    status: "open",
    dateFrom: dateFrom || today,
    ...(specialtyId !== "all" ? { specialtyId: Number(specialtyId) } : {}),
    ...(urgency !== "all" ? { urgency } : {}),
    ...(minRate ? { minRate: Number(minRate) } : {}),
    page,
    limit: 18,
  });

  const matchScoreMap = useMemo(() => {
    const map: Record<number, number> = {};
    matchedData?.data?.forEach((s: any) => { map[s.id] = s.matchScore ?? 0; });
    return map;
  }, [matchedData]);

  const appMap = appMapData?.data ?? {};

  const allShifts = useMemo(() => {
    let list: any[] = shiftsData?.data ?? [];
    if (subCounty !== "all") list = list.filter(s => s.clinic?.subCounty === subCounty);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.clinic?.name?.toLowerCase().includes(q) ||
        s.specialty?.name?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "match_desc") list = [...list].sort((a, b) => (matchScoreMap[b.id] ?? 0) - (matchScoreMap[a.id] ?? 0));
    else if (sortBy === "rate_desc") list = [...list].sort((a, b) => b.rate - a.rate);
    else if (sortBy === "rate_asc") list = [...list].sort((a, b) => a.rate - b.rate);
    return list;
  }, [shiftsData, subCounty, search, sortBy, matchScoreMap]);

  const recommendedShifts = useMemo(() => {
    let list = (matchedData?.data ?? []) as any[];
    if (subCounty !== "all") list = list.filter(s => s.clinic?.subCounty === subCounty);
    if (specialtyId !== "all") list = list.filter(s => s.specialtyId === Number(specialtyId));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.clinic?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [matchedData, subCounty, specialtyId, search]);

  const handleQuickApply = async (shiftId: number) => {
    try {
      await applyToShift.mutateAsync({ shiftId, data: { coverMessage: "Quick apply from discovery board" } });
      toast({ title: "Application submitted", description: "The clinic will review your profile shortly." });
      queryClient.invalidateQueries({ queryKey: ["my-applications-map"] });
    } catch (err: any) {
      toast({ title: "Could not apply", description: err.error ?? "An error occurred", variant: "destructive" });
    }
  };

  const resetFilters = () => {
    setSpecialtyId("all"); setSubCounty("all"); setUrgency("all");
    setDateFrom(""); setMinRate(""); setSearch(""); setPage(1);
  };

  const activeFilterCount = [
    specialtyId !== "all", subCounty !== "all", urgency !== "all",
    dateFrom !== "", minRate !== ""
  ].filter(Boolean).length;

  const filterProps = {
    specialtyId, setSpecialtyId, subCounty, setSubCounty,
    urgency, setUrgency, minRate, setMinRate, dateFrom, setDateFrom,
    specialties, onReset: resetFilters,
  };

  const invitedShifts = (invitedData?.data ?? []) as any[];
  const isLoading = tab === "all" ? shiftsLoading : tab === "recommended" ? matchedLoading : invitedLoading;
  const currentShifts = tab === "all" ? allShifts : tab === "recommended" ? recommendedShifts : invitedShifts;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Find Shifts</h1>
        <p className="text-muted-foreground mt-1">Browse open shifts from verified Nairobi clinics.</p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            placeholder="Search shifts, clinics, specialties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[165px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_asc">Soonest first</SelectItem>
            <SelectItem value="date_desc">Latest first</SelectItem>
            <SelectItem value="rate_desc">Highest pay</SelectItem>
            <SelectItem value="rate_asc">Lowest pay</SelectItem>
            <SelectItem value="match_desc">Best match</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile filter sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden relative">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader><SheetTitle>Filter Shifts</SheetTitle></SheetHeader>
            <div className="mt-4"><FilterPanel {...filterProps} /></div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[220px] shrink-0 sticky top-4 bg-card border rounded-xl p-4 shadow-sm">
          <FilterPanel {...filterProps} />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          <Tabs value={tab} onValueChange={v => setTab(v as any)}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> All Shifts
                </TabsTrigger>
                <TabsTrigger value="recommended" className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Recommended
                </TabsTrigger>
                <TabsTrigger value="invited" className="gap-1.5 relative">
                  <Send className="h-3.5 w-3.5" /> Invited
                  {invitedShifts.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {invitedShifts.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              {!isLoading && (
                <p className="text-sm text-muted-foreground">
                  {currentShifts.length} shift{currentShifts.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <TabsContent value="all" className="mt-4">
              {shiftsLoading ? (
                <SkeletonCards />
              ) : allShifts.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold text-lg">No shifts found</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4">Try adjusting your filters or check back later.</p>
                  <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {allShifts.map(shift => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        appEntry={appMap[shift.id]}
                        matchScore={matchScoreMap[shift.id]}
                        onQuickApply={handleQuickApply}
                        applying={applyToShift.isPending}
                      />
                    ))}
                  </div>
                  {(shiftsData?.data?.length ?? 0) === 18 && (
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" onClick={() => setPage(p => p + 1)}>
                        Load more shifts
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="recommended" className="mt-4">
              {matchedLoading ? (
                <SkeletonCards />
              ) : recommendedShifts.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold text-lg">No recommendations yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4 max-w-sm mx-auto">
                    Complete your profile — specialty, sub-county, and preferred rate — to get personalised shift matches.
                  </p>
                  <Link href="/locum/profile">
                    <Button>Update profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Ranked by match score — specialty, location, experience, and rate preferences.</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {recommendedShifts.map((shift: any) => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        appEntry={appMap[shift.id]}
                        matchScore={shift.matchScore}
                        onQuickApply={handleQuickApply}
                        applying={applyToShift.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="invited" className="mt-4">
              {invitedLoading ? (
                <SkeletonCards />
              ) : invitedShifts.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold text-lg">No invitations yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 mb-4 max-w-sm mx-auto">
                    When a clinic invites you to apply for a shift, it will appear here. Keep your profile complete to attract more invitations.
                  </p>
                  <Link href="/locum/profile">
                    <Button variant="outline">Complete profile</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
                    <Send className="h-4 w-4 text-cyan-600" />
                    <span className="text-cyan-800">Clinics have personally invited you to apply for these shifts. Use <strong>Quick Apply</strong> to respond immediately.</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {invitedShifts.map((shift: any) => (
                      <ShiftCard
                        key={shift.id}
                        shift={shift}
                        appEntry={appMap[shift.id]}
                        matchScore={matchScoreMap[shift.id]}
                        onQuickApply={handleQuickApply}
                        applying={applyToShift.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
