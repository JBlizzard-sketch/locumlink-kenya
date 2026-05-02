import { useState, useMemo } from "react";
import {
  useGetMyLocumAvailability,
  useSetMyLocumAvailability,
  useListBookings,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  format,
  addDays,
  isSameDay,
  parseISO,
  isAfter,
  isBefore,
  startOfDay,
  endOfMonth,
  startOfMonth,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Banknote,
  CalendarOff,
  CalendarCheck,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Link } from "wouter";

type BookingStatus = "pending_contract" | "confirmed" | "in_progress" | "completed" | "cancelled";

interface EnrichedBooking {
  id: number;
  status: BookingStatus;
  shift?: {
    id: number;
    title: string;
    shiftDate: string;
    startTime: string;
    endTime: string;
    rate: number;
    clinic?: { name: string; subCounty?: string };
    specialty?: { name: string };
  };
}

const ACTIVE_STATUSES: BookingStatus[] = ["confirmed", "in_progress", "pending_contract"];
const COMPLETED_STATUSES: BookingStatus[] = ["completed"];

export default function LocumCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const { toast } = useToast();

  const {
    data: availData,
    isLoading: availLoading,
    refetch: refetchAvail,
  } = useGetMyLocumAvailability();

  const { data: bookingsData, isLoading: bookingsLoading } = useListBookings();
  const setMyAvailability = useSetMyLocumAvailability();

  const isLoading = availLoading || bookingsLoading;

  const availableDates = useMemo(
    () =>
      (availData?.data ?? [])
        .filter((s) => s.isAvailable)
        .map((s) => startOfDay(parseISO(s.date))),
    [availData],
  );

  const bookings = useMemo(
    () => ((bookingsData as any)?.data ?? []) as EnrichedBooking[],
    [bookingsData],
  );

  const confirmedDates = useMemo(
    () =>
      bookings
        .filter((b) => ACTIVE_STATUSES.includes(b.status) && b.shift?.shiftDate)
        .map((b) => startOfDay(parseISO(b.shift!.shiftDate))),
    [bookings],
  );

  const completedDates = useMemo(
    () =>
      bookings
        .filter((b) => COMPLETED_STATUSES.includes(b.status) && b.shift?.shiftDate)
        .map((b) => startOfDay(parseISO(b.shift!.shiftDate))),
    [bookings],
  );

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  const dayBooking = useMemo(
    () =>
      bookings.find(
        (b) => b.shift?.shiftDate && isSameDay(parseISO(b.shift.shiftDate), selectedDate),
      ),
    [bookings, selectedDate],
  );

  const isDayAvailable = useMemo(
    () => availableDates.some((d) => isSameDay(d, selectedDate)),
    [availableDates, selectedDate],
  );

  const isDayBooked = useMemo(
    () => confirmedDates.some((d) => isSameDay(d, selectedDate)),
    [confirmedDates, selectedDate],
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthAvailable = availableDates.filter(
    (d) => !isBefore(d, monthStart) && !isAfter(d, monthEnd),
  ).length;

  const monthBooked = confirmedDates.filter(
    (d) => !isBefore(d, monthStart) && !isAfter(d, monthEnd),
  ).length;

  const upcomingShifts = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            ACTIVE_STATUSES.includes(b.status) &&
            b.shift?.shiftDate &&
            isAfter(parseISO(b.shift.shiftDate), startOfDay(new Date())),
        )
        .sort((a, b) =>
          parseISO(a.shift!.shiftDate).getTime() - parseISO(b.shift!.shiftDate).getTime(),
        )
        .slice(0, 5),
    [bookings],
  );

  const postAvailability = async (newSlots: string[]) => {
    await setMyAvailability.mutateAsync({
      data: { slots: newSlots.map((d) => ({ date: d, isAvailable: true })) },
    });
    await refetchAvail();
  };

  const handleToggleDay = async () => {
    if (isDayBooked) {
      toast({
        title: "Day is booked",
        description: "You have a confirmed shift on this day.",
        variant: "destructive",
      });
      return;
    }
    const existingDates = availableDates.map((d) => format(d, "yyyy-MM-dd"));
    let newDates: string[];
    if (isDayAvailable) {
      newDates = existingDates.filter((d) => d !== selectedDateStr);
    } else {
      newDates = [...existingDates, selectedDateStr];
    }
    try {
      await postAvailability(newDates);
      toast({
        title: isDayAvailable ? "Removed availability" : "Marked as available",
        description: format(selectedDate, "EEEE, MMM d, yyyy"),
      });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleSetWeekends = async () => {
    const weekendDates: string[] = [];
    for (let i = 0; i < 28; i++) {
      const d = addDays(new Date(), i);
      if (d.getDay() === 0 || d.getDay() === 6) {
        weekendDates.push(format(d, "yyyy-MM-dd"));
      }
    }
    const existing = availableDates.map((d) => format(d, "yyyy-MM-dd"));
    const merged = [...new Set([...existing, ...weekendDates])];
    try {
      await postAvailability(merged);
      toast({
        title: "Weekend availability set",
        description: `${weekendDates.length} days across the next 4 weeks marked available.`,
      });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleSetWeekdays = async () => {
    const weekdayDates: string[] = [];
    for (let i = 0; i < 28; i++) {
      const d = addDays(new Date(), i);
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        weekdayDates.push(format(d, "yyyy-MM-dd"));
      }
    }
    const existing = availableDates.map((d) => format(d, "yyyy-MM-dd"));
    const merged = [...new Set([...existing, ...weekdayDates])];
    try {
      await postAvailability(merged);
      toast({
        title: "Weekday availability set",
        description: `${weekdayDates.length} weekdays across the next 4 weeks marked available.`,
      });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    try {
      await setMyAvailability.mutateAsync({ data: { slots: [] } });
      await refetchAvail();
      toast({ title: "Schedule cleared", description: "All availability removed." });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const isMutating = setMyAvailability.isPending;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(n);

  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200",
    pending_contract: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed: "bg-green-50 text-green-700 border-green-200",
  };

  const statusLabel: Record<string, string> = {
    confirmed: "Confirmed",
    in_progress: "In Progress",
    pending_contract: "Pending Contract",
    completed: "Completed",
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground mt-1">
          Manage your availability and view upcoming shifts.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Available</span>
          </div>
          <p className="text-2xl font-bold">{monthAvailable}</p>
          <p className="text-xs text-muted-foreground">days this month</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground font-medium">Booked</span>
          </div>
          <p className="text-2xl font-bold">{monthBooked}</p>
          <p className="text-xs text-muted-foreground">shifts this month</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground font-medium">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{upcomingShifts.length}</p>
          <p className="text-xs text-muted-foreground">confirmed shifts</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold">{bookings.filter((b) => b.status === "completed").length}</p>
          <p className="text-xs text-muted-foreground">total shifts</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Calendar — left */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Availability Calendar</CardTitle>
            <CardDescription className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                Booked shift
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                Completed
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
            {isLoading ? (
              <div className="h-[320px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                onMonthChange={setCurrentMonth}
                month={currentMonth}
                modifiers={{
                  available: availableDates,
                  booked: confirmedDates,
                  done: completedDates,
                }}
                modifiersStyles={{
                  available: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "white",
                    fontWeight: "700",
                    borderRadius: "6px",
                  },
                  booked: {
                    backgroundColor: "rgb(59 130 246)",
                    color: "white",
                    fontWeight: "700",
                    borderRadius: "6px",
                  },
                  done: {
                    backgroundColor: "rgb(52 211 153)",
                    color: "white",
                    fontWeight: "600",
                    borderRadius: "6px",
                  },
                }}
                className="rounded-md p-2 w-full"
              />
            )}
          </CardContent>
        </Card>

        {/* Day detail — right */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(selectedDate, "EEEE, MMM d")}
              </CardTitle>
              <CardDescription>
                {isDayBooked
                  ? "You have a shift booked"
                  : isDayAvailable
                    ? "You are available"
                    : "Not marked available"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayBooking ? (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-blue-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {dayBooking.shift?.title ?? "Shift"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[dayBooking.status] ?? ""}`}
                      >
                        {statusLabel[dayBooking.status] ?? dayBooking.status}
                      </Badge>
                    </div>
                    {dayBooking.shift?.clinic && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {dayBooking.shift.clinic.name}
                        {dayBooking.shift.clinic.subCounty && ` · ${dayBooking.shift.clinic.subCounty}`}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {dayBooking.shift?.startTime} – {dayBooking.shift?.endTime}
                    </div>
                    {dayBooking.shift?.rate && (
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <Banknote className="h-3 w-3" />
                        {formatCurrency(dayBooking.shift.rate)}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/locum/bookings/${dayBooking.id}`}>
                      View Booking Details <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isDayAvailable ? (
                    <div className="rounded-lg border bg-primary/5 p-3 flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Available for shifts</p>
                        <p className="text-xs text-muted-foreground">Clinics can see you're free</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-2">
                      <CalendarOff className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Not available</p>
                        <p className="text-xs text-muted-foreground">Click below to mark free</p>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleToggleDay}
                    disabled={isMutating}
                    variant={isDayAvailable ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                  >
                    {isMutating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : isDayAvailable ? (
                      <CalendarOff className="h-4 w-4 mr-2" />
                    ) : (
                      <CalendarCheck className="h-4 w-4 mr-2" />
                    )}
                    {isDayAvailable ? "Remove availability" : "Mark as available"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Bulk-set availability for the next 4 weeks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleSetWeekends}
                disabled={isMutating}
              >
                <CalendarCheck className="h-3.5 w-3.5 mr-2 text-primary" />
                Set Weekend Availability
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleSetWeekdays}
                disabled={isMutating}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-2 text-primary" />
                Set Weekday Availability
              </Button>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={handleClearAll}
                disabled={isMutating}
              >
                <CalendarOff className="h-3.5 w-3.5 mr-2" />
                Clear All Availability
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming shifts list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upcoming Confirmed Shifts
          </CardTitle>
          <CardDescription>Your next confirmed bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : upcomingShifts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">No upcoming confirmed shifts.</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/shifts">Browse open shifts</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {upcomingShifts.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[48px]">
                      <p className="text-xs text-muted-foreground uppercase font-medium">
                        {format(parseISO(b.shift!.shiftDate), "MMM")}
                      </p>
                      <p className="text-xl font-bold leading-none">
                        {format(parseISO(b.shift!.shiftDate), "d")}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{b.shift?.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {b.shift?.clinic?.name ?? "—"} · {b.shift?.startTime} – {b.shift?.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-700">
                        {b.shift?.rate ? formatCurrency(b.shift.rate) : "—"}
                      </p>
                      <Badge variant="outline" className={`text-xs ${statusColors[b.status] ?? ""}`}>
                        {statusLabel[b.status] ?? b.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/locum/bookings/${b.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
