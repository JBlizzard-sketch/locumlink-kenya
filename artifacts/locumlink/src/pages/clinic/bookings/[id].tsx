import { useGetBooking, getGetBookingQueryKey, useCompleteBooking, useSignContract } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, FileSignature, CheckCircle2, ChevronLeft, AlertTriangle, User, Phone, Mail } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ClinicBookingDetail() {
  const [, params] = useRoute("/clinic/bookings/:id");
  const bookingId = Number(params?.id);
  
  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const completeMutation = useCompleteBooking();
  const signMutation = useSignContract();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = async (action: 'sign' | 'complete') => {
    try {
      if (action === 'sign') {
        await signMutation.mutateAsync({ bookingId });
        toast({ title: "Contract signed successfully" });
      } else if (action === 'complete') {
        await completeMutation.mutateAsync({ bookingId });
        toast({ title: "Shift marked as completed" });
      }
      queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
    } catch (error: any) {
      toast({ title: "Action failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!booking) return <div>Booking not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/clinic/bookings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to bookings
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          <Card>
            <CardHeader className="pb-4 border-b bg-muted/10">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="bg-background">
                  Shift #{booking.shift?.id}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{booking.shift?.title}</CardTitle>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-foreground">{booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium text-foreground">{booking.shift?.startTime} - {booking.shift?.endTime}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Locum Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={booking.locum?.profilePhotoUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {booking.locum?.firstName?.charAt(0)}{booking.locum?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-xl">Dr. {booking.locum?.firstName} {booking.locum?.lastName}</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">{booking.shift?.specialty?.name}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileSignature className="h-4 w-4" /> Reg: {booking.locum?.registrationNumber}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Sidebar */}
        <div className="w-full md:w-[320px] space-y-6 shrink-0">
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Manage Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.status === 'pending_contract' && (
                <div className="space-y-4">
                  <div className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                    <p className="font-medium mb-1">Contract Signature Required</p>
                    <p className="text-xs">Both parties must sign the digital contract to confirm.</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('sign')}
                    disabled={signMutation.isPending}
                  >
                    {signMutation.isPending ? "Signing..." : "Sign Contract as Clinic"}
                  </Button>
                </div>
              )}

              {booking.status === 'in_progress' && (
                <div className="space-y-4">
                  <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
                    <p className="font-medium mb-1">Shift in Progress</p>
                    <p className="text-xs">Locum has checked in. Mark complete when finished to release payment.</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleAction('complete')}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? "Completing..." : "Verify Shift Completed"}
                  </Button>
                </div>
              )}

              {booking.status === 'completed' && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Shift Verified & Paid
                </div>
              )}

              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <div className="pt-4 border-t mt-4">
                  <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 mr-2" /> Report Issue
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