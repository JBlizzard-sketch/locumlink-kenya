import { useListMyApplications, useWithdrawApplication, getListMyApplicationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { format, parseISO, isPast } from "date-fns";
import { MapPin, Clock, Calendar, CheckCircle2, XCircle, Clock4, AlertCircle, ActivitySquare, Undo2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type FilterTab = "all" | "active" | "confirmed" | "resolved";

const TAB_LABELS: Record<FilterTab, string> = {
  all: "All",
  active: "Pending",
  confirmed: "Confirmed",
  resolved: "Resolved",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "applied":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock4 className="w-3 h-3 mr-1" />Pending Review</Badge>;
    case "shortlisted":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><AlertCircle className="w-3 h-3 mr-1" />Shortlisted</Badge>;
    case "confirmed":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Not Selected</Badge>;
    case "withdrawn":
      return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200"><Undo2 className="w-3 h-3 mr-1" />Withdrawn</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function filterApplications(apps: any[], tab: FilterTab) {
  switch (tab) {
    case "active":
      return apps.filter(a => ["applied", "shortlisted"].includes(a.status));
    case "confirmed":
      return apps.filter(a => a.status === "confirmed");
    case "resolved":
      return apps.filter(a => ["rejected", "withdrawn"].includes(a.status));
    default:
      return apps;
  }
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

export default function LocumApplications() {
  const { data: applicationsData, isLoading } = useListMyApplications();
  const withdraw = useWithdrawApplication();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<FilterTab>("all");

  const allApps = applicationsData?.data ?? [];
  const displayed = filterApplications(allApps, tab);

  const counts: Record<FilterTab, number> = {
    all: allApps.length,
    active: allApps.filter(a => ["applied", "shortlisted"].includes(a.status)).length,
    confirmed: allApps.filter(a => a.status === "confirmed").length,
    resolved: allApps.filter(a => ["rejected", "withdrawn"].includes(a.status)).length,
  };

  const handleWithdraw = async (id: number) => {
    try {
      await withdraw.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListMyApplicationsQueryKey() });
      toast({ title: "Application withdrawn" });
    } catch (error: any) {
      toast({ title: "Could not withdraw", description: error?.error ?? "Please try again", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Applications</h1>
        <p className="text-muted-foreground mt-1">Track the status of your shift applications.</p>
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
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <ActivitySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">
            {tab === "all" ? "No applications yet" : `No ${TAB_LABELS[tab].toLowerCase()} applications`}
          </h3>
          <p className="text-muted-foreground mt-2 mb-6">
            {tab === "all" ? "You haven't applied to any shifts." : "Switch to 'All' to see everything."}
          </p>
          {tab === "all" && (
            <Link href="/locum/shifts">
              <Button>Find Shifts</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(app => {
            const isWithdrawable = ["applied", "shortlisted"].includes(app.status);
            const shiftDate = app.shift?.shiftDate ? parseISO(app.shift.shiftDate) : null;
            const isExpired = shiftDate ? isPast(shiftDate) : false;

            return (
              <Card key={app.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap justify-between items-start md:items-center gap-3">
                      <h3 className="text-lg font-bold">
                        <Link href={`/locum/shifts/${app.shiftId}`} className="hover:text-primary transition-colors">
                          {app.shift?.title}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isExpired && app.status !== "confirmed" && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            Shift Passed
                          </Badge>
                        )}
                        {getStatusBadge(app.status)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-foreground">{app.shift?.clinic?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{shiftDate ? format(shiftDate, "MMM dd, yyyy") : "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{app.shift?.startTime} – {app.shift?.endTime}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Applied {app.createdAt ? format(parseISO(app.createdAt), "MMM d, yyyy 'at' HH:mm") : ""}
                    </p>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 shrink-0">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-muted-foreground mb-1">Shift Rate</p>
                      <p className="text-lg font-bold text-primary">
                        {app.shift?.rate ? formatCurrency(app.shift.rate) : "N/A"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <Link href={`/locum/shifts/${app.shiftId}`}>
                        <Button variant="outline" size="sm">View Shift</Button>
                      </Link>

                      {isWithdrawable && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Undo2 className="h-3 w-3 mr-1" />
                              Withdraw
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
                              <AlertDialogDescription>
                                You are about to withdraw your application for <strong>{app.shift?.title}</strong> at {app.shift?.clinic?.name}. This cannot be undone — you will need to re-apply if you change your mind.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Application</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleWithdraw(app.id)}
                              >
                                Yes, Withdraw
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
