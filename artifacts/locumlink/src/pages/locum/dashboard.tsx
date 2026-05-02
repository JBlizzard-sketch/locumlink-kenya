import { useGetLocumAnalytics, useListUpcomingShifts, useListMatchedShifts } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar, Clock, DollarSign, Star, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export default function LocumDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useGetLocumAnalytics();
  const { data: upcomingShifts, isLoading: upcomingLoading } = useListUpcomingShifts();
  const { data: matchedShifts, isLoading: matchedLoading } = useListMatchedShifts();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your shifts, earnings, and performance.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
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
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[60px]" />
            ) : (
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
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
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
            {analyticsLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
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
                        <div className="text-xs font-bold uppercase">{format(parseISO(shift.shiftDate), 'MMM')}</div>
                        <div className="text-2xl font-black">{format(parseISO(shift.shiftDate), 'dd')}</div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{shift.title}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {shift.startTime} - {shift.endTime}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium text-foreground">{shift.clinic?.name}</span>
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
                        <h4 className="font-medium text-sm truncate">{shift.clinic?.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{format(parseISO(shift.shiftDate), 'MMM dd')}</span>
                          <span>•</span>
                          <span className="truncate">{shift.specialty?.name}</span>
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
                    <Button variant="ghost" className="w-full text-sm mt-2">See all {matchedShifts.total} matches</Button>
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