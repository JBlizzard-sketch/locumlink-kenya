import { useState, useMemo } from "react";
import { useListShifts, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  ActivitySquare, ArrowRight, Calendar, Clock, MapPin, ShieldCheck,
  Search, SlidersHorizontal, Zap, Building2, X, BriefcaseMedical,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, parseISO, differenceInDays } from "date-fns";

const NAIROBI_SUB_COUNTIES = [
  "Westlands", "Starehe", "Langata", "Karen", "Kileleshwa", "Kilimani",
  "Lavington", "Embakasi", "Kasarani", "Roysambu", "Ruaraka", "Dagoretti",
  "Makadara", "Mathare", "Kibra", "Njiru",
];

const urgencyStripe: Record<string, string> = {
  normal: "bg-primary",
  urgent: "bg-amber-500",
  emergency: "bg-destructive",
};

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function DaysTag({ date }: { date: string }) {
  const days = differenceInDays(parseISO(date), new Date());
  if (days < 0) return null;
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`;
  const cls = days === 0 ? "bg-red-100 text-red-700" : days <= 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}

function PublicShiftCard({ shift, onApply }: { shift: any; onApply: () => void }) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow overflow-hidden group">
      <div className={`h-1.5 w-full ${urgencyStripe[shift.urgency] ?? "bg-primary"}`} />
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-wrap gap-1.5 mb-1">
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
            <MapPin className="h-3 w-3" /> {shift.clinic.subCounty}
          </div>
        )}
        <div className="flex items-end justify-between pt-2 border-t">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Shift rate</p>
            <p className="text-lg font-bold text-primary leading-none">{formatKes(shift.rate)}</p>
          </div>
          {shift.positionsAvailable > 1 && (
            <span className="text-xs text-muted-foreground">{shift.positionsAvailable} positions</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 gap-2">
        <Button size="sm" className="w-full gap-1.5" onClick={onApply}>
          Apply Now <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

export default function PublicShiftBoard() {
  const [, setLocation] = useLocation();
  const [specialtyId, setSpecialtyId] = useState("all");
  const [subCounty, setSubCounty] = useState("all");
  const [search, setSearch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: specialties } = useListSpecialties();
  const today = new Date().toISOString().split("T")[0];

  const { data: shiftsData, isLoading } = useListShifts({
    status: "open",
    dateFrom: dateFrom || today,
    ...(specialtyId !== "all" ? { specialtyId: Number(specialtyId) } : {}),
    limit: 30,
  });

  const displayed = useMemo(() => {
    let list: any[] = shiftsData?.data ?? [];
    if (subCounty !== "all") list = list.filter(s => s.clinic?.subCounty === subCounty);
    if (search !== "all" && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.clinic?.name?.toLowerCase().includes(q) ||
        s.specialty?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [shiftsData, subCounty, search]);

  const handleApply = () => setLocation("/register");

  const activeFilters = [specialtyId !== "all", subCounty !== "all", dateFrom !== ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="h-16 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-4 lg:px-10">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
          <ActivitySquare className="h-6 w-6" />
          <span>LocumLink</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="gap-1.5">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Sign-up call-to-action banner */}
      <div className="bg-primary/8 border-b border-primary/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              <span className="font-semibold">Join LocumLink</span> to apply — free sign-up, KMPDC verification, instant M-Pesa payouts.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/register">
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <BriefcaseMedical className="h-3.5 w-3.5" /> Sign Up as Locum
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" /> Register Clinic
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Open Shifts in Nairobi</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? "Loading shifts…" : `${displayed.length} open shift${displayed.length !== 1 ? "s" : ""} available right now`}
          </p>
        </div>

        {/* Search + filter bar */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, clinic, specialty…"
              value={search === "all" ? "" : search}
              onChange={e => setSearch(e.target.value || "all")}
              className="pl-9"
            />
          </div>

          <Select value={specialtyId} onValueChange={setSpecialtyId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specialties</SelectItem>
              {specialties?.data?.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="relative gap-1.5"
            onClick={() => setShowFilters(f => !f)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {/* Expanded filter row */}
        {showFilters && (
          <div className="bg-card border rounded-xl p-4 grid sm:grid-cols-3 gap-4">
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
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Shifts from date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-9"
                onClick={() => { setSpecialtyId("all"); setSubCounty("all"); setDateFrom(""); setSearch("all"); }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset filters
              </Button>
            </div>
          </div>
        )}

        {/* Shift grid */}
        {isLoading ? (
          <SkeletonGrid />
        ) : displayed.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-semibold text-lg">No shifts match your filters</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Try broadening your search or check back later.</p>
            <Button variant="outline" onClick={() => { setSpecialtyId("all"); setSubCounty("all"); setDateFrom(""); setSearch("all"); }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.map(shift => (
              <PublicShiftCard key={shift.id} shift={shift} onApply={handleApply} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-8 text-center mt-8">
          <h2 className="text-2xl font-bold font-serif mb-2">Ready to work your way?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Sign up free, complete KMPDC verification, and start applying to shifts within 48 hours. Payments via M-Pesa.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <BriefcaseMedical className="h-4 w-4" /> Join as a Locum
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" /> Register Your Clinic
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
