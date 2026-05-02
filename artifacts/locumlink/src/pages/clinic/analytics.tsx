import { useGetClinicAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { DollarSign, Download, TrendingUp, Clock, AlertCircle, ActivitySquare, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function ClinicAnalytics() {
  const { data: analytics, isLoading } = useGetClinicAnalytics({ period: "year" });

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-KE", { month: "short", year: "2-digit" });
  };

  const spendByMonth = (analytics?.spendByMonth ?? []).map(m => ({ ...m, monthLabel: formatMonth(m.month) }));
  const fillRateBySpecialty = analytics?.fillRateBySpecialty ?? [];
  const topLocums = analytics?.topLocums ?? [];
  const hardestToFill = analytics?.hardestToFill ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">HR Analytics</h1>
          <p className="text-muted-foreground mt-1">Insights into your staffing spend and fill rates.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend (YTD)</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(analytics?.totalSpend ?? 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Gross locum costs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Fill Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.fillRate ?? 0}%</div>
              <Progress value={analytics?.fillRate ?? 0} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Time to Fill</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.averageTimeToFill ?? 0} hrs</div>
              <p className="text-xs text-muted-foreground mt-1">From posting to confirmation</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shifts Posted</CardTitle>
              <ActivitySquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalShiftsPosted ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics?.totalShiftsFilled ?? 0} filled
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spend Trend</CardTitle>
            <CardDescription>Monthly expenditure on locum staff</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : spendByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendByMonth}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }}
                    tickFormatter={v => `${v / 1000}k`} width={48} />
                  <RechartsTooltip
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                    formatter={(v: number) => [fmt(v), "Spend"]}
                  />
                  <Line type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No spend data yet. Complete your first shift to see trends.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fill Rate by Specialty</CardTitle>
            <CardDescription>Success rate per specialty posted</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : fillRateBySpecialty.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillRateBySpecialty} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false}
                    tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="specialtyName" type="category" width={110} axisLine={false}
                    tickLine={false} tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                    formatter={(v: number) => [`${v}%`, "Fill Rate"]}
                  />
                  <Bar dataKey="fillRate" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No specialty data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top locums + hardest to fill */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top locums table */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Top Locums</CardTitle>
              <CardDescription className="mt-0.5">Most shifts completed at your clinic</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : topLocums.length > 0 ? (
              <div className="space-y-2">
                {topLocums.map((l, i) => (
                  <div key={l.locumId} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-slate-100 text-slate-600" :
                      "bg-orange-50 text-orange-600"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {l.shiftsCompleted} shift{l.shiftsCompleted !== 1 ? "s" : ""} completed
                      </p>
                    </div>
                    {(l.averageRating ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-yellow-500 shrink-0">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-sm font-semibold">{(l.averageRating ?? 0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No completed shifts yet. Your top locums will appear here.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hardest to fill */}
        {hardestToFill.length > 0 ? (
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Hardest to Fill
              </CardTitle>
              <CardDescription>Consider increasing rates or posting earlier for these specialties.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hardestToFill.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border border-destructive/10">
                    <span className="text-sm font-medium">{item.specialtyName}</span>
                    <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                      Avg {item.avgDaysToFill}d to fill
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-emerald-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Staffing Health
              </CardTitle>
              <CardDescription className="text-emerald-600/80">All specialties are filling well.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fillRateBySpecialty.slice(0, 4).map(s => (
                  <div key={s.specialtyName} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{s.specialtyName}</span>
                      <span className="text-muted-foreground">{s.fillRate}%</span>
                    </div>
                    <Progress value={s.fillRate} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
