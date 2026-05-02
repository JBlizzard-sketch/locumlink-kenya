import { useState } from "react";
import { useGetBooking, getGetBookingQueryKey, useCheckInBooking, useCompleteBooking, useSignContract, useSubmitRating, useRaiseDispute } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, FileSignature, CheckCircle2, ChevronLeft, AlertTriangle, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function LocumBookingDetail() {
  const [, params] = useRoute("/locum/bookings/:id");
  const bookingId = Number(params?.id);

  const { data: booking, isLoading, refetch } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const checkInMutation = useCheckInBooking();
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
        data: { raterType: "locum", overallScore: ratingScore, comment: ratingComment }
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
      toast({ title: "Dispute raised", description: "The LocumLink team will review and contact you." });
      setDisputeDesc("");
      invalidate();
    } catch (error: any) {
      toast({ title: "Failed to raise dispute", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!booking) return <div className="p-8 text-center text-muted-foreground">Booking not found</div>;

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
                  {booking.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{booking.shift?.title}</CardTitle>
              <p className="text-muted-foreground">{booking.shift?.clinic?.name}</p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg"><Calendar className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">{booking.shift?.shiftDate ? format(parseISO(booking.shift.shiftDate), 'MMM dd, yyyy') : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg"><Clock className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">{booking.shift?.startTime} – {booking.shift?.endTime}</p>
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

          {booking.payment && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Payment Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm pb-2 border-b">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span>{formatCurrency(booking.payment.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-sm pb-2 border-b">
                  <span className="text-muted-foreground">Platform Fee (10%)</span>
                  <span>−{formatCurrency(booking.payment.platformFee)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1">
                  <span>Net Payout</span>
                  <span className="text-primary">{formatCurrency(booking.payment.locumPayout)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={booking.payment.status === 'released' ? 'default' : 'secondary'} className="capitalize">
                    {booking.payment.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">via {booking.payment.paymentMethod}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Sidebar */}
        <div className="w-full md:w-[320px] space-y-4 shrink-0">
          <Card className="border-primary/20 shadow-md">
            <CardHeader><CardTitle className="text-lg">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {booking.status === 'pending_contract' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
                    <FileSignature className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Please sign the contract to confirm this shift.</p>
                  </div>
                  <Button className="w-full" onClick={() => handleAction('sign')} disabled={signMutation.isPending}>
                    {signMutation.isPending ? "Signing..." : "Sign Contract"}
                  </Button>
                </div>
              )}

              {booking.status === 'confirmed' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm bg-blue-50 text-blue-800 p-3 rounded-md border border-blue-200">
                    <Clock className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Check in when you arrive at the facility.</p>
                  </div>
                  <Button className="w-full" onClick={() => handleAction('checkin')} disabled={checkInMutation.isPending}>
                    {checkInMutation.isPending ? "Checking in..." : "Check In"}
                  </Button>
                </div>
              )}

              {booking.status === 'in_progress' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm bg-purple-50 text-purple-800 p-3 rounded-md border border-purple-200">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <p>Complete the shift to trigger payment release.</p>
                  </div>
                  <Button className="w-full" onClick={() => handleAction('complete')} disabled={completeMutation.isPending}>
                    {completeMutation.isPending ? "Completing..." : "Complete Shift"}
                  </Button>
                </div>
              )}

              {booking.status === 'completed' && (
                <>
                  <div className="flex items-center justify-center gap-2 text-sm text-green-700 font-medium p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-5 w-5" /> Shift Completed
                  </div>
                  {/* Rate the clinic */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Star className="h-4 w-4" /> Rate the Clinic
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rate this clinic</DialogTitle>
                        <DialogDescription>Share your experience at {booking.shift?.clinic?.name}.</DialogDescription>
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
                            placeholder="Was the facility well-equipped? Was the team supportive?"
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
                        <AlertTriangle className="h-4 w-4" /> Raise Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Raise a Dispute</DialogTitle>
                        <DialogDescription>
                          Describe the issue. The LocumLink team will review within 24 hours.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Issue Type</label>
                          <Select value={disputeType} onValueChange={setDisputeType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no_show">No-show / Last-minute cancellation</SelectItem>
                              <SelectItem value="unprofessional_conduct">Unprofessional conduct</SelectItem>
                              <SelectItem value="payment_dispute">Payment dispute</SelectItem>
                              <SelectItem value="unsafe_conditions">Unsafe working conditions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={disputeDesc}
                            onChange={(e) => setDisputeDesc(e.target.value)}
                            placeholder="Describe what happened in as much detail as possible..."
                            className="h-28"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={handleDispute}
                          disabled={!disputeDesc || raiseDispute.isPending}
                        >
                          {raiseDispute.isPending ? "Submitting..." : "Submit Dispute"}
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
