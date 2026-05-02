import { useGetPlatformSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { Users, Building2, ActivitySquare, AlertTriangle, ShieldCheck, DollarSign, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: summary, isLoading } = useGetPlatformSummary();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

  const revenueByMonth = (summary?.revenueByMonth ?? []).map(m => {
    const [y, mo] = m.month.split("-");
    const label = new Date(Number(y), Number(mo) - 1, 1)
      .toLocaleString("en-KE", { month: "short", year: "2-digit" });
    return { ...m, label };
  });

  const locumVerRate = summary && summary.totalLocums > 0
    ? Math.round((summary.verifiedLocums / summary.totalLocums) * 100) : 0;
  const clinicVerRate = summary && summary.totalClinics > 0
    ? Math.round((summary.verifiedClinics / summary.totalClinics) * 100) : 0;
  const fillRate = summary && summary.totalShiftsPosted > 0
    ? Math.round((summary.totalShiftsFilled / summary.totalShiftsPosted) * 100) : 0;

  const verificationData = [
    { label: "Locums", verified: summary?.verifiedLocums ?? 0, pending: (summary?.totalLocums ?? 0) - (summary?.verifiedLocums ?? 0) },
    { label: "Clinics", verified: summary?.verifiedClinics ?? 0, pending: (summary?.totalClinics ?? 0) - (summary?.verifiedClinics ?? 0) },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time metrics for LocumLink Kenya.</p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}><CardContent className="p-6">
              <Skeleton className="h-4 w-1/2 mb-2" /><Skeleton className="h-8 w-1/3" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locums</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalLocums ?? 0}</div>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={locumVerRate} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground">{locumVerRate}% verified</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalClinics ?? 0}</div>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={clinicVerRate} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground">{clinicVerRate}% verified</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shift Fill Rate</CardTitle>
              <ActivitySquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fillRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.totalShiftsFilled ?? 0} of {summary?.totalShiftsPosted ?? 0} filled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(summary?.totalPaymentsProcessed ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Platform revenue: {fmt(summary?.platformRevenue ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Pending Verifications</CardTitle>
              <ShieldCheck className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{summary?.pendingVerifications ?? 0}</div>
              <p className="text-xs text-yellow-600/80 mt-1">Needs manual review</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Open Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{summary?.openDisputes ?? 0}</div>
              <p className="text-xs text-red-600/80 mt-1">Requires immediate attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue trend */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Platform Revenue</CardTitle>
              <CardDescription>Monthly fee income from completed shifts</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
          </CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }}
                    tickFormatter={v => `${v / 1000}k`} width={44} />
                  <RechartsTooltip
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                    formatter={(v: number) => [fmt(v), "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Revenue data will appear once shifts are completed.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification status stacked bar */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>Verified vs pending users by type</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verificationData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} width={32} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                  />
                  <Bar dataKey="verified" name="Verified" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="pending" name="Pending" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} stackId="a" opacity={0.35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shift volume chart */}
      {revenueByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Shift Volume</CardTitle>
            <CardDescription>Number of paid shifts completed each month</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} width={32} />
                <RechartsTooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                  formatter={(v: number) => [v, "Shifts"]}
                />
                <Bar dataKey="volume" name="Shifts" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
