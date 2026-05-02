import { useState } from "react";
import {
  useAdminListPayments,
  getAdminListPaymentsQueryKey,
  useAdminReleasePayment,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Building2,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  escrowed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  escrowed: "In Escrow",
  processing: "Processing",
  completed: "Released",
  failed: "Failed",
  refunded: "Refunded",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function ReleaseDialog({ paymentId, locumName, amount, onReleased }: {
  paymentId: number;
  locumName: string;
  amount: number;
  onReleased: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mpesaRef, setMpesaRef] = useState("");
  const releasePayment = useAdminReleasePayment();
  const { toast } = useToast();

  const handleRelease = async () => {
    try {
      await releasePayment.mutateAsync({
        id: paymentId,
        data: mpesaRef ? { mpesaTransactionId: mpesaRef } : {},
      });
      toast({ title: "Payment released", description: `${fmt(amount)} sent to ${locumName}` });
      setOpen(false);
      setMpesaRef("");
      onReleased();
    } catch (error: any) {
      toast({ title: "Release failed", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
          <Send className="h-3.5 w-3.5" /> Release
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Release Payment</DialogTitle>
          <DialogDescription>
            You are about to release {fmt(amount)} to {locumName}. This action is irreversible.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">M-Pesa / Reference Number (Optional)</label>
            <Input
              placeholder="e.g. RGH7X2QZ1A"
              value={mpesaRef}
              onChange={e => setMpesaRef(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Enter the M-Pesa confirmation code or bank reference if available.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleRelease}
            disabled={releasePayment.isPending}
          >
            {releasePayment.isPending ? "Releasing…" : "Confirm Release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const params = statusFilter !== "all" ? { status: statusFilter } : {};
  const { data, isLoading } = useAdminListPayments(params, {
    query: { queryKey: getAdminListPaymentsQueryKey(params) },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getAdminListPaymentsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getAdminListPaymentsQueryKey({ status: statusFilter }) });
  };

  const payments = data?.data ?? [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Payment Operations</h1>
        <p className="text-muted-foreground mt-1">Review and release locum payouts. Platform collects 10% fee on all completed shifts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Funds in Escrow</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-700">{fmt(data?.totalEscrowedVolume ?? 0)}</div>
                <p className="text-xs text-blue-600/80 mt-1">{data?.escrowedCount ?? 0} payment{(data?.escrowedCount ?? 0) !== 1 ? "s" : ""} awaiting release</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-700">{data?.pendingCount ?? 0}</div>
                <p className="text-xs text-yellow-600/80 mt-1">Not yet escrowed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Payments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-700">{data?.total ?? 0}</div>
                <p className="text-xs text-green-600/80 mt-1">All time across all shifts</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="escrowed">In Escrow</TabsTrigger>
          <TabsTrigger value="completed">Released</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payments Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-xl font-medium">No payments found</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {statusFilter !== "all" ? `No ${STATUS_LABEL[statusFilter] ?? statusFilter} payments.` : "Payments will appear here once shifts are completed."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(payment => (
            <Card
              key={payment.id}
              className={`transition-shadow hover:shadow-md ${payment.status === "escrowed" ? "border-blue-200 bg-blue-50/30" : ""}`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    payment.status === "completed" ? "bg-green-100" :
                    payment.status === "escrowed" ? "bg-blue-100" :
                    payment.status === "failed" ? "bg-red-100" : "bg-yellow-100"
                  }`}>
                    <CreditCard className={`h-5 w-5 ${
                      payment.status === "completed" ? "text-green-600" :
                      payment.status === "escrowed" ? "text-blue-600" :
                      payment.status === "failed" ? "text-red-600" : "text-yellow-600"
                    }`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{payment.locumName}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-sm text-muted-foreground">{payment.clinicName}</span>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[payment.status] ?? ""}`}>
                        {STATUS_LABEL[payment.status] ?? payment.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {payment.shiftTitle && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {payment.shiftTitle}
                        </span>
                      )}
                      {payment.shiftDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {format(parseISO(payment.shiftDate), "MMM dd, yyyy")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Created {format(parseISO(payment.createdAt), "MMM dd, yyyy")}
                      </span>
                      {payment.mpesaTransactionId && (
                        <span className="font-mono">Ref: {payment.mpesaTransactionId}</span>
                      )}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-lg text-foreground">{fmt(payment.locumPayout)}</div>
                      <div className="text-xs text-muted-foreground">
                        Gross: {fmt(payment.grossAmount)} · Fee: {fmt(payment.platformFee)}
                      </div>
                    </div>
                    {payment.releasedAt && (
                      <p className="text-xs text-green-600">
                        Released {format(parseISO(payment.releasedAt), "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {(payment.status === "escrowed" || payment.status === "pending") ? (
                      <ReleaseDialog
                        paymentId={payment.id}
                        locumName={payment.locumName}
                        amount={payment.locumPayout}
                        onReleased={invalidate}
                      />
                    ) : payment.status === "completed" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" /> Released
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {payments.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {payments.length} of {data?.total ?? 0} payment{(data?.total ?? 0) !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
