import { useState } from "react";
import { useGetVerificationQueue, getGetVerificationQueueQueryKey, useAdminVerifyLocum, useAdminVerifyClinic } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, FileText, User, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminVerification() {
  const [activeTab, setActiveTab] = useState<"locum" | "clinic">("locum");
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: queueData, isLoading } = useGetVerificationQueue({ 
    type: activeTab 
  }, { 
    query: { queryKey: getGetVerificationQueueQueryKey({ type: activeTab }) } 
  });

  const verifyLocum = useAdminVerifyLocum();
  const verifyClinic = useAdminVerifyClinic();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleVerify = async (id: number, status: 'verified' | 'rejected', type: string) => {
    try {
      const payload = { data: { status, notes } };
      if (type === 'locum') {
        await verifyLocum.mutateAsync({ id, ...payload });
      } else {
        await verifyClinic.mutateAsync({ id, ...payload });
      }
      
      toast({ title: `${type === 'locum' ? 'Locum' : 'Clinic'} ${status} successfully` });
      setNotes("");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: getGetVerificationQueueQueryKey({ type: activeTab }) });
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Verification Queue</h1>
        <p className="text-muted-foreground mt-1">Review and approve credentials for locums and clinics.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="locum" className="gap-2"><User className="h-4 w-4" /> Locums</TabsTrigger>
          <TabsTrigger value="clinic" className="gap-2"><Building2 className="h-4 w-4" /> Clinics</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : queueData?.data?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-foreground">Queue is empty</h3>
              <p className="text-muted-foreground mt-2">All {activeTab} accounts have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueData?.data?.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted: {format(parseISO(item.submittedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending Review</Badge>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      {item.registrationNumber && (
                        <div>
                          <p className="text-sm text-muted-foreground">Registration / License Number</p>
                          <p className="font-mono font-medium">{item.registrationNumber}</p>
                        </div>
                      )}
                      
                      {item.documents && item.documents.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Uploaded Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {item.documents.map((doc, idx) => (
                              <Badge key={idx} variant="secondary" className="px-3 py-1 cursor-pointer hover:bg-secondary/80">
                                <FileText className="h-3 w-3 mr-1" /> Document {idx + 1}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:border-l md:pl-6 shrink-0 w-full md:w-64">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setSelectedId(item.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve {activeTab === 'locum' ? 'Locum' : 'Clinic'}</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to verify {item.name}? They will gain full access to the platform.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <label className="text-sm font-medium">Internal Notes (Optional)</label>
                            <Textarea 
                              value={notes} 
                              onChange={(e) => setNotes(e.target.value)} 
                              placeholder="e.g. Verified license via KMPDC portal..."
                              className="mt-2"
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleVerify(item.id, 'verified', activeTab)} disabled={verifyLocum.isPending || verifyClinic.isPending}>
                              Confirm Approval
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setSelectedId(item.id)}>
                            <XCircle className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject {activeTab === 'locum' ? 'Locum' : 'Clinic'}</DialogTitle>
                            <DialogDescription>
                              This will deny access to the platform. You must provide a reason.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <label className="text-sm font-medium text-destructive">Rejection Reason (Required)</label>
                            <Textarea 
                              value={notes} 
                              onChange={(e) => setNotes(e.target.value)} 
                              placeholder="e.g. License is expired, please upload current document..."
                              className="mt-2"
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleVerify(item.id, 'rejected', activeTab)} disabled={!notes || verifyLocum.isPending || verifyClinic.isPending}>
                              Confirm Rejection
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
      </Tabs>
    </div>
  );
}