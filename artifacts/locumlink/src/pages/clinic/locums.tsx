import { useState, useCallback, useMemo } from "react";
import { useListLocums, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Star, MapPin, BriefcaseMedical, ShieldCheck, Users, X, Zap, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useDebounce } from "@/hooks/use-debounce";

const NAIROBI_SUB_COUNTIES = [
  "Westlands", "Dagoretti North", "Dagoretti South", "Langata", "Kibra",
  "Roysambu", "Kasarani", "Ruaraka", "Embakasi South", "Embakasi North",
  "Embakasi Central", "Embakasi East", "Embakasi West", "Makadara",
  "Kamukunji", "Starehe", "Mathare",
];

const EXP_OPTIONS = [
  { value: "any", label: "Any experience" },
  { value: "1",   label: "1+ years" },
  { value: "3",   label: "3+ years" },
  { value: "5",   label: "5+ years" },
  { value: "10",  label: "10+ years" },
];

const SORT_OPTIONS = [
  { value: "default",    label: "Default" },
  { value: "exp_desc",   label: "Most experienced" },
  { value: "rate_asc",   label: "Lowest rate" },
  { value: "rate_desc",  label: "Highest rate" },
  { value: "reliability",label: "Most reliable" },
];

export default function ClinicLocumsDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const [specialtyId, setSpecialtyId] = useState<string>("all");
  const [subCounty, setSubCounty] = useState<string>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [minExp, setMinExp] = useState<string>("any");
  const [sortBy, setSortBy] = useState<string>("default");

  const search = useDebounce(searchInput, 350);

  const { data: specialties } = useListSpecialties();

  const { data: locumsData, isLoading } = useListLocums({
    verificationStatus: "verified",
    ...(search ? { search } : {}),
    ...(specialtyId !== "all" ? { specialtyId: Number(specialtyId) } : {}),
    ...(subCounty !== "all" ? { subCounty } : {}),
    ...(urgentOnly ? { isAvailableForUrgent: true } : {}),
    limit: 60,
  } as any);

  const processed = useMemo(() => {
    let list = locumsData?.data ?? [];
    if (minExp !== "any") {
      const min = parseInt(minExp);
      list = list.filter((l) => (l.yearsExperience ?? 0) >= min);
    }
    switch (sortBy) {
      case "exp_desc":
        return [...list].sort((a, b) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));
      case "rate_asc":
        return [...list].sort((a, b) => (a.preferredRatePerShift ?? Infinity) - (b.preferredRatePerShift ?? Infinity));
      case "rate_desc":
        return [...list].sort((a, b) => (b.preferredRatePerShift ?? 0) - (a.preferredRatePerShift ?? 0));
      case "reliability":
        return [...list].sort((a, b) => parseFloat(b.reliabilityScore ?? "0") - parseFloat(a.reliabilityScore ?? "0"));
      default:
        return list;
    }
  }, [locumsData, minExp, sortBy]);

  const hasFilters = !!searchInput || specialtyId !== "all" || subCounty !== "all" || urgentOnly || minExp !== "any" || sortBy !== "default";

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSpecialtyId("all");
    setSubCounty("all");
    setUrgentOnly(false);
    setMinExp("any");
    setSortBy("default");
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Locum Directory</h1>
        <p className="text-muted-foreground mt-1">
          Browse verified medical professionals available in Nairobi.
          {processed.length > 0 && (
            <span className="ml-2 text-sm font-medium text-foreground">{processed.length} found</span>
          )}
        </p>
      </div>

      {/* Search & Filters row 1 */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-lg border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by doctor name…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={specialtyId} onValueChange={setSpecialtyId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties?.data?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subCounty} onValueChange={setSubCounty}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="All Sub-counties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sub-counties</SelectItem>
            {NAIROBI_SUB_COUNTIES.map((sc) => (
              <SelectItem key={sc} value={sc}>{sc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0" title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter row 2 — experience, sort, urgent toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={minExp} onValueChange={setMinExp}>
          <SelectTrigger className="w-[160px] h-9">
            <BriefcaseMedical className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXP_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9">
            <TrendingUp className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card h-9">
          <Switch
            id="urgent-filter"
            checked={urgentOnly}
            onCheckedChange={setUrgentOnly}
            className="h-4 w-7 data-[state=checked]:bg-green-600"
          />
          <Label htmlFor="urgent-filter" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-green-600" />
            Available for urgent
          </Label>
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {searchInput && (
            <Badge variant="secondary" className="gap-1.5 pl-2">
              <Search className="h-3 w-3" /> "{searchInput}"
              <button onClick={() => setSearchInput("")} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
          {specialtyId !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pl-2">
              <BriefcaseMedical className="h-3 w-3" />
              {specialties?.data?.find(s => s.id.toString() === specialtyId)?.name}
              <button onClick={() => setSpecialtyId("all")} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
          {subCounty !== "all" && (
            <Badge variant="secondary" className="gap-1.5 pl-2">
              <MapPin className="h-3 w-3" /> {subCounty}
              <button onClick={() => setSubCounty("all")} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
          {minExp !== "any" && (
            <Badge variant="secondary" className="gap-1.5 pl-2">
              <BriefcaseMedical className="h-3 w-3" /> {minExp}+ yrs exp
              <button onClick={() => setMinExp("any")} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
          {urgentOnly && (
            <Badge variant="secondary" className="gap-1.5 pl-2 text-green-700 bg-green-50 border-green-200">
              <Zap className="h-3 w-3" /> Available for urgent
              <button onClick={() => setUrgentOnly(false)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : processed.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No locums found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4 gap-2">
              <X className="h-4 w-4" /> Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {processed.map((locum) => (
            <Card key={locum.id} className="flex flex-col hover:shadow-md transition-shadow group">
              <CardContent className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                    <AvatarImage src={locum.profilePhotoUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {locum.firstName?.charAt(0)}{locum.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {locum.isAvailableForUrgent && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
                      <Zap className="h-3 w-3" /> Available Now
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-lg flex items-center gap-1.5">
                    Dr. {locum.firstName} {locum.lastName}
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  </h3>
                  <p className="text-sm text-primary font-medium">{(locum as any).specialty?.name ?? "—"}</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-medium text-foreground">
                      {locum.reliabilityScore ? `${parseFloat(locum.reliabilityScore).toFixed(0)}%` : "New"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BriefcaseMedical className="h-4 w-4" />
                    <span>{locum.yearsExperience ?? 0} yrs exp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{locum.subCounty ?? "Nairobi"}</span>
                  </div>
                </div>

                {locum.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">
                    "{locum.bio}"
                  </p>
                )}
              </CardContent>

              <CardFooter className="p-6 pt-0 flex items-center justify-between border-t mt-auto gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Rate</p>
                  <p className="font-bold text-foreground">
                    {locum.preferredRatePerShift
                      ? formatCurrency(locum.preferredRatePerShift)
                      : "Negotiable"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/clinic/locums/${locum.id}`}>
                    <Button variant="outline" size="sm">View Profile</Button>
                  </Link>
                  <Link href={`/clinic/shifts/new?specialtyId=${locum.primarySpecialtyId}`}>
                    <Button size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      Post Shift
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
