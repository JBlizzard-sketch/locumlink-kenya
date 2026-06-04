import { useState, useMemo } from "react";
import { useListLocums, useListClinics } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Building2, Search, ShieldCheck, Clock, XCircle, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "wouter";

type VerifStatus = "all" | "verified" | "pending" | "rejected";

function StatusBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 border"><ShieldCheck className="h-3 w-3" />Verified</Badge>;
  if (status === "pending")  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1 border"><Clock className="h-3 w-3" />Pending</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 border"><XCircle className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="outline" className="capitalize">{status}</Badge>;
}

function StatusFilterTabs({ value, onChange, counts }: {
  value: VerifStatus;
  onChange: (v: VerifStatus) => void;
  counts: Record<VerifStatus, number>;
}) {
  const tabs: { v: VerifStatus; label: string }[] = [
    { v: "all",      label: "All"      },
    { v: "verified", label: "Verified" },
    { v: "pending",  label: "Pending"  },
    { v: "rejected", label: "Rejected" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            value === v
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {label}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
            value === v ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {counts[v]}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"locums" | "clinics">("locums");
  const [locumStatus, setLocumStatus] = useState<VerifStatus>("all");
  const [clinicStatus, setClinicStatus] = useState<VerifStatus>("all");

  const { data: locumsData, isLoading: locumsLoading } = useListLocums({ limit: 200 } as any);
  const { data: clinicsData, isLoading: clinicsLoading } = useListClinics({ limit: 200 } as any);

  const allLocums = locumsData?.data ?? [];
  const allClinics = clinicsData?.data ?? [];

  const locumCounts = useMemo<Record<VerifStatus, number>>(() => ({
    all:      allLocums.length,
    verified: allLocums.filter(l => l.verificationStatus === "verified").length,
    pending:  allLocums.filter(l => l.verificationStatus === "pending").length,
    rejected: allLocums.filter(l => l.verificationStatus === "rejected").length,
  }), [allLocums]);

  const clinicCounts = useMemo<Record<VerifStatus, number>>(() => ({
    all:      allClinics.length,
    verified: allClinics.filter(c => c.verificationStatus === "verified").length,
    pending:  allClinics.filter(c => c.verificationStatus === "pending").length,
    rejected: allClinics.filter(c => c.verificationStatus === "rejected").length,
  }), [allClinics]);

  const locums = useMemo(() => {
    let list = allLocums;
    if (locumStatus !== "all") list = list.filter(l => l.verificationStatus === locumStatus);
    const q = search.toLowerCase();
    if (q) list = list.filter(l => `${l.firstName} ${l.lastName} ${l.registrationNumber}`.toLowerCase().includes(q));
    return list;
  }, [allLocums, locumStatus, search]);

  const clinics = useMemo(() => {
    let list = allClinics;
    if (clinicStatus !== "all") list = list.filter(c => c.verificationStatus === clinicStatus);
    const q = search.toLowerCase();
    if (q) list = list.filter(c => `${c.name} ${c.subCounty}`.toLowerCase().includes(q));
    return list;
  }, [allClinics, clinicStatus, search]);

  const pendingLocums = locumCounts.pending;
  const pendingClinics = clinicCounts.pending;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Browse all registered locums and clinics on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          {(pendingLocums > 0 || pendingClinics > 0) && (
            <Link href="/admin/verification">
              <Button variant="outline" size="sm" className="gap-1.5 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100">
                <Clock className="h-3.5 w-3.5" />
                {pendingLocums + pendingClinics} pending review
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Button>
            </Link>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Locums",    value: locumCounts.all,      color: "text-foreground"   },
          { label: "Verified",        value: locumCounts.verified,  color: "text-green-700"    },
          { label: "Pending Review",  value: pendingLocums + pendingClinics, color: "text-amber-700" },
          { label: "Total Clinics",   value: clinicCounts.all,     color: "text-foreground"   },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="locums" className="gap-2">
            <Users className="h-4 w-4" />
            Locums <span className="text-xs">({locumCounts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="clinics" className="gap-2">
            <Building2 className="h-4 w-4" />
            Clinics <span className="text-xs">({clinicCounts.all})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locums" className="mt-4 space-y-4">
          <StatusFilterTabs value={locumStatus} onChange={setLocumStatus} counts={locumCounts} />

          {locumsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
          ) : locums.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No locums found{search ? ` matching "${search}"` : ""}.</p>
              {locumStatus !== "all" && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLocumStatus("all")}>
                  Show all locums
                </Button>
              )}
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
                        {locum.yearsExperience != null && <span>{locum.yearsExperience} yrs exp</span>}
                        {locum.totalShiftsCompleted != null && <span>{locum.totalShiftsCompleted} shifts completed</span>}
                        {locum.reliabilityScore && <span>Reliability: {parseFloat(locum.reliabilityScore).toFixed(0)}%</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-muted-foreground hidden sm:block">ID #{locum.id}</p>
                      {locum.verificationStatus === "pending" && (
                        <Link href="/admin/verification">
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-amber-700 border-amber-300">
                            Review <ChevronRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clinics" className="mt-4 space-y-4">
          <StatusFilterTabs value={clinicStatus} onChange={setClinicStatus} counts={clinicCounts} />

          {clinicsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-dashed">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No clinics found{search ? ` matching "${search}"` : ""}.</p>
              {clinicStatus !== "all" && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setClinicStatus("all")}>
                  Show all clinics
                </Button>
              )}
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
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-xs text-muted-foreground hidden sm:block">ID #{clinic.id}</p>
                      {clinic.verificationStatus === "pending" && (
                        <Link href="/admin/verification">
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-amber-700 border-amber-300">
                            Review <ChevronRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
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
