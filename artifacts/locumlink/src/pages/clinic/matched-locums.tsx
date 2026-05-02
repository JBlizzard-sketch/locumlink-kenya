import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, User, Star, Zap, MapPin, ArrowRight } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL as string;

interface MatchedLocum {
  id: number;
  firstName: string;
  lastName: string;
  yearsExperience: number;
  reliabilityScore: string | null;
  totalShiftsCompleted: number;
  verificationStatus: string;
  subCounty: string | null;
  county: string | null;
  preferredRatePerShift: number | null;
  specialty?: { id: number; name: string } | null;
  matchScore: number;
  matchBreakdown: { specialty: number; experience: number; reliability: number; proximity: number; rate: number };
  matchReasons: string[];
}

function useMatchedLocums(shiftId: number) {
  const token = localStorage.getItem("token");
  return useQuery<{ data: MatchedLocum[]; total: number }>({
    queryKey: ["matched-locums", shiftId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/shifts/${shiftId}/matched-locums`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json() as Promise<{ data: MatchedLocum[]; total: number }>;
    },
    enabled: !!shiftId,
  });
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <Progress value={(value / max) * 100} className="h-1.5" />
    </div>
  );
}

function MatchCard({ locum }: { locum: MatchedLocum }) {
  const formatKes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
  const score = locum.matchScore;
  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500";
  const scoreBg = score >= 80 ? "bg-emerald-50 border-emerald-200" : score >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{locum.firstName} {locum.lastName}</p>
              <p className="text-xs text-muted-foreground">
                {locum.specialty?.name} · {locum.yearsExperience} yrs · {locum.subCounty || locum.county || "Nairobi"}
              </p>
            </div>
          </div>
          <div className={`flex flex-col items-center justify-center min-w-[64px] h-14 rounded-xl border font-bold ${scoreBg}`}>
            <span className={`text-xl leading-none ${scoreColor}`}>{score}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>{locum.reliabilityScore ? parseFloat(locum.reliabilityScore).toFixed(1) : "New"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            <span>{locum.totalShiftsCompleted} shifts</span>
          </div>
          {locum.preferredRatePerShift && (
            <div className="text-muted-foreground text-xs">
              Prefers {formatKes(locum.preferredRatePerShift)}/shift
            </div>
          )}
          <Badge variant={locum.verificationStatus === "verified" ? "default" : "secondary"} className="ml-auto text-[10px]">
            {locum.verificationStatus}
          </Badge>
        </div>

        {/* Score breakdown */}
        <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Match Breakdown</p>
          <ScoreBar label="Specialty" value={locum.matchBreakdown.specialty} max={40} />
          <ScoreBar label="Experience" value={locum.matchBreakdown.experience} max={20} />
          <ScoreBar label="Reliability" value={locum.matchBreakdown.reliability} max={20} />
          <ScoreBar label="Proximity" value={locum.matchBreakdown.proximity} max={10} />
          <ScoreBar label="Rate" value={locum.matchBreakdown.rate} max={10} />
        </div>

        {/* Reasons */}
        <div className="flex flex-wrap gap-1.5">
          {locum.matchReasons.slice(0, 4).map((r, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10">
              {r}
            </span>
          ))}
        </div>

        <Button className="w-full" size="sm">
          <ArrowRight className="h-4 w-4 mr-2" /> Invite to Apply
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ClinicMatchedLocums() {
  const [, params] = useRoute("/clinic/shifts/:id/matched");
  const shiftId = Number(params?.id);
  const { data, isLoading } = useMatchedLocums(shiftId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/clinic/shifts/${shiftId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back to shift
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-serif">AI-Matched Locums</h1>
          <p className="text-sm text-muted-foreground">Candidates ranked by specialty, experience, reliability, and proximity</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold">No matches found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              No verified locums with the required specialty are currently available. The pool will update as locums mark availability.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {data.data.length} ranked candidate{data.data.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>80+ Excellent</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>60–79 Good</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block"></span>&lt;60 Fair</span>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map(locum => <MatchCard key={locum.id} locum={locum} />)}
          </div>
        </>
      )}
    </div>
  );
}
