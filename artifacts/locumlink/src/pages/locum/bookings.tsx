import { useListBookings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, FileSignature, CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

export default function LocumBookings() {
  const { data: bookingsData, isLoading } = useListBookings();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_contract':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><FileSignature className="w-3 h-3 mr-1" /> Pending Contract</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Calendar className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Clock className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your confirmed and completed shifts.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bookingsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No bookings found</h3>
          <p className="text-muted-foreground mt-2 mb-6">You don't have any confirmed bookings yet.</p>
          <Link href="/locum/shifts">
            <Button>Find Shifts</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookingsData?.data?.map((booking) => (
            <Card key={booking.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="bg-background">
                    {booking.shift?.specialty?.name}
                  </Badge>
                  {getStatusBadge(booking.status)}
                </div>
                <CardTitle className="mt-2 text-xl">{booking.shift?.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{booking.shift?.clinic?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{booking.shift?.startTime} - {booking.shift?.endTime}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 flex items-center justify-between">
                <div className="font-bold text-primary">
                  {booking.shift?.rate ? formatCurrency(booking.shift.rate) : ''}
                </div>
                <Link href={`/locum/bookings/${booking.id}`}>
                  <Button variant="ghost" size="sm" className="group">
                    Details <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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