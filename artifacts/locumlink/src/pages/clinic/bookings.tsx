import { useState, useMemo } from "react";
import { useListBookings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar, Clock, MapPin, FileSignature, CheckCircle2,
  ChevronRight, AlertTriangle, DollarSign, Users, User,
} from "lucide-react";
import { Link } from "wouter";
import { format, parseISO, compareDesc, compareAsc } from "date-fns";

type BookingStatus = "pending_contract" | "confirmed" | "in_progress" | "completed" | "cancelled";
type FilterTab = "all" | BookingStatus;
type SortOrder = "asc" | "desc";

const TAB_LABELS: { value: FilterTab; label: string }[] = [
  { value: "all",              label: "All"           },
  { value: "pending_contract", label: "Awaiting Sign" },
  { value: "confirmed",        label: "Confirmed"     },
  { value: "in_progress",      label: "In Progress"   },
  { value: "completed",        label: "Completed"     },
  { value: "cancelled",        label: "Cancelled"     },
];

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending_contract: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress:      "bg-purple-50 text-purple-700 border-purple-200",
  completed:        "bg-green-50 text-green-700 border-green-200",
  cancelled:        "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<BookingStatus, React.ReactNode> = {
  pending_contract: <FileSignature className="w-3 h-3" />,
  confirmed:        <Calendar className="w-3 h-3" />,
  in_progress:      <Clock className="w-3 h-3" />,
  completed:        <CheckCircle2 className="w-3 h-3" />,
  cancelled:        <AlertTriangle className="w-3 h-3" />,
};

const STATUS_LABELS_MAP: Record<BookingStatus, string> = {
  pending_contract: "Awaiting Signature",
  confirmed:        "Confirmed",
  in_progress:      "In Progress",
  completed:        "Completed",
  cancelled:        "Cancelled",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function StatusBadge({ status }: { status: string }) {
  const s = status as BookingStatus;
  return (
    <Badge variant="outline" className={`gap-1 ${STATUS_STYLES[s] ?? ""}`}>
      {STATUS_ICONS[s]}
      {STATUS_LABELS_MAP[s] ?? status}
    </Badge>
  );
}

export default function ClinicBookings() {
  const { data: bookingsData, isLoading } = useListBookings();
  const [tab, setTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortOrder>("desc");

  const allBookings = bookingsData?.data ?? [];

  const pendingSignCount = allBookings.filter((b) => b.status === "pending_contract").length;

  const totalSpend = allBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.shift?.rate ?? 0), 0);

  const confirmedCount  = allBookings.filter((b) => b.status === "confirmed").length;
  const completedCount  = allBookings.filter((b) => b.status === "completed").length;

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<FilterTab, number>> = { all: allBookings.length };
    for (const b of allBookings) {
      const s = b.status as BookingStatus;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [allBookings]);

  const displayed = useMemo(() => {
    const filtered = tab === "all" ? allBookings : allBookings.filter((b) => b.status === tab);
    return [...filtered].sort((a, b) => {
      const da = parseISO(a.shift?.shiftDate ?? "1970-01-01");
      const db_ = parseISO(b.shift?.shiftDate ?? "1970-01-01");
      return sort === "desc" ? compareDesc(da, db_) : compareAsc(da, db_);
    });
  }, [allBookings, tab, sort]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Active Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage scheduled locums and track shift progress.
            {bookingsData && (
              <span className="ml-2 text-sm font-medium text-foreground">{allBookings.length} total</span>
            )}
          </p>
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      {!isLoading && allBookings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="font-bold text-sm">{fmt(totalSpend)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="font-bold text-sm">{completedCount} shifts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="font-bold text-sm">{confirmedCount} confirmed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action alert for unsigned contracts */}
      {!isLoading && pendingSignCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {pendingSignCount} booking{pendingSignCount !== 1 ? "s" : ""} awaiting contract signature
            </p>
            <p className="text-xs mt-0.5 text-amber-700">
              Locums are waiting — sign to confirm and lock in their placement.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
            onClick={() => setTab("pending_contract")}
          >
            View
          </Button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="overflow-x-auto pb-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList className="flex-nowrap w-max">
            {TAB_LABELS.map(({ value, label }) => {
              const count = tabCounts[value] ?? 0;
              return (
                <TabsTrigger key={value} value={value} className="gap-1.5 whitespace-nowrap">
                  {label}
                  {count > 0 && (
                    <span className="text-[10px] font-semibold bg-muted rounded-full px-1.5 py-0.5 leading-none">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium">
            {tab === "all" ? "No bookings yet" : `No ${STATUS_LABELS_MAP[tab as BookingStatus]?.toLowerCase()} bookings`}
          </h3>
          <p className="text-muted-foreground mt-2">
            {tab === "all"
              ? "Bookings appear here once you confirm an applicant."
              : "Try a different filter."}
          </p>
          {tab !== "all" && (
            <Button variant="outline" className="mt-4" onClick={() => setTab("all")}>
              Clear filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((booking) => (
            <Card key={booking.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="bg-background text-xs">
                    {booking.shift?.specialty?.name ?? "—"}
                  </Badge>
                  <StatusBadge status={booking.status} />
                </div>
                <CardTitle className="mt-2 text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {booking.shift?.title}
                </CardTitle>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), "EEE d MMM yyyy") : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {booking.shift?.startTime} – {booking.shift?.endTime}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                {booking.locum ? (
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-secondary">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {booking.locum.firstName?.charAt(0)}{booking.locum.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Locum</p>
                      <p className="font-semibold text-sm">
                        Dr. {booking.locum.firstName} {booking.locum.lastName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No locum assigned</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 pb-4 px-6 flex items-center justify-between border-t">
                <div className="font-bold text-primary text-sm">
                  {booking.shift?.rate ? fmt(booking.shift.rate) : "—"}
                </div>
                <Link href={`/clinic/bookings/${booking.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary group-hover:underline">
                    Manage <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
