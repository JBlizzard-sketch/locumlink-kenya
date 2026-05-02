import { useState } from "react";
import {
  useListMyClinicApplications,
  useShortlistApplication,
  useConfirmApplication,
  useRejectApplication,
  getListMyClinicApplicationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  AlertCircle,
  Search,
  Star,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  UserCheck,
  Inbox,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";

type AppStatus = "applied" | "shortlisted" | "confirmed" | "rejected" | "withdrawn";

const STATUS_TABS: { value: "all" | AppStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLES: Record<AppStatus, string> = {
  applied: "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-purple-50 text-purple-700 border-purple-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  withdrawn: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<AppStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  confirmed: "Confirmed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ClinicApplications() {
  const [tab, setTab] = useState<"all" | AppStatus>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListMyClinicApplications(
    tab === "all" ? {} : { status: tab },
    { query: { queryKey: getListMyClinicApplicationsQueryKey(tab === "all" ? {} : { status: tab }) } },
  );

  const { data: allData } = useListMyClinicApplications(
    {},
    { query: { queryKey: getListMyClinicApplicationsQueryKey({}) } },
  );

  const shortlist = useShortlistApplication();
  const confirm = useConfirmApplication();
  const reject = useRejectApplication();

  const invalidate = () => {
    STATUS_TABS.forEach(({ value }) => {
      queryClient.invalidateQueries({
        queryKey: getListMyClinicApplicationsQueryKey(value === "all" ? {} : { status: value }),
      });
    });
  };

  const handleAction = async (appId: number, action: "shortlist" | "confirm" | "reject") => {
    try {
      if (action === "shortlist") await shortlist.mutateAsync({ id: appId });
      else if (action === "confirm") await confirm.mutateAsync({ id: appId });
      else await reject.mutateAsync({ id: appId });
      toast({ title: `Application ${action}ed` });
      invalidate();
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.error || "Please try again", variant: "destructive" });
    }
  };

  const isMutating = shortlist.isPending || confirm.isPending || reject.isPending;

  const allApps = (allData as any)?.data ?? [];
  const countByStatus = (status: AppStatus) =>
    allApps.filter((a: any) => a.status === status).length;

  const apps: any[] = (data as any)?.data ?? [];
  const filtered = search.trim()
    ? apps.filter((a: any) => {
        const name = `${a.locum?.firstName ?? ""} ${a.locum?.lastName ?? ""}`.toLowerCase();
        const shift = (a.shift?.title ?? "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || shift.includes(q);
      })
    : apps;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Application Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Review and action all incoming locum applications in one place.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Inbox className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground font-medium">New</span>
          </div>
          <p className="text-2xl font-bold">{countByStatus("applied")}</p>
          <p className="text-xs text-muted-foreground">awaiting review</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-muted-foreground font-medium">Shortlisted</span>
          </div>
          <p className="text-2xl font-bold">{countByStatus("shortlisted")}</p>
          <p className="text-xs text-muted-foreground">pending confirmation</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground font-medium">Confirmed</span>
          </div>
          <p className="text-2xl font-bold">{countByStatus("confirmed")}</p>
          <p className="text-xs text-muted-foreground">booked shifts</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Rejected</span>
          </div>
          <p className="text-2xl font-bold">{countByStatus("rejected")}</p>
          <p className="text-xs text-muted-foreground">not selected</p>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
            {STATUS_TABS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="text-xs px-3 py-1.5">
                {label}
                {value !== "all" && countByStatus(value) > 0 && (
                  <span className="ml-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                    {countByStatus(value)}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name or shift…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Application cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">
            {search ? "No matching applications" : "No applications here"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {search
              ? "Try adjusting your search."
              : tab === "all"
                ? "Post a shift to start receiving applications."
                : `No applications with status "${tab}" yet.`}
          </p>
          {tab === "all" && !search && (
            <Button className="mt-4" asChild>
              <Link href="/clinic/shifts/new">Post a Shift</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app: any) => (
            <Card
              key={app.id}
              className={`transition-colors ${
                app.status === "confirmed"
                  ? "border-green-200 bg-green-50/20"
                  : app.status === "rejected"
                    ? "opacity-70"
                    : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Locum info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar className="h-11 w-11 border-2 border-background shadow-sm shrink-0">
                      <AvatarImage src={app.locum?.profilePhotoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {app.locum?.firstName?.charAt(0)}
                        {app.locum?.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-semibold">
                          {app.locum?.firstName} {app.locum?.lastName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_STYLES[app.status as AppStatus] ?? ""}`}
                        >
                          {STATUS_LABELS[app.status as AppStatus] ?? app.status}
                        </Badge>
                        {app.matchScore != null && (
                          <Badge variant="outline" className="text-xs">
                            Match {app.matchScore}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {app.locum?.reliabilityScore ?? "New"}
                        </span>
                        {app.locum?.yearsExperience != null && (
                          <span>{app.locum.yearsExperience} yrs exp</span>
                        )}
                        {app.shift?.specialty?.name && (
                          <span className="text-primary font-medium">{app.shift.specialty.name}</span>
                        )}
                      </div>
                      {app.coverMessage && (
                        <p className="text-sm mt-1.5 italic text-foreground/70 border-l-2 border-primary/20 pl-2 truncate">
                          "{app.coverMessage}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shift info */}
                  <div className="sm:border-l sm:pl-4 shrink-0 text-xs text-muted-foreground space-y-1 min-w-[160px]">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {app.shift?.title ?? "—"}
                    </p>
                    {app.shift?.shiftDate && (
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(app.shift.shiftDate), "MMM d, yyyy")}
                      </p>
                    )}
                    {app.shift?.startTime && (
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {app.shift.startTime} – {app.shift.endTime}
                      </p>
                    )}
                    {app.shift?.rate && (
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(app.shift.rate)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:border-l sm:pl-4">
                    {app.status === "applied" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleAction(app.id, "shortlist")}
                          disabled={isMutating}
                        >
                          {shortlist.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Shortlist"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleAction(app.id, "confirm")}
                          disabled={isMutating}
                        >
                          {confirm.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Confirm"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(app.id, "reject")}
                          disabled={isMutating}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {app.status === "shortlisted" && (
                      <>
                        <Button
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleAction(app.id, "confirm")}
                          disabled={isMutating}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(app.id, "reject")}
                          disabled={isMutating}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {app.status === "confirmed" && (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Confirmed
                      </span>
                    )}
                    {app.status === "rejected" && (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle className="h-4 w-4" /> Rejected
                      </span>
                    )}
                    {app.shift?.id && (
                      <Button variant="ghost" size="sm" className="text-xs h-8 px-2" asChild>
                        <Link href={`/clinic/shifts/${app.shift.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
