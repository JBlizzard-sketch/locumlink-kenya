import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, Star, ArrowRight, Zap } from "lucide-react";
import { format, parseISO } from "date-fns";

const BASE_URL = import.meta.env.BASE_URL as string;

interface MatchedShift {
  id: number;
  title: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  rate: number;
  urgency: string;
  matchScore: number;
  clinic?: { id: number; name: string; subCounty?: string | null } | null;
  specialty?: { id: number; name: string } | null;
}

function useMatchedShifts() {
  const token = localStorage.getItem("token");
  return useQuery<{ data: MatchedShift[]; total: number }>({
    queryKey: ["matched-shifts-me"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/locums/me/matched-shifts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json() as Promise<{ data: MatchedShift[]; total: number }>;
    },
  });
}

const urgencyColors: Record<string, string> = {
  routine: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
};

export default function LocumMatchedShifts() {
  const { data, isLoading } = useMatchedShifts();

  const formatKes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Recommended Shifts</h1>
        <p className="text-muted-foreground mt-1">
          Open shifts ranked by how well they match your specialty, location, and rate preferences.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold">No matches yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
              Complete your profile with your specialty, experience, and availability to get personalised shift recommendations.
            </p>
            <Link href="/locum/profile">
              <Button>Update Profile</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.data.map(shift => {
            const score = shift.matchScore;
            const scoreColor = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200"
              : "text-gray-500 bg-gray-50 border-gray-200";

            return (
              <Card key={shift.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-start gap-4">
                    {/* Date block */}
                    <div className="bg-primary/10 text-primary p-3 rounded-lg text-center min-w-[64px] shrink-0">
                      <div className="text-xs font-bold uppercase">{format(parseISO(shift.shiftDate), "MMM")}</div>
                      <div className="text-2xl font-black leading-none">{format(parseISO(shift.shiftDate), "dd")}</div>
                      <div className="text-xs mt-0.5">{format(parseISO(shift.shiftDate), "EEE")}</div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base truncate">{shift.title}</h3>
                          <p className="text-sm text-muted-foreground">{shift.clinic?.name}</p>
                        </div>
                        <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-bold shrink-0 ${scoreColor}`}>
                          <span className="text-lg leading-none">{score}</span>
                          <span className="font-normal">match</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />{shift.startTime} – {shift.endTime}
                        </span>
                        {shift.clinic?.subCounty && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />{shift.clinic.subCounty}
                          </span>
                        )}
                        {shift.specialty && (
                          <Badge variant="outline" className="text-xs">{shift.specialty.name}</Badge>
                        )}
                        <Badge className={`text-[10px] border ${urgencyColors[shift.urgency] || ""}`}>
                          {shift.urgency}
                        </Badge>
                      </div>
                    </div>

                    {/* Rate + CTA */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-lg font-bold text-primary">{formatKes(shift.rate)}</span>
                      <Link href={`/locum/shifts/${shift.id}`}>
                        <Button size="sm" className="gap-1.5">
                          View <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
