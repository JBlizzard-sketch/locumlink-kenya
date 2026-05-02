import { useGetLocumAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { DollarSign, Download, BriefcaseMedical, TrendingUp, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function toCsv(rows: string[][]): string {
  return rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LocumEarnings() {
  const { data: analytics, isLoading } = useGetLocumAnalytics();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

  const totalEarnings = analytics?.totalEarnings ?? 0;
  const totalShifts   = analytics?.totalShiftsCompleted ?? 0;
  const avgPerShift   = totalShifts > 0 ? Math.round(totalEarnings / totalShifts) : 0;
  const earningsByMonth = analytics?.earningsByMonth ?? [];

  const bestMonth = earningsByMonth.reduce<{ month: string; earnings: number } | null>(
    (best, m) => (!best || m.earnings > best.earnings ? m : best),
    null,
  );

  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en-KE", { month: "short", year: "2-digit" });
  };

  const chartData = earningsByMonth.map(m => ({ ...m, monthLabel: formatMonth(m.month) }));
  const recentActivity = analytics?.recentActivity ?? [];

  const handleKraExport = () => {
    if (!analytics) return;
    const today = new Date().toISOString().slice(0, 10);
    const currentYear = new Date().getFullYear();
    const sections: string[] = [];

    sections.push(`"LOCUMLINK — KRA TAX INCOME SUMMARY"`);
    sections.push(`"Tax Year: ${currentYear}"`);
    sections.push(`"Generated: ${today}"`);
    sections.push(`"Note: This document is for self-assessment purposes. Consult a tax advisor for official filings."\n`);

    sections.push("ANNUAL INCOME SUMMARY");
    sections.push(toCsv([
      ["Description", "Amount (KES)"],
      ["Gross Locum Income", String(totalEarnings)],
      ["Number of Shifts Completed", String(totalShifts)],
      ["Average Earnings per Shift", String(avgPerShift)],
    ]));

    if (chartData.length > 0) {
      sections.push("\nMONTHLY BREAKDOWN");
      sections.push(toCsv([
        ["Month", "Shifts Completed", "Net Earnings (KES)"],
        ...chartData.map(r => [r.monthLabel, String(r.shifts), String(r.earnings)]),
        ["TOTAL", String(chartData.reduce((s, r) => s + r.shifts, 0)), String(chartData.reduce((s, r) => s + r.earnings, 0))],
      ]));
    }

    if (recentActivity.length > 0) {
      sections.push("\nRECENT SHIFT ACTIVITY");
      sections.push(toCsv([
        ["Date", "Description", "Status"],
        ...recentActivity.map(a => [a.date, a.description, "Completed"]),
      ]));
    }

    downloadCsv(`locumlink-kra-report-${currentYear}-${today}.csv`, sections.join("\n"));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Earnings</h1>
          <p className="text-muted-foreground mt-1">Track your income and generate tax-ready reports.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleKraExport} disabled={isLoading || !analytics}>
          <Download className="h-4 w-4" /> KRA Report
        </Button>
      </div>

      {/* Top KPI cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime net payout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shifts Completed</CardTitle>
              <BriefcaseMedical className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalShifts}</div>
              <p className="text-xs text-muted-foreground mt-1">Verified completions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg per Shift</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(avgPerShift)}</div>
              <p className="text-xs text-muted-foreground mt-1">Net after platform fee</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Best Month</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bestMonth ? fmt(bestMonth.earnings) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {bestMonth ? formatMonth(bestMonth.month) : "No data yet"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Area chart — earnings trend */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Trend</CardTitle>
          <CardDescription>Monthly net payout over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
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
                  formatter={(v: number) => [fmt(v), "Net earnings"]}
                />
                <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))"
                  strokeWidth={2.5} fill="url(#earningsGrad)"
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Complete your first shift to see earnings data.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Shifts per month bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Shifts per Month</CardTitle>
            <CardDescription>How many paid shifts you completed each month</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} width={32} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 13 }}
                    formatter={(v: number) => [v, "Shifts"]}
                  />
                  <Bar dataKey="shifts" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No shift data yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Net earnings and shifts per month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : chartData.length > 0 ? (
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium px-3 pb-2 border-b">
                  <span>Month</span>
                  <span className="text-center">Shifts</span>
                  <span className="text-right">Net Earnings</span>
                </div>
                {[...chartData].reverse().map(row => (
                  <div key={row.month} className="grid grid-cols-3 items-center px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-sm">
                    <span className="font-medium">{row.monthLabel}</span>
                    <span className="text-center">
                      <Badge variant="secondary" className="text-xs">{row.shifts}</Badge>
                    </span>
                    <span className="text-right font-semibold tabular-nums">{fmt(row.earnings)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 items-center px-3 py-2 border-t mt-2 text-sm font-bold">
                  <span>Total</span>
                  <span className="text-center">{chartData.reduce((s, r) => s + r.shifts, 0)}</span>
                  <span className="text-right tabular-nums">{fmt(chartData.reduce((s, r) => s + r.earnings, 0))}</span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground text-sm">
                No earnings recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your last {recentActivity.length} completed shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="bg-primary/10 p-2 rounded-md shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.date}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs text-emerald-700 border-emerald-300 bg-emerald-50">
                    Completed
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
