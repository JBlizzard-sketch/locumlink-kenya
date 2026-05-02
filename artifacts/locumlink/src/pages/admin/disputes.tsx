import { useState } from "react";
import { useListDisputes, getListDisputesQueryKey, useAdminResolveDispute } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function AdminDisputes() {
  const { data: disputesData, isLoading } = useListDisputes();
  const resolveDispute = useAdminResolveDispute();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState("");
  const [locumPenalty, setLocumPenalty] = useState(0);
  const [clinicPenalty, setClinicPenalty] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleResolve = async (id: number) => {
    try {
      await resolveDispute.mutateAsync({
        id,
        data: {
          status: 'resolved',
          resolutionNotes: notes,
          penaltyAppliedToLocum: locumPenalty || 0,
          penaltyAppliedToClinic: clinicPenalty || 0,
        }
      });
      
      toast({ title: "Dispute resolved successfully" });
      setNotes("");
      setLocumPenalty(0);
      setClinicPenalty(0);
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: getListDisputesQueryKey() });
    } catch (error: any) {
      toast({ title: "Failed to resolve", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const getDisputeTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight text-destructive">Dispute Management</h1>
        <p className="text-muted-foreground mt-1">Review and resolve reported issues between clinics and locums.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : disputesData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No open disputes</h3>
          <p className="text-muted-foreground mt-2">All reported issues have been resolved.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputesData?.data?.map((dispute) => (
            <Card key={dispute.id} className="border-l-4 border-l-destructive">
              <CardHeader className="bg-destructive/5 pb-4 border-b flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <CardTitle className="text-lg text-destructive">{getDisputeTypeLabel(dispute.disputeType)}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Booking #{dispute.bookingId} • Reported on {format(parseISO(dispute.createdAt!), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Badge variant="destructive" className="uppercase">Open</Badge>
              </CardHeader>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-muted-foreground">Description of Issue</h4>
                    <p className="text-sm bg-muted/30 p-4 rounded-lg border">{dispute.description}</p>
                  </div>
                </div>

                <div className="flex flex-col justify-end md:border-l md:pl-6 shrink-0 w-full md:w-64">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" onClick={() => setSelectedId(dispute.id)}>
                        Resolve Dispute
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Resolve Dispute #{dispute.id}</DialogTitle>
                        <DialogDescription>
                          Enter the resolution details. This action is final and will process any pending payments according to these penalties.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Resolution Notes</label>
                          <Textarea 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            placeholder="Explain how this was resolved..."
                            className="h-24"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-destructive">Penalty to Locum (KES)</label>
                            <Input 
                              type="number" 
                              value={locumPenalty} 
                              onChange={(e) => setLocumPenalty(Number(e.target.value))} 
                              min="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-destructive">Penalty to Clinic (KES)</label>
                            <Input 
                              type="number" 
                              value={clinicPenalty} 
                              onChange={(e) => setClinicPenalty(Number(e.target.value))} 
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
                        <Button onClick={() => handleResolve(dispute.id)} disabled={!notes || resolveDispute.isPending}>
                          Complete Resolution
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}