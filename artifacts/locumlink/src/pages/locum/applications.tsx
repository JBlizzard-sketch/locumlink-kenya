import { useListMyApplications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, Calendar, CheckCircle2, XCircle, Clock4, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LocumApplications() {
  const { data: applicationsData, isLoading } = useListMyApplications();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Clock4 className="w-3 h-3 mr-1" /> Pending Review</Badge>;
      case 'shortlisted':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><AlertCircle className="w-3 h-3 mr-1" /> Shortlisted</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Not Selected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Applications</h1>
        <p className="text-muted-foreground mt-1">Track the status of your shift applications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applicationsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <ActivitySquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No applications yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">You haven't applied to any shifts.</p>
          <Link href="/locum/shifts">
            <Button>Find Shifts</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applicationsData?.data?.map((app) => (
            <Card key={app.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-start md:justify-start md:items-center gap-4">
                    <h3 className="text-lg font-bold">
                      <Link href={`/locum/shifts/${app.shiftId}`} className="hover:text-primary transition-colors">
                        {app.shift?.title}
                      </Link>
                    </h3>
                    {getStatusBadge(app.status)}
                  </div>
                  
                  <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-foreground">{app.shift?.clinic?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{app.shift?.shiftDate ? format(parseISO(app.shift.shiftDate), 'MMM dd, yyyy') : 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{app.shift?.startTime} - {app.shift?.endTime}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-muted-foreground mb-1">Shift Rate</p>
                    <p className="text-lg font-bold text-primary">{app.shift?.rate ? formatCurrency(app.shift.rate) : 'N/A'}</p>
                  </div>
                  <Link href={`/locum/shifts/${app.shiftId}`}>
                    <Button variant="outline" size="sm">View Shift</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Temporary import replacement
import { ActivitySquare } from "lucide-react";