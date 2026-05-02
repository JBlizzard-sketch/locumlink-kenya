import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Download, FileSignature, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSignContract } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL as string;

interface ContractData {
  contractRef: string;
  bookingId: number;
  contractUrl: string; // data URI
  contractSignedByClinicAt: string | null;
  contractSignedByLocumAt: string | null;
  fullyExecuted: boolean;
}

function useGetContract(bookingId: number) {
  const token = localStorage.getItem("token");
  return useQuery<ContractData>({
    queryKey: ["contract", bookingId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}api/bookings/${bookingId}/contract`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load contract");
      return res.json() as Promise<ContractData>;
    },
    enabled: !!bookingId,
  });
}

export default function LocumContract() {
  const [, params] = useRoute("/locum/bookings/:id/contract");
  const bookingId = Number(params?.id);
  const { data, isLoading, refetch } = useGetContract(bookingId);
  const signMutation = useSignContract();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  async function handleSign() {
    try {
      await signMutation.mutateAsync({ id: bookingId });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["contract", bookingId] });
      toast({ title: "Contract signed", description: "You have digitally signed this agreement." });
    } catch (err: any) {
      toast({ title: "Signature failed", description: err.error || "Please try again.", variant: "destructive" });
    }
  }

  function handleDownload() {
    if (!data?.contractUrl) return;
    // Open the data URI HTML in a new tab so the browser can print/save as PDF
    const win = window.open("", "_blank");
    if (!win) return;
    const html = atob(data.contractUrl.split(",")[1]);
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/locum/bookings/${bookingId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-serif">Service Agreement</h1>
          {data && <p className="text-sm text-muted-foreground">Ref: {data.contractRef}</p>}
        </div>
        <div className="flex gap-2">
          {!data?.contractSignedByLocumAt && (
            <Button onClick={handleSign} disabled={signMutation.isPending}>
              <FileSignature className="h-4 w-4 mr-2" />
              {signMutation.isPending ? "Signing…" : "Sign Agreement"}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownload} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Signature status */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card className={data.contractSignedByClinicAt ? "border-emerald-500" : "border-amber-400"}>
            <CardContent className="pt-4 flex items-center gap-3">
              {data.contractSignedByClinicAt
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                : <Clock className="h-5 w-5 text-amber-500 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">Facility Signature</p>
                <p className="text-xs text-muted-foreground">
                  {data.contractSignedByClinicAt
                    ? new Date(data.contractSignedByClinicAt).toLocaleString("en-KE")
                    : "Awaiting signature"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={data.contractSignedByLocumAt ? "border-emerald-500" : "border-amber-400"}>
            <CardContent className="pt-4 flex items-center gap-3">
              {data.contractSignedByLocumAt
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                : <Clock className="h-5 w-5 text-amber-500 shrink-0" />}
              <div>
                <p className="text-sm font-semibold">Your Signature</p>
                <p className="text-xs text-muted-foreground">
                  {data.contractSignedByLocumAt
                    ? new Date(data.contractSignedByLocumAt).toLocaleString("en-KE")
                    : "Awaiting your signature"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {data?.fullyExecuted && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-500 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            This agreement is fully executed and legally binding.
          </span>
        </div>
      )}

      {/* Contract iframe */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contract Document</CardTitle>
          {data && <Badge variant="outline">{data.contractRef}</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : data?.contractUrl ? (
            <iframe
              src={data.contractUrl}
              className="w-full"
              style={{ height: "70vh", border: "none" }}
              title={`Contract ${data.contractRef}`}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">Contract not available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
