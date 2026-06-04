import { useState } from "react";
import { useGetMyClinic, useGetClinicAnalytics, useListShifts, useListMyClinicApplications, useListBookings, useCreateShift, useListSpecialties, getListShiftsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  PlusCircle, Users, ActivitySquare, TrendingUp,
  DollarSign, ClipboardList, BriefcaseMedical, Clock, Calendar,
  ChevronRight, CalendarDays, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const URGENCY_COLORS: Record<string, string> = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  emergency: "bg-red-50 text-red-700 border-red-200",
};

function QuickUrgentShiftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [title, setTitle] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [shiftDate, setShiftDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("14:00");
  const [rate, setRate] = useState("");

  const { data: specialties } = useListSpecialties();
  const createShift = useCreateShift();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialtyId || !title || !rate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await createShift.mutateAsync({
        data: {
          title,
          specialtyId: parseInt(specialtyId),
          shiftDate,
          startTime,
          endTime,
          rate: parseInt(rate),
          urgency: "urgent",
          positionsAvailable: 1,
        },
      });
      toast({ title: "Urgent shift posted!", description: "Matching locums will be notified." });
      queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey() });
      onOpenChange(false);
      setTitle(""); setSpecialtyId(""); setShiftDate(today); setStartTime("08:00"); setEndTime("14:00"); setRate("");
    } catch (err: any) {
      toast({ title: "Failed to post shift", description: err?.data?.error || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Post Urgent Shift
          </DialogTitle>
          <DialogDescription>
            Fill in the essentials — this shift will be flagged as urgent and prioritised in locum search results.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qs-title">Shift title *</Label>
            <Input id="qs-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Emergency GP Cover" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qs-specialty">Specialty *</Label>
            <Select value={specialtyId} onValueChange={setSpecialtyId} required>
              <SelectTrigger id="qs-specialty">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties?.data?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qs-date">Date *</Label>
              <Input id="qs-date" type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} min={today} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-start">Start *</Label>
              <Input id="qs-start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-end">End *</Label>
              <Input id="qs-end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qs-rate">Rate (KES) *</Label>
            <Input id="qs-rate" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 8000" min={1} required />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createShift.isPending} className="gap-1.5">
              <Zap className="h-4 w-4" />
              {createShift.isPending ? "Posting…" : "Post Urgent Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClinicDashboard() {
  const [urgentOpen, setUrgentOpen] = useState(false);

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
      <QuickUrgentShiftDialog open={urgentOpen} onOpenChange={setUrgentOpen} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Clinic Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {clinicLoading ? "Loading…" : `Welcome back, ${clinic?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setUrgentOpen(true)}
          >
            <Zap className="h-4 w-4" /> Post Urgent Shift
          </Button>
          <Link href="/clinic/shifts/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Post a Shift
            </Button>
          </Link>
        </div>
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
            <Button className="w-full justify-start h-11" variant="outline" onClick={() => setUrgentOpen(true)}>
              <Zap className="h-5 w-5 mr-3 text-amber-500" /> Post urgent shift
            </Button>
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
