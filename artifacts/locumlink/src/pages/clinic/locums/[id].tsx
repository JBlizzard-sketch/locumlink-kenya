import { useRoute, Link } from "wouter";
import {
  useGetLocum,
  useGetLocumRatings,
  getGetLocumQueryKey,
  getGetLocumRatingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ShieldCheck,
  Star,
  MapPin,
  BriefcaseMedical,
  Clock,
  FileCheck,
  FileX,
  User,
  Banknote,
  MessageSquare,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const BASE_URL = import.meta.env.BASE_URL as string;

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function DocStatus({ label, url }: { label: string; url?: string | null }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      {url ? (
        <span className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
          <FileCheck className="h-4 w-4" /> Uploaded
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileX className="h-4 w-4" /> Missing
        </span>
      )}
    </div>
  );
}

export default function ClinicLocumProfile() {
  const [, params] = useRoute("/clinic/locums/:id");
  const locumId = Number(params?.id);

  const { data: locum, isLoading } = useGetLocum(locumId, {
    query: { enabled: !!locumId, queryKey: getGetLocumQueryKey(locumId) },
  });

  const { data: ratingsData, isLoading: ratingsLoading } = useGetLocumRatings(locumId, {
    query: { enabled: !!locumId, queryKey: getGetLocumRatingsQueryKey(locumId) },
  });

  const ratings = (ratingsData as any)?.data ?? [];

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(n);

  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / ratings.length
      : null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </CardContent>
          </Card>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!locum) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Locum not found</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/clinic/locums">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  const isVerified = locum.verificationStatus === "verified";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/clinic/locums"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Directory
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column — identity card */}
        <Card className="md:col-span-1 h-fit">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <Avatar className="h-24 w-24 border-2 border-background shadow-md">
              <AvatarImage src={locum.profilePhotoUrl ? `${BASE_URL}api/locums/${locum.id}/photo` : undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {locum.firstName?.charAt(0)}
                {locum.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-xl font-bold">
                {locum.firstName} {locum.lastName}
              </h1>
              <p className="text-sm text-primary font-medium">
                {(locum as any).specialty?.name ?? "—"}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {isVerified ? (
                <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {locum.verificationStatus === "pending" ? "Pending Verification" : locum.verificationStatus}
                </Badge>
              )}
              {locum.isAvailableForUrgent && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                  Urgent OK
                </Badge>
              )}
            </div>

            {avgRating !== null && (
              <div className="flex flex-col items-center gap-1">
                <StarRating value={avgRating} />
                <span className="text-xs text-muted-foreground">
                  {avgRating.toFixed(1)} · {ratings.length} review{ratings.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <Separator />

            <div className="w-full space-y-2 text-sm text-left">
              {locum.subCounty && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{locum.subCounty}, Nairobi</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{locum.yearsExperience || 0} years experience</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BriefcaseMedical className="h-3.5 w-3.5 shrink-0" />
                <span>{locum.totalShiftsCompleted || 0} shifts completed</span>
              </div>
              {locum.preferredRatePerShift && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatCurrency(locum.preferredRatePerShift)} preferred rate</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>Reg. {locum.registrationBody?.replace("_", " ")} · {locum.registrationNumber}</span>
              </div>
            </div>

            <Button className="w-full mt-2" asChild>
              <Link href={`/clinic/shifts/new?specialtyId=${locum.primarySpecialtyId}`}>
                Post a Shift for This Specialty
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Right column — details */}
        <div className="md:col-span-2 space-y-4">
          {/* Bio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Professional Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locum.bio ? (
                <p className="text-sm text-foreground/80 leading-relaxed">{locum.bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Document Verification
              </CardTitle>
              <CardDescription className="text-xs">
                {isVerified
                  ? "All documents reviewed and approved by LocumLink."
                  : "Verification in progress."}
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              <DocStatus label="National ID / Passport" url={(locum as any).idDocumentUrl} />
              <DocStatus label="Practicing Certificate" url={(locum as any).practicingCertUrl} />
              <DocStatus label="Registration Certificate" url={(locum as any).registrationCertUrl} />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Platform Verification</span>
                {isVerified ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {locum.verificationStatus === "pending" ? "Pending Review" : locum.verificationStatus}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ratings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" /> Reviews from Clinics
              </CardTitle>
              {avgRating !== null && (
                <CardDescription className="flex items-center gap-2 text-sm">
                  <StarRating value={avgRating} />
                  <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">· {ratings.length} review{ratings.length !== 1 ? "s" : ""}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {ratingsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center italic">
                  No reviews yet. This locum is new to the platform.
                </p>
              ) : (
                <div className="space-y-4">
                  {ratings.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StarRating value={r.rating} />
                          <span className="text-sm font-semibold">{r.rating}/5</span>
                        </div>
                        {r.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(r.createdAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-foreground/75 italic border-l-2 border-primary/20 pl-3">
                          "{r.comment}"
                        </p>
                      )}
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
