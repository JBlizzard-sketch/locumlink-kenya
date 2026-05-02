import { useGetMyClinic, useGetClinicAnalytics, useListShifts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { PlusCircle, Users, ActivitySquare, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function ClinicDashboard() {
  const { data: clinic, isLoading: clinicLoading } = useGetMyClinic();
  const { data: analytics, isLoading: analyticsLoading } = useGetClinicAnalytics();
  const { data: openShifts, isLoading: shiftsLoading } = useListShifts({ status: 'open' }); // Assuming we can filter by clinic ID on backend using my clinic context

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Clinic Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {clinicLoading ? "Loading..." : `Welcome back, ${clinic?.name}`}
          </p>
        </div>
        <Link href="/clinic/shifts/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> Post a Shift
          </Button>
        </Link>
      </div>

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Shifts</CardTitle>
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {shiftsLoading ? (
              <Skeleton className="h-8 w-[60px]" />
            ) : (
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
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
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
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(analytics?.totalSpend || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Lifetime platform spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {clinicLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-lg font-bold capitalize text-primary">{clinic?.verificationStatus}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Account status</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Spend Overview</CardTitle>
            <CardDescription>Monthly locum expenditure</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {analyticsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics?.spendByMonth && analytics.spendByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.spendByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `KES ${val/1000}k`} />
                  <RechartsTooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [formatCurrency(value), 'Spend']}
                  />
                  <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Not enough data to display chart
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/clinic/shifts/new">
              <Button className="w-full justify-start h-12" variant="outline">
                <PlusCircle className="h-5 w-5 mr-3 text-primary" />
                Create a new shift
              </Button>
            </Link>
            <Link href="/clinic/shifts">
              <Button className="w-full justify-start h-12" variant="outline">
                <ActivitySquare className="h-5 w-5 mr-3 text-primary" />
                Manage open shifts
              </Button>
            </Link>
            <Link href="/clinic/locums">
              <Button className="w-full justify-start h-12" variant="outline">
                <Users className="h-5 w-5 mr-3 text-primary" />
                Browse locum directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Temporary import replacement
import { DollarSign } from "lucide-react";