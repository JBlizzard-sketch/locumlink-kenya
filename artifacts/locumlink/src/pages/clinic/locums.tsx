import { useState } from "react";
import { useListLocums, useListSpecialties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, Star, MapPin, BriefcaseMedical, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function ClinicLocumsDirectory() {
  const [specialtyId, setSpecialtyId] = useState<string>("all");
  
  const { data: specialties } = useListSpecialties();
  
  const { data: locumsData, isLoading } = useListLocums({
    verificationStatus: 'verified',
    ...(specialtyId !== "all" ? { specialtyId: Number(specialtyId) } : {}),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">Locum Directory</h1>
        <p className="text-muted-foreground mt-1">Browse verified medical professionals available in Nairobi.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or keyword..." className="pl-9" />
        </div>
        <Select value={specialtyId} onValueChange={setSpecialtyId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties?.data?.map((s) => (
              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locumsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No locums found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locumsData?.data?.map((locum) => (
            <Card key={locum.id} className="flex flex-col hover:shadow-md transition-shadow group">
              <CardContent className="p-6 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                    <AvatarImage src={locum.profilePhotoUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {locum.firstName?.charAt(0)}{locum.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {locum.isAvailableForUrgent && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      Available Now
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Dr. {locum.firstName} {locum.lastName}
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-sm text-primary font-medium">{locum.specialty?.name}</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-medium text-foreground">{locum.reliabilityScore || 'New'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BriefcaseMedical className="h-4 w-4" />
                    <span>{locum.yearsExperience} yrs exp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{locum.subCounty || 'Nairobi'}</span>
                  </div>
                </div>

                {locum.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">
                    "{locum.bio}"
                  </p>
                )}
                
              </CardContent>
              <CardFooter className="p-6 pt-0 flex items-center justify-between border-t mt-auto gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Rate</p>
                  <p className="font-bold text-foreground">
                    {locum.preferredRatePerShift ? formatCurrency(locum.preferredRatePerShift) : 'Negotiable'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/clinic/locums/${locum.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                  <Link href={`/clinic/shifts/new?specialtyId=${locum.primarySpecialtyId}`}>
                    <Button size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      Post Shift
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { Users } from "lucide-react";