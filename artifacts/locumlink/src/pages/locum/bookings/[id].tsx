import { useGetBooking, getGetBookingQueryKey, useCheckInBooking, useCompleteBooking, useSignContract } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, FileSignature, CheckCircle2, ChevronLeft, AlertTriangle, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function LocumBookingDetail() {
  const [, params] = useRoute("/locum/bookings/:id");
  const bookingId = Number(params?.id);
  
  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const checkInMutation = useCheckInBooking();
  const completeMutation = useCompleteBooking();
  const signMutation = useSignContract();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = async (action: 'sign' | 'checkin' | 'complete') => {
    try {
      if (action === 'sign') {
        await signMutation.mutateAsync({ id: bookingId });
        toast({ title: "Contract signed successfully" });
      } else if (action === 'checkin') {
        await checkInMutation.mutateAsync({ id: bookingId });
        toast({ title: "Checked in successfully" });
      } else if (action === 'complete') {
        await completeMutation.mutateAsync({ id: bookingId });
        toast({ title: "Shift marked as completed" });
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
    } catch (error: any) {
      toast({ title: "Action failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!booking) return <div>Booking not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/locum/bookings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to bookings
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {booking.shift?.specialty?.name}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{booking.shift?.title}</CardTitle>
              <CardDescription>{booking.shift?.clinic?.name}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">{booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">{booking.shift?.startTime} - {booking.shift?.endTime}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{booking.shift?.clinic?.address}</p>
                  <p className="text-xs text-muted-foreground">{booking.shift?.clinic?.subCounty}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          {booking.payment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between pb-2 border-b text-sm">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span>{formatCurrency(booking.payment.grossAmount)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span>-{formatCurrency(booking.payment.platformFee)}</span>
                </div>
                <div className="flex justify-between pt-2 font-bold">
                  <span>Net Payout</span>
                  <span className="text-primary">{formatCurrency(booking.payment.locumPayout)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={booking.payment.status === 'released' ? 'default' : 'secondary'}>
                    {booking.payment.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Via {booking.payment.paymentMethod}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Sidebar */}
        <div className="w-full md:w-[320px] space-y-6 shrink-0">
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.status === 'pending_contract' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                    <FileSignature className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Please review and sign the contract to fully confirm this shift.</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('sign')}
                    disabled={signMutation.isPending}
                  >
                    {signMutation.isPending ? "Signing..." : "Sign Contract"}
                  </Button>
                </div>
              )}

              {booking.status === 'confirmed' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-sm bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
                    <Clock className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Check in when you arrive at the facility to start the shift.</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('checkin')}
                    disabled={checkInMutation.isPending}
                  >
                    {checkInMutation.isPending ? "Checking in..." : "Check In"}
                  </Button>
                </div>
              )}

              {booking.status === 'in_progress' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-sm bg-purple-50 text-purple-800 p-3 rounded-md border border-purple-200">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Shift in progress. Complete it when you are done to trigger payment.</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('complete')}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? "Completing..." : "Complete Shift"}
                  </Button>
                </div>
              )}

              {booking.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Shift Completed
                </div>
              )}

              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <div className="pt-4 border-t mt-4">
                  <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 mr-2" /> Raise Dispute
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}