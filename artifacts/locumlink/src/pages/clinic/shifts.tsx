import { useListShifts, useCancelShift, getListShiftsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, MapPin, PlusCircle, Users, Ban, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, parseISO, isPast, startOfDay } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type FilterTab = "all" | "open" | "filled" | "completed" | "cancelled" | "expired";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  open: "Open",
  filled: "Filled",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

function isExpiredShift(shift: any) {
  if (!shift.shiftDate) return false;
  return isPast(startOfDay(parseISO(shift.shiftDate))) && shift.status === "open";
}

function filterShifts(shifts: any[], tab: FilterTab) {
  switch (tab) {
    case "open":
      return shifts.filter(s => s.status === "open" && !isExpiredShift(s));
    case "expired":
      return shifts.filter(s => isExpiredShift(s));
    case "filled":
      return shifts.filter(s => s.status === "filled");
    case "completed":
      return shifts.filter(s => s.status === "completed");
    case "cancelled":
      return shifts.filter(s => s.status === "cancelled");
    default:
      return shifts;
  }
}

function getStatusBadge(shift: any) {
  if (isExpiredShift(shift)) {
    return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Expired</Badge>;
  }
  switch (shift.status) {
    case "open":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
    case "filled":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Filled</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{shift.status}</Badge>;
  }
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export default function ClinicShifts() {
  const { data: shiftsData, isLoading } = useListShifts();
  const cancelShift = useCancelShift();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<FilterTab>("all");

  const allShifts = shiftsData?.data ?? [];
  const displayed = filterShifts(allShifts, tab);

  const counts: Record<FilterTab, number> = {
    all: allShifts.length,
    open: allShifts.filter(s => s.status === "open" && !isExpiredShift(s)).length,
    filled: allShifts.filter(s => s.status === "filled").length,
    completed: allShifts.filter(s => s.status === "completed").length,
    cancelled: allShifts.filter(s => s.status === "cancelled").length,
    expired: allShifts.filter(s => isExpiredShift(s)).length,
  };

  const handleCancel = async (id: number, title: string) => {
    try {
      await cancelShift.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListShiftsQueryKey() });
      toast({ title: "Shift cancelled", description: `"${title}" has been cancelled. Active applicants have been notified.` });
    } catch (error: any) {
      toast({ title: "Could not cancel shift", description: error?.error ?? "Please try again", variant: "destructive" });
    }
  };

  const handleRepost = (shift: any) => {
    const params = new URLSearchParams({
      title: shift.title ?? "",
      specialtyId: String(shift.specialtyId ?? ""),
      startTime: shift.startTime ?? "",
      endTime: shift.endTime ?? "",
      rate: String(shift.rate ?? ""),
      urgency: shift.urgency ?? "normal",
      positionsAvailable: String(shift.positionsAvailable ?? 1),
      description: shift.description ?? "",
      specificRequirements: shift.specificRequirements ?? "",
      minYearsExperience: String(shift.minYearsExperience ?? ""),
    });
    setLocation(`/clinic/shifts/new?${params.toString()}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Manage Shifts</h1>
          <p className="text-muted-foreground mt-1">Track and manage your posted shifts and applicants.</p>
        </div>
        <Link href="/clinic/shifts/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> Post a Shift
          </Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(TAB_LABELS) as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {TAB_LABELS[t]}
            {counts[t] > 0 && (
              <span className={`ml-1.5 text-xs ${tab === t ? "opacity-80" : "opacity-60"}`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">
            {tab === "all" ? "No shifts posted yet" : `No ${TAB_LABELS[tab].toLowerCase()} shifts`}
          </h3>
          <p className="text-muted-foreground mt-2 mb-6">
            {tab === "all"
              ? "Create your first shift to start receiving applications from verified locums."
              : "Switch to 'All' to see all your shifts."}
          </p>
          {tab === "all" && (
            <Link href="/clinic/shifts/new">
              <Button>Post a Shift</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map(shift => {
            const canCancel = shift.status === "open" && !isExpiredShift(shift);
            const canRepost = ["cancelled", "filled", "completed"].includes(shift.status) || isExpiredShift(shift);

            return (
              <Card key={shift.id} className="flex flex-col hover:border-primary/50 transition-colors overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-background">
                      {shift.specialty?.name}
                    </Badge>
                    {getStatusBadge(shift)}
                  </div>
                  <CardTitle className="text-xl line-clamp-1">{shift.title}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="truncate">{format(parseISO(shift.shiftDate), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="truncate">{shift.startTime} – {shift.endTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-lg font-bold text-foreground">
                      {formatCurrency(shift.rate)}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-primary">
                      <Users className="h-4 w-4" />
                      {shift.status === "open" ? "Applicants" : `${shift.positionsFilled || 0}/${shift.positionsAvailable || 1} Filled`}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-4 px-4 flex flex-col gap-2">
                  <Link href={`/clinic/shifts/${shift.id}`} className="w-full">
                    <Button variant="outline" className="w-full">Manage Shift</Button>
                  </Link>

                  {canRepost && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleRepost(shift)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Repost Shift
                    </Button>
                  )}

                  {canCancel && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Ban className="h-3.5 w-3.5 mr-1.5" />
                          Cancel Shift
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel This Shift?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cancelling <strong>{shift.title}</strong> will notify all applicants who have applied or been shortlisted. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Shift</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleCancel(shift.id, shift.title)}
                          >
                            Yes, Cancel Shift
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
