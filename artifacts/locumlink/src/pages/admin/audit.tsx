import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, ChevronLeft, ChevronRight, ShieldCheck, DollarSign, XCircle, AlertTriangle, Info } from "lucide-react";
import { format, parseISO } from "date-fns";

const BASE_URL = import.meta.env.BASE_URL as string;

interface AuditEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  userEmail: string | null;
  userRole: string | null;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

function useAuditLogs(page: number, entityType: string) {
  const token = localStorage.getItem("token");
  return useQuery<AuditResponse>({
    queryKey: ["admin-audit-logs", page, entityType],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (entityType !== "all") params.set("entityType", entityType);
      const res = await fetch(`${BASE_URL}api/admin/audit-logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load audit logs");
      return res.json() as Promise<AuditResponse>;
    },
    staleTime: 30_000,
  });
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  locum_verified:      <ShieldCheck className="h-4 w-4 text-green-600" />,
  locum_rejected:      <XCircle className="h-4 w-4 text-red-600" />,
  clinic_verified:     <ShieldCheck className="h-4 w-4 text-green-600" />,
  clinic_rejected:     <XCircle className="h-4 w-4 text-red-600" />,
  payment_released:    <DollarSign className="h-4 w-4 text-blue-600" />,
  dispute_resolved:    <AlertTriangle className="h-4 w-4 text-amber-600" />,
};

const ACTION_LABELS: Record<string, string> = {
  locum_verified:   "Locum Verified",
  locum_rejected:   "Locum Rejected",
  clinic_verified:  "Clinic Verified",
  clinic_rejected:  "Clinic Rejected",
  payment_released: "Payment Released",
  dispute_resolved: "Dispute Resolved",
};

const ACTION_COLORS: Record<string, string> = {
  locum_verified:   "bg-green-50 text-green-700 border-green-200",
  locum_rejected:   "bg-red-50 text-red-700 border-red-200",
  clinic_verified:  "bg-green-50 text-green-700 border-green-200",
  clinic_rejected:  "bg-red-50 text-red-700 border-red-200",
  payment_released: "bg-blue-50 text-blue-700 border-blue-200",
  dispute_resolved: "bg-amber-50 text-amber-700 border-amber-200",
};

const ENTITY_TYPES = ["all", "locum", "clinic", "payment", "dispute"];

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("all");
  const { data, isLoading, isError } = useAuditLogs(page, entityType);

  const entries = data?.data ?? [];
  const hasNext = entries.length === 50;
  const hasPrev = page > 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-primary" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            A record of all admin actions — verifications, payment releases, and dispute resolutions.
          </p>
        </div>
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t === "all" ? "All actions" : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Actions</CardTitle>
          <CardDescription>Showing page {page} · 50 per page</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Failed to load audit logs. You may need to be signed in as admin.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No audit events recorded yet. Events are created when admins verify users, release payments, or resolve disputes.</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 rounded-full bg-muted shrink-0">
                      {ACTION_ICONS[entry.action] ?? <Info className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={`text-xs ${ACTION_COLORS[entry.action] ?? ""}`}
                        >
                          {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {entry.entityType}
                          {entry.entityId != null ? ` #${entry.entityId}` : ""}
                        </span>
                      </div>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {Object.entries(entry.metadata)
                            .filter(([, v]) => v != null && v !== "")
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-xs font-medium">{entry.userEmail ?? "System"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{entry.userRole ?? ""}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(parseISO(entry.createdAt), "d MMM yyyy, HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!hasPrev} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasNext} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
