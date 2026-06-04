import {
  useGetLocumAnalytics,
  useListUpcomingShifts,
  useListMatchedShifts,
  useGetMyLocum,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Calendar, Clock, DollarSign, Star, AlertCircle,
  User, FileText, Zap, CheckCircle2, ChevronRight, Bell, MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useMemo } from "react";

const BASE_URL = import.meta.env.BASE_URL as string;

const WEIGHTS = [10, 15, 15, 10, 5, 10, 5, 10, 10, 5, 5];

function useProfileCompleteness() {
  const { data: profile, isLoading } = useGetMyLocum();

  const items = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "First & last name",          done: !!(profile.firstName && profile.lastName),                            href: "/locum/profile",    icon: User     },
      { label: "Professional bio",            done: !!profile.bio?.trim(),                                               href: "/locum/profile",    icon: FileText },
      { label: "Primary specialty",           done: !!profile.primarySpecialtyId,                                        href: "/locum/profile",    icon: Star     },
      { label: "Years of experience",         done: (profile.yearsExperience ?? 0) > 0,                                  href: "/locum/profile",    icon: Zap      },
      { label: "Preferred rate",              done: !!(profile.preferredRatePerShift && profile.preferredRatePerShift > 0), href: "/locum/profile", icon: Zap      },
      { label: "M-Pesa number",              done: !!(profile as any).mpesaNumber?.trim(),                               href: "/locum/profile",    icon: Zap      },
      { label: "Sub-county / location",       done: !!profile.subCounty?.trim(),                                         href: "/locum/profile",    icon: User     },
      { label: "Profile photo",               done: !!(profile as any).profilePhotoUrl,                                  href: "/locum/profile",    icon: User     },
      { label: "National ID uploaded",        done: !!(profile as any).idDocumentUrl,                                    href: "/locum/documents",  icon: FileText },
      { label: "Practicing certificate",      done: !!(profile as any).practicingCertUrl,                                href: "/locum/documents",  icon: FileText },
      { label: "Registration certificate",    done: !!(profile as any).registrationCertUrl,                              href: "/locum/documents",  icon: FileText },
    ];
  }, [profile]);

  const score = useMemo(
    () => items.reduce((acc, item, i) => acc + (item.done ? WEIGHTS[i] : 0), 0),
    [items],
  );

  const missing = items.filter((i) => !i.done);

  return { score, missing, isLoading, hasProfile: !!profile };
}

function useShiftInvitations() {
  const token = localStorage.getItem("token");
  return useQuery<{ data: any[]; total: number }>({
    queryKey: ["shift-invitations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/shifts/my-invitations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: any[]; total: number }>;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function strengthLabel(score: number) {
  if (score >= 90) return { text: "Complete",      color: "text-green-700", bg: "bg-green-50 border-green-200",  bar: "bg-green-500"  };
  if (score >= 65) return { text: "Strong",         color: "text-blue-700",  bg: "bg-blue-50 border-blue-200",   bar: "bg-blue-500"   };
  if (score >= 35) return { text: "Getting there",  color: "text-amber-700", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-500"  };
  return               { text: "Just started",   color: "text-rose-700",  bg: "bg-rose-50 border-rose-200",   bar: "bg-rose-500"   };
}

const formatKes = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export default function LocumDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useGetLocumAnalytics();
  const { data: upcomingShifts, isLoading: upcomingLoading } = useListUpcomingShifts();
  const { data: matchedShifts, isLoading: matchedLoading } = useListMatchedShifts();
  const { score, missing, isLoading: profileLoading } = useProfileCompleteness();
  const { data: invitationsData, isLoading: invitesLoading } = useShiftInvitations();

  const strength = strengthLabel(score);
  const showCompletenessCard = !profileLoading && score < 90;
  const pendingInvites = invitationsData?.data ?? [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your shifts, earnings, and performance.</p>
      </div>

      {/* Profile completeness banner */}
      {profileLoading ? (
        <Skeleton className="h-[88px] w-full rounded-xl" />
      ) : showCompletenessCard ? (
        <Card className={`border ${strength.bg}`}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
                    <circle
                      cx="28" cy="28" r="23" fill="none" strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 23}`}
                      strokeDashoffset={`${2 * Math.PI * 23 * (1 - score / 100)}`}
                      strokeLinecap="round"
                      className={strength.bar.replace("bg-", "stroke-")}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${strength.color}`}>
                    {score}%
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">Profile Strength</span>
                    <Badge variant="outline" className={`text-xs ${strength.color} border-current`}>{strength.text}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    A complete profile gets you <strong>3× more shift matches</strong>. {missing.length} item{missing.length !== 1 ? "s" : ""} remaining.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.slice(0, 3).map((item) => (
                      <Link key={item.label} href={item.href}>
                        <Badge
                          variant="outline"
                          className="text-xs gap-1 cursor-pointer hover:bg-background transition-colors"
                        >
                          <item.icon className="h-2.5 w-2.5" />
                          {item.label}
                        </Badge>
                      </Link>
                    ))}
                    {missing.length > 3 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{missing.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Link href="/locum/profile">
                <Button size="sm" variant="outline" className={`gap-1.5 shrink-0 ${strength.color} border-current hover:bg-background`}>
                  Complete Profile <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : score >= 90 ? (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Your profile is complete — you're fully set up for shift matching!</span>
        </div>
      ) : null}

      {/* Shift Invitations */}
      {(invitesLoading || pendingInvites.length > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Shift Invitations</CardTitle>
              {pendingInvites.length > 0 && (
                <Badge className="text-xs px-1.5 h-5">{pendingInvites.length}</Badge>
              )}
            </div>
            <Link href="/locum/notifications">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                View all notifications
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {invitesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((shift: any) => (
                  <div
                    key={shift.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-background border hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg text-center shrink-0 min-w-[52px]">
                        <div className="text-[10px] font-bold uppercase leading-tight">
                          {format(parseISO(shift.shiftDate), "MMM")}
                        </div>
                        <div className="text-lg font-black leading-tight">
                          {format(parseISO(shift.shiftDate), "dd")}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{shift.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground">{shift.clinic?.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {shift.startTime} – {shift.endTime}
                          </span>
                          {shift.subCounty && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {shift.subCounty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-primary">{formatKes(shift.rate)}</span>
                      <Link href={`/locum/shifts/${shift.id}`}>
                        <Button size="sm" className="gap-1.5 h-8">
                          View & Apply <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <div className="text-2xl font-bold">{formatCurrency(analytics?.totalEarnings || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[60px]" /> : (
              <div className="text-2xl font-bold">{analytics?.totalShiftsCompleted || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[80px]" /> : (
              <div className="text-2xl font-bold">{analytics?.averageRating?.toFixed(1) || "N/A"}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">From clinics</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reliability</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[80px]" /> : (
              <div className="text-2xl font-bold">{analytics?.reliabilityScore || "100"}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Attendance rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">

        {/* Upcoming Shifts */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Confirmed Shifts</CardTitle>
              <CardDescription>Your schedule for the next 7 days</CardDescription>
            </div>
            <Link href="/locum/bookings">
              <Button variant="outline" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[80px] w-full rounded-xl" />
                <Skeleton className="h-[80px] w-full rounded-xl" />
              </div>
            ) : upcomingShifts?.data?.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No upcoming shifts</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">You have no confirmed bookings for the upcoming week.</p>
                <Link href="/locum/shifts">
                  <Button>Find Shifts</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingShifts?.data?.slice(0, 3).map((shift) => (
                  <div key={shift.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-4 mb-4 sm:mb-0">
                      <div className="bg-primary/10 text-primary p-3 rounded-lg text-center min-w-[70px]">
                        <div className="text-xs font-bold uppercase">{format(parseISO(shift.shiftDate), "MMM")}</div>
                        <div className="text-2xl font-black">{format(parseISO(shift.shiftDate), "dd")}</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{shift.title}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {shift.startTime} - {shift.endTime}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium text-foreground">{(shift as any).clinic?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {formatCurrency(shift.rate)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matched Shifts */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recommended for you</CardTitle>
            <CardDescription>Open shifts matching your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {matchedLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[60px] w-full rounded-lg" />
                <Skeleton className="h-[60px] w-full rounded-lg" />
                <Skeleton className="h-[60px] w-full rounded-lg" />
              </div>
            ) : matchedShifts?.data?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No matches right now. Update your profile or availability to see more.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchedShifts?.data?.slice(0, 4).map((shift) => (
                  <Link key={shift.id} href={`/locum/shifts/${shift.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors mb-3">
                      <div className="overflow-hidden pr-4">
                        <h4 className="font-medium text-sm truncate">{(shift as any).clinic?.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{format(parseISO(shift.shiftDate), "MMM dd")}</span>
                          <span>•</span>
                          <span className="truncate">{(shift as any).specialty?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold">{formatCurrency(shift.rate)}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
                {matchedShifts?.data && matchedShifts.data.length > 0 && (
                  <Link href="/locum/shifts">
                    <Button variant="ghost" className="w-full text-sm mt-2">
                      See all {matchedShifts.total} matches
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
