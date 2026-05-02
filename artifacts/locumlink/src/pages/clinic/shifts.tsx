import { useListShifts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, PlusCircle, Users } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

export default function ClinicShifts() {
  // Assuming listShifts returns shifts for the current clinic when called by clinic role
  const { data: shiftsData, isLoading } = useListShifts();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case 'filled':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Filled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Manage Shifts</h1>
          <p className="text-muted-foreground mt-1">Track and manage your posted shifts and applicants.</p>
        </div>
        <Link href="/clinic/shifts/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" /> Post a Shift
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shiftsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No shifts posted yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">Create your first shift to start receiving applications from verified locums.</p>
          <Link href="/clinic/shifts/new">
            <Button>Post a Shift</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shiftsData?.data?.map((shift) => (
            <Card key={shift.id} className="flex flex-col hover:border-primary/50 transition-colors overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20 border-b">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-background">
                    {shift.specialty?.name}
                  </Badge>
                  {getStatusBadge(shift.status)}
                </div>
                <CardTitle className="text-xl line-clamp-1">{shift.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate">{format(parseISO(shift.shiftDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="truncate">{shift.startTime} - {shift.endTime}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(shift.rate)}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    <Users className="h-4 w-4" />
                    {shift.status === 'open' ? 'Applicants' : `${shift.positionsFilled || 0}/${shift.positionsAvailable || 1} Filled`}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6">
                <Link href={`/clinic/shifts/${shift.id}`} className="w-full">
                  <Button variant="outline" className="w-full">Manage Shift</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}