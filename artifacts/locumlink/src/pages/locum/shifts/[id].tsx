import { useRoute } from "wouter";
import { useGetShift, getGetShiftQueryKey, useApplyToShift } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, ShieldCheck, AlertCircle, BriefcaseMedical, CheckCircle2, ChevronLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function LocumShiftDetail() {
  const [, params] = useRoute("/locum/shifts/:id");
  const shiftId = Number(params?.id);
  const [coverMessage, setCoverMessage] = useState("");
  
  const { data: shift, isLoading } = useGetShift(shiftId, { 
    query: { enabled: !!shiftId, queryKey: getGetShiftQueryKey(shiftId) } 
  });
  
  const applyToShift = useApplyToShift();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleApply = async () => {
    try {
      await applyToShift.mutateAsync({ 
        shiftId, 
        data: { coverMessage: coverMessage || "Applying for this shift." } 
      });
      toast({ title: "Application submitted", description: "The clinic will review your profile shortly." });
      queryClient.invalidateQueries({ queryKey: getGetShiftQueryKey(shiftId) });
    } catch (error: any) {
      toast({ title: "Failed to apply", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!shift) {
    return <div>Shift not found</div>;
  }

  const hasApplied = shift.applications && shift.applications.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/locum/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to shifts
      </Link>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 space-y-6 w-full">
          {/* Main Shift Info */}
          <Card>
            <div className={`h-2 w-full ${shift.urgency === 'emergency' ? 'bg-destructive' : shift.urgency === 'urgent' ? 'bg-accent' : 'bg-primary'}`} />
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-sm px-3 py-1">
                  {shift.specialty?.name}
                </Badge>
                {shift.urgency !== 'normal' && (
                  <Badge variant={shift.urgency === 'emergency' ? 'destructive' : 'secondary'} className="uppercase text-xs font-bold tracking-wider">
                    {shift.urgency}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl md:text-3xl">{shift.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4 md:gap-8 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg shadow-sm border">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold">{format(parseISO(shift.shiftDate), 'EEEE, MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg shadow-sm border">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold">{shift.startTime} - {shift.endTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg shadow-sm border">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-semibold text-lg text-primary">{formatCurrency(shift.rate)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {shift.description || "No description provided."}
                </p>
              </div>

              {shift.specificRequirements && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Specific Requirements</h3>
                  <div className="p-4 bg-secondary/30 rounded-lg border border-secondary text-sm">
                    <p className="text-secondary-foreground whitespace-pre-wrap">
                      {shift.specificRequirements}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                {shift.minYearsExperience && (
                  <div className="flex items-center gap-2 text-sm">
                    <BriefcaseMedical className="h-4 w-4 text-muted-foreground" />
                    <span>Min {shift.minYearsExperience} years experience required</span>
                  </div>
                )}
                {shift.insuranceCovered === 'yes' && (
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">Indemnity insurance covered</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-[320px] space-y-6 shrink-0">
          {/* Application Action */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Apply for Shift</CardTitle>
              <CardDescription>
                {shift.positionsAvailable || 1} position(s) available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasApplied ? (
                <div className="flex flex-col items-center justify-center p-4 bg-primary/5 text-primary rounded-lg border border-primary/20 text-center">
                  <CheckCircle2 className="h-8 w-8 mb-2" />
                  <p className="font-medium">Application Submitted</p>
                  <p className="text-xs mt-1 opacity-80">You will be notified when the clinic decides.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cover Message (Optional)</label>
                    <Textarea 
                      placeholder="Briefly explain why you're a good fit..." 
                      value={coverMessage}
                      onChange={(e) => setCoverMessage(e.target.value)}
                      className="resize-none h-24"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleApply}
                    disabled={applyToShift.isPending}
                  >
                    {applyToShift.isPending ? "Applying..." : "Submit Application"}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground">
                    By applying, you agree to show up if confirmed. Cancellations within 24h incur penalties.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Clinic Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-bold text-lg">{shift.clinic?.name}</h4>
                <p className="text-sm text-muted-foreground">{shift.clinic?.facilityType}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-right max-w-[150px] truncate">{shift.clinic?.address}, {shift.clinic?.subCounty}</span>
                </div>
                <div className="flex justify-between pb-2 border-b">
                  <span className="text-muted-foreground">Verification</span>
                  <span className="font-medium flex items-center text-primary">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verified
                  </span>
                </div>
                {shift.clinic?.payerScore && (
                  <div className="flex justify-between pb-2">
                    <span className="text-muted-foreground">Payer Score</span>
                    <span className="font-medium">{shift.clinic.payerScore}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}