import { useGetLocumAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Download, BriefcaseMedical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LocumEarnings() {
  const { data: analytics, isLoading } = useGetLocumAnalytics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Earnings</h1>
          <p className="text-muted-foreground mt-1">Track your income and generate tax-ready reports.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> KRA Report
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(analytics?.totalEarnings || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shifts Completed</CardTitle>
              <BriefcaseMedical className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.totalShiftsCompleted || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg per Shift</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.totalShiftsCompleted ? formatCurrency((analytics?.totalEarnings || 0) / analytics.totalShiftsCompleted) : formatCurrency(0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Your earnings over the last year</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : analytics?.earningsByMonth && analytics.earningsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.earningsByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `KES ${val/1000}k`} />
                <RechartsTooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [formatCurrency(value), 'Earnings']}
                />
                <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Not enough data to display chart
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}