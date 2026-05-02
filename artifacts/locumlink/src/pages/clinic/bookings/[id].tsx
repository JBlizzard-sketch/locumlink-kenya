import { useState } from "react";
import { useGetBooking, getGetBookingQueryKey, useCompleteBooking, useSignContract, useSubmitRating, useRaiseDispute } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, FileSignature, CheckCircle2, ChevronLeft, AlertTriangle, Star, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingChat } from "@/components/booking-chat";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}>
          <Star className={`h-7 w-7 transition-colors ${n <= (hovered || value) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

export default function ClinicBookingDetail() {
  const [, params] = useRoute("/clinic/bookings/:id");
  const bookingId = Number(params?.id);

  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const completeMutation = useCompleteBooking();
  const signMutation = useSignContract();
  const submitRating = useSubmitRating();
  const raiseDispute = useRaiseDispute();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [disputeType, setDisputeType] = useState("no_show");
  const [disputeDesc, setDisputeDesc] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });

  const handleAction = async (action: 'sign' | 'complete') => {
    try {
      if (action === 'sign') {
        await signMutation.mutateAsync({ id: bookingId });
        toast({ title: "Contract signed successfully" });
      } else if (action === 'complete') {
        await completeMutation.mutateAsync({ id: bookingId });
        toast({ title: "Shift verified as completed — payment will be released." });
      }
      await refetch();
      invalidate();
    } catch (error: any) {
      toast({ title: "Action failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const handleRating = async () => {
    try {
      await submitRating.mutateAsync({
        bookingId,
        data: { raterType: "clinic", overallScore: ratingScore, comment: ratingComment }
      });
      toast({ title: "Rating submitted — thank you!" });
      setRatingComment("");
      invalidate();
    } catch (error: any) {
      toast({ title: "Failed to submit rating", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const handleDispute = async () => {
    try {
      await raiseDispute.mutateAsync({
        data: { bookingId, disputeType: disputeType as any, description: disputeDesc }
      });
      toast({ title: "Issue reported", description: "The LocumLink team will review within 24 hours." });
      setDisputeDesc("");
      invalidate();
    } catch (error: any) {
      toast({ title: "Failed to report issue", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!booking) return <div className="p-8 text-center text-muted-foreground">Booking not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/clinic/bookings" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to bookings
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          {/* Shift Info */}
          <Card>
            <CardHeader className="pb-4 border-b bg-muted/10">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="bg-background">Shift #{booking.shift?.id}</Badge>
                <Badge variant="outline" className="capitalize">{booking.status.replace(/_/g, ' ')}</Badge>
              </div>
              <CardTitle className="text-2xl">{booking.shift?.title}</CardTitle>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-foreground">
                    {booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium text-foreground">{booking.shift?.startTime} – {booking.shift?.endTime}</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Locum Card */}
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" />Assigned Locum</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={booking.locum?.profilePhotoUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {booking.locum?.firstName?.charAt(0)}{booking.locum?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <h3 className="font-bold text-xl">Dr. {booking.locum?.firstName} {booking.locum?.lastName}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary">{booking.shift?.specialty?.name}</Badge>
                    {booking.locum?.registrationNumber && (
                      <span className="flex items-center gap-1">
                        <FileSignature className="h-3.5 w-3.5" /> {booking.locum.registrationNumber}
                      </span>
                    )}
                    {booking.locum?.yearsExperience != null && (
                      <span>{booking.locum.yearsExperience} yrs experience</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          {booking.payment && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Payment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm pb-2 border-b">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span>{formatCurrency(booking.payment.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-sm pb-2 border-b">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span>−{formatCurrency(booking.payment.platformFee)}</span>
                </div>
                <div className="flex justify-between text-sm pb-2 border-b">
                  <span className="text-muted-foreground">Locum Payout</span>
                  <span>{formatCurrency(booking.payment.locumPayout)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={booking.payment.status === 'released' ? 'default' : 'secondary'} className="capitalize">
                    {booking.payment.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">via {booking.payment.paymentMethod}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <BookingChat bookingId={bookingId} />
        </div>

        {/* Action Sidebar */}
        <div className="w-full md:w-[320px] space-y-4 shrink-0">
          <Card className="border-primary/20 shadow-md">
            <CardHeader><CardTitle className="text-lg">Manage Booking</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {booking.status === 'pending_contract' && (
                <div className="space-y-3">
                  <div className="text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                    <p className="font-medium mb-1">Signature Required</p>
                    <p className="text-xs">Sign the digital contract to confirm this booking.</p>
                  </div>
                  <Button className="w-full" onClick={() => handleAction('sign')} disabled={signMutation.isPending}>
                    {signMutation.isPending ? "Signing..." : "Sign Contract as Clinic"}
                  </Button>
                </div>
              )}

              {booking.status === 'in_progress' && (
                <div className="space-y-3">
                  <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
                    <p className="font-medium mb-1">Shift In Progress</p>
                    <p className="text-xs">Verify completion to release payment to the locum.</p>
                  </div>
                  <Button className="w-full" onClick={() => handleAction('complete')} disabled={completeMutation.isPending}>
                    {completeMutation.isPending ? "Processing..." : "Verify Shift Completed"}
                  </Button>
                </div>
              )}

              {booking.status === 'completed' && (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-5 w-5" /> Shift Verified & Paid
                  </div>
                  {/* Rate the locum */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Star className="h-4 w-4" /> Rate the Locum
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rate Dr. {booking.locum?.firstName} {booking.locum?.lastName}</DialogTitle>
                        <DialogDescription>Your rating improves the matching algorithm and helps other clinics.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm font-medium">Overall Score</p>
                          <StarRating value={ratingScore} onChange={setRatingScore} />
                          <p className="text-xs text-muted-foreground">{ratingScore} out of 5</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Written Feedback (Optional)</label>
                          <Textarea
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Was the locum punctual, professional, and competent?"
                            className="h-24"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleRating} disabled={submitRating.isPending}>
                          {submitRating.isPending ? "Submitting..." : "Submit Rating"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'disputed' && (
                <div className="pt-3 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 gap-2">
                        <AlertTriangle className="h-4 w-4" /> Report an Issue
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Report an Issue</DialogTitle>
                        <DialogDescription>Describe the problem. The LocumLink team will review within 24 hours.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Issue Type</label>
                          <Select value={disputeType} onValueChange={setDisputeType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no_show">Locum did not show up</SelectItem>
                              <SelectItem value="unprofessional_conduct">Unprofessional conduct</SelectItem>
                              <SelectItem value="payment_dispute">Payment discrepancy</SelectItem>
                              <SelectItem value="unsafe_conditions">Other / Quality concern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={disputeDesc}
                            onChange={(e) => setDisputeDesc(e.target.value)}
                            placeholder="Provide as much detail as possible..."
                            className="h-28"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={handleDispute}
                          disabled={!disputeDesc || raiseDispute.isPending}
                        >
                          {raiseDispute.isPending ? "Submitting..." : "Submit Report"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
