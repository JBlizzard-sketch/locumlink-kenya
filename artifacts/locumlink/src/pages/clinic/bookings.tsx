import { useListBookings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, CheckCircle2, ChevronRight, User } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

export default function ClinicBookings() {
  // Assuming listBookings returns bookings for the current clinic when called by clinic role
  const { data: bookingsData, isLoading } = useListBookings();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_contract':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Awaiting Contract</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Active Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage scheduled locums and track shift progress.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookingsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No active bookings</h3>
          <p className="text-muted-foreground mt-2">You don't have any confirmed locums scheduled.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookingsData?.data?.map((booking) => (
            <Card key={booking.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-background">
                    {booking.shift?.specialty?.name}
                  </Badge>
                  {getStatusBadge(booking.status)}
                </div>
                <CardTitle className="mt-2 text-xl truncate">{booking.shift?.title}</CardTitle>
                <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">{booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="truncate">{booking.shift?.startTime} - {booking.shift?.endTime}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-secondary">
                  <div className="bg-primary/10 p-2 rounded-full text-primary shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Locum</p>
                    <p className="font-semibold text-foreground">Dr. {booking.locum?.firstName} {booking.locum?.lastName}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 justify-end">
                <Link href={`/clinic/bookings/${booking.id}`}>
                  <Button variant="ghost" size="sm" className="group text-primary">
                    Manage Booking <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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