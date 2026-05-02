import { useRoute, Link } from "wouter";
import { useGetShift, getGetShiftQueryKey, useListShiftApplications, useShortlistApplication, useConfirmApplication, useRejectApplication } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, MapPin, Calendar, Clock, Star, AlertCircle, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ClinicShiftDetail() {
  const [, params] = useRoute("/clinic/shifts/:id");
  const shiftId = Number(params?.id);
  
  const { data: shift, isLoading: shiftLoading } = useGetShift(shiftId, { 
    query: { enabled: !!shiftId, queryKey: getGetShiftQueryKey(shiftId) } 
  });
  
  const { data: applications, isLoading: appsLoading } = useListShiftApplications(shiftId, {
    query: { enabled: !!shiftId }
  });

  const shortlist = useShortlistApplication();
  const confirm = useConfirmApplication();
  const reject = useRejectApplication();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = async (appId: number, action: 'shortlist' | 'confirm' | 'reject') => {
    try {
      if (action === 'shortlist') await shortlist.mutateAsync({ shiftId, id: appId });
      if (action === 'confirm') await confirm.mutateAsync({ shiftId, id: appId });
      if (action === 'reject') await reject.mutateAsync({ shiftId, id: appId });
      
      toast({ title: `Application ${action}ed successfully` });
      queryClient.invalidateQueries({ queryKey: getGetShiftQueryKey(shiftId) });
      queryClient.invalidateQueries({ queryKey: [`/api/shifts/${shiftId}/applications`] });
    } catch (error: any) {
      toast({ title: "Action failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  if (shiftLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!shift) return <div>Shift not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/clinic/shifts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to shifts
      </Link>

      <Card className="border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="bg-muted/10 pb-6 border-b">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="bg-background">
              {shift.specialty?.name}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {shift.status}
            </Badge>
          </div>
          <CardTitle className="text-3xl">{shift.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date</p>
              <p className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {shift.shiftDate ? format(parseISO(shift.shiftDate), 'MMM dd, yyyy') : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Time</p>
              <p className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {shift.startTime} - {shift.endTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Rate</p>
              <p className="font-medium text-primary text-lg">{formatCurrency(shift.rate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fill Status</p>
              <p className="font-medium">
                {shift.positionsFilled || 0} / {shift.positionsAvailable || 1} Filled
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold font-serif mb-4">Applicants</h2>
        {appsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : applications?.data?.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No applicants yet</h3>
            <p className="text-muted-foreground mt-1">We've notified locums matching your requirements.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications?.data?.map((app) => (
              <Card key={app.id} className={app.status === 'confirmed' ? 'border-green-200 bg-green-50/10' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={app.locum?.profilePhotoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {app.locum?.firstName?.charAt(0)}{app.locum?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg">{app.locum?.firstName} {app.locum?.lastName}</h4>
                          <Badge variant="outline" className="text-xs">Match: {app.matchScore}%</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-accent text-accent" />
                            {app.locum?.reliabilityScore || 'New'}
                          </span>
                          <span>•</span>
                          <span>{app.locum?.yearsExperience} yrs exp</span>
                        </div>
                        {app.coverMessage && (
                          <p className="text-sm mt-2 italic text-foreground/80 border-l-2 border-primary/20 pl-3">
                            "{app.coverMessage}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:border-l md:pl-6 shrink-0">
                      {app.status === 'applied' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleAction(app.id, 'shortlist')} disabled={shortlist.isPending}>
                            Shortlist
                          </Button>
                          <Button size="sm" onClick={() => handleAction(app.id, 'confirm')} disabled={confirm.isPending}>
                            Confirm
                          </Button>
                        </>
                      )}
                      {app.status === 'shortlisted' && (
                        <>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">Shortlisted</Badge>
                          <Button size="sm" onClick={() => handleAction(app.id, 'confirm')} disabled={confirm.isPending}>
                            Confirm
                          </Button>
                        </>
                      )}
                      {app.status === 'confirmed' && (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                          <CheckCircle2 className="h-5 w-5" /> Confirmed
                        </div>
                      )}
                      {app.status === 'rejected' && (
                        <div className="flex items-center gap-2 text-red-600 font-medium">
                          <XCircle className="h-5 w-5" /> Rejected
                        </div>
                      )}
                      
                      {app.status !== 'confirmed' && app.status !== 'rejected' && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleAction(app.id, 'reject')} disabled={reject.isPending}>
                          Reject
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
    </div>
  );
}