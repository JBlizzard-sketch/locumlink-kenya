import { useState } from "react";
import { useListShifts, useListSpecialties, useApplyToShift } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Calendar, Clock, DollarSign, MapPin, Search, Filter, ShieldCheck, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function LocumShifts() {
  const [specialtyId, setSpecialtyId] = useState<string>("all");
  const [urgency, setUrgency] = useState<string>("all");
  
  const { data: specialties } = useListSpecialties();
  
  const { data: shiftsData, isLoading } = useListShifts({
    status: "open",
    ...(specialtyId !== "all" ? { specialtyId: Number(specialtyId) } : {}),
    ...(urgency !== "all" ? { urgency } : {}),
  });

  const { toast } = useToast();
  const applyToShift = useApplyToShift();

  const handleQuickApply = async (shiftId: number) => {
    try {
      await applyToShift.mutateAsync({ shiftId, data: { coverMessage: "Quick apply from discovery board" } });
      toast({ title: "Application submitted", description: "The clinic will review your profile shortly." });
    } catch (error: any) {
      toast({ title: "Failed to apply", description: error.error || "An error occurred", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Find Shifts</h1>
        <p className="text-muted-foreground mt-1">Browse open shifts from verified clinics in Nairobi.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search shifts..." className="pl-9" />
        </div>
        <Select value={specialtyId} onValueChange={setSpecialtyId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties?.data?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Urgency</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-2 w-full bg-muted"></div>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shiftsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No shifts found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shiftsData?.data?.map((shift) => (
            <Card key={shift.id} className="flex flex-col hover:border-primary/50 transition-colors overflow-hidden group">
              <div className={`h-1.5 w-full ${shift.urgency === 'emergency' ? 'bg-destructive' : shift.urgency === 'urgent' ? 'bg-accent' : 'bg-primary'}`} />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {shift.specialty?.name}
                  </Badge>
                  {shift.urgency !== 'normal' && (
                    <Badge variant={shift.urgency === 'emergency' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-bold tracking-wider">
                      {shift.urgency}
                    </Badge>
                  )}
                </div>
                <CardTitle className="line-clamp-1">{shift.title}</CardTitle>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{shift.clinic?.name}</span>
                  {shift.clinic?.verificationStatus === 'verified' && (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium text-foreground">{format(parseISO(shift.shiftDate), 'MMM dd')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium text-foreground">{shift.startTime}</span>
                  </div>
                </div>
                <div className="pt-3 border-t flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Shift Rate</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(shift.rate)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-primary flex items-center justify-end gap-1">
                      <ShieldCheck className="h-3 w-3" /> Guaranteed
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                <Link href={`/locum/shifts/${shift.id}`} className="w-1/2">
                  <Button variant="outline" className="w-full">Details</Button>
                </Link>
                <Button 
                  className="w-1/2" 
                  onClick={() => handleQuickApply(shift.id)}
                  disabled={applyToShift.isPending}
                >
                  Quick Apply
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}