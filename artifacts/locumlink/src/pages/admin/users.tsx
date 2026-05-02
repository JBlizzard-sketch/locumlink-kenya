import { useState } from "react";
import { useListLocums, useListClinics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Building2, Search, ShieldCheck, Clock, XCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><ShieldCheck className="h-3 w-3" />Verified</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="capitalize">{status}</Badge>;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"locums" | "clinics">("locums");

  const { data: locumsData, isLoading: locumsLoading } = useListLocums({});
  const { data: clinicsData, isLoading: clinicsLoading } = useListClinics({});

  const locums = (locumsData?.data ?? []).filter(l =>
    `${l.firstName} ${l.lastName} ${l.registrationNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  const clinics = (clinicsData?.data ?? []).filter(c =>
    `${c.name} ${c.subCounty}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Browse all registered locums and clinics on the platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="locums" className="gap-2">
            <Users className="h-4 w-4" />
            Locums {locumsData?.total != null && <span className="ml-1 text-xs">({locumsData.total})</span>}
          </TabsTrigger>
          <TabsTrigger value="clinics" className="gap-2">
            <Building2 className="h-4 w-4" />
            Clinics {clinicsData?.total != null && <span className="ml-1 text-xs">({clinicsData.total})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locums" className="mt-6">
          {locumsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
          ) : locums.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No locums found{search ? ` matching "${search}"` : ""}.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {locums.map((locum) => (
                <Card key={locum.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-11 w-11 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {locum.firstName?.charAt(0)}{locum.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">Dr. {locum.firstName} {locum.lastName}</p>
                        <StatusBadge status={locum.verificationStatus} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {locum.registrationNumber && <span>Reg: {locum.registrationNumber}</span>}
                        {locum.yearsOfExperience != null && <span>{locum.yearsOfExperience} yrs exp</span>}
                        {locum.totalShiftsCompleted != null && <span>{locum.totalShiftsCompleted} shifts completed</span>}
                        {locum.reliabilityScore && <span>Reliability: {parseFloat(locum.reliabilityScore).toFixed(0)}%</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">ID #{locum.id}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clinics" className="mt-6">
          {clinicsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No clinics found{search ? ` matching "${search}"` : ""}.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {clinics.map((clinic) => (
                <Card key={clinic.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{clinic.name}</p>
                        <StatusBadge status={clinic.verificationStatus} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {clinic.facilityType && <span className="capitalize">{clinic.facilityType.replace(/_/g, ' ')}</span>}
                        {clinic.subCounty && <span>{clinic.subCounty}</span>}
                        {clinic.contactEmail && <span>{clinic.contactEmail}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">ID #{clinic.id}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
