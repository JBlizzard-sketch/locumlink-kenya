import { useGetMyClinic, useGetClinicAnalytics, useListShifts, useListMyClinicApplications, useListBookings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  PlusCircle, Users, ActivitySquare, TrendingUp, AlertTriangle,
  DollarSign, ClipboardList, BriefcaseMedical, Clock, Calendar,
  ChevronRight, CalendarDays,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

const URGENCY_COLORS: Record<string, string> = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
};

export default function ClinicDashboard() {
  const { data: clinic, isLoading: clinicLoading } = useGetMyClinic();
  const { data: analytics, isLoading: analyticsLoading } = useGetClinicAnalytics();
  const { data: openShifts, isLoading: shiftsLoading } = useListShifts({ status: "open" } as any);
  const { data: pendingApps, isLoading: pendingLoading } = useListMyClinicApplications({ status: "applied" } as any);
  const { data: activeBookings, isLoading: bookingsLoading } = useListBookings({ status: "confirmed" } as any);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  const spendChartData = (analytics?.spendByMonth ?? []).map((m) => {
    const [y, mo] = m.month.split("-");
    return {
      ...m,
      label: new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-KE", { month: "short" }),
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Clinic Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {clinicLoading ? "Loading…" : `Welcome back, ${clinic?.name}`}
          </p>
        </div>
        <Link href="/clinic/shifts/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> Post a Shift
          </Button>
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Shifts</CardTitle>
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {shiftsLoading ? <Skeleton className="h-8 w-[60px]" /> : (
              <div className="text-2xl font-bold text-primary">{openShifts?.total || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Actively seeking locums</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fill Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[80px]" /> : (
              <div className="text-2xl font-bold">{analytics?.fillRate || 0}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Historical average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-8 w-[120px]" /> : (
              <div className="text-2xl font-bold">{formatCurrency(analytics?.totalSpend || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Lifetime platform spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {pendingLoading ? <Skeleton className="h-8 w-[60px]" /> : (
              <div className={`text-2xl font-bold ${(pendingApps?.total ?? 0) > 0 ? "text-amber-600" : "text-foreground"}`}>
                {pendingApps?.total ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {(pendingApps?.total ?? 0) > 0 ? (
                <Link href="/clinic/applications" className="text-amber-600 hover:underline">
                  Review applications →
                </Link>
              ) : "Applications awaiting review"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-8 lg:grid-cols-7">

        {/* Spend chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Spend Overview</CardTitle>
            <CardDescription>Monthly locum expenditure</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {analyticsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : spendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    axisLine={false} tickLine={false} tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `KES ${v / 1000}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number) => [formatCurrency(value), "Spend"]}
                  />
                  <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No spend data yet — post your first shift to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/clinic/shifts/new">
              <Button className="w-full justify-start h-11" variant="outline">
                <PlusCircle className="h-5 w-5 mr-3 text-primary" /> Create a new shift
              </Button>
            </Link>
            <Link href="/clinic/applications">
              <Button className="w-full justify-start h-11" variant="outline">
                <ClipboardList className="h-5 w-5 mr-3 text-primary" />
                Review applications
                {(pendingApps?.total ?? 0) > 0 && (
                  <Badge className="ml-auto text-xs">{pendingApps!.total}</Badge>
                )}
              </Button>
            </Link>
            <Link href="/clinic/locums">
              <Button className="w-full justify-start h-11" variant="outline">
                <Users className="h-5 w-5 mr-3 text-primary" /> Browse locum directory
              </Button>
            </Link>
            <Link href="/clinic/bookings">
              <Button className="w-full justify-start h-11" variant="outline">
                <CalendarDays className="h-5 w-5 mr-3 text-primary" />
                Active bookings
                {!bookingsLoading && (activeBookings?.total ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{activeBookings!.total}</Badge>
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Open shifts list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Open Shifts</CardTitle>
            <CardDescription>Your shifts currently accepting applications</CardDescription>
          </div>
          <Link href="/clinic/shifts">
            <Button variant="outline" size="sm" className="gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : !openShifts?.data?.length ? (
            <div className="text-center py-10 border-2 border-dashed rounded-xl bg-muted/20">
              <BriefcaseMedical className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">No open shifts. Post one to start receiving applications.</p>
              <Link href="/clinic/shifts/new">
                <Button size="sm" className="gap-2"><PlusCircle className="h-4 w-4" /> Post a Shift</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {openShifts.data.slice(0, 5).map((shift: any) => (
                <Link key={shift.id} href={`/clinic/shifts/${shift.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BriefcaseMedical className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{shift.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {shift.shiftDate ? format(parseISO(shift.shiftDate), "EEE d MMM") : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shift.startTime} – {shift.endTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {shift.urgency && shift.urgency !== "normal" && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${URGENCY_COLORS[shift.urgency] ?? ""}`}>
                          {shift.urgency}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">
                        {formatCurrency(shift.rate)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
