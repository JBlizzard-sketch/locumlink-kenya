import { useGetMyLocum, useGetLocumRatings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function LocumRatings() {
  const { data: locum, isLoading: locumLoading } = useGetMyLocum();
  const locumId = locum?.id ?? 0;

  const { data: ratingsData, isLoading: ratingsLoading } = useGetLocumRatings(locumId, {
    query: { enabled: !!locumId }
  });

  const isLoading = locumLoading || ratingsLoading;

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < Math.round(score) ? "fill-accent text-accent" : "text-muted-foreground/30"}`} />
    ));
  };

  const avg = ratingsData?.averageScore ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Ratings</h1>
        <p className="text-muted-foreground mt-1">Feedback from clinics you've worked with.</p>
      </div>

      {/* Summary Card */}
      {!isLoading && (ratingsData?.total ?? 0) > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left">
              <div className="text-5xl font-bold text-primary">{avg.toFixed(1)}</div>
              <div className="flex mt-2 justify-center sm:justify-start">{renderStars(avg)}</div>
              <p className="text-sm text-muted-foreground mt-1">{ratingsData?.total} rating{ratingsData?.total !== 1 ? "s" : ""}</p>
            </div>
            <div className="hidden sm:block w-px h-16 bg-border" />
            <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <span>Your average score is used in shift matching. Higher scores increase your visibility to clinics.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (ratingsData?.data?.length ?? 0) === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No ratings yet</h3>
          <p className="text-muted-foreground mt-2">Complete a shift to receive your first rating from a clinic.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {ratingsData?.data?.map((rating) => (
            <Card key={rating.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex">{renderStars(rating.overallScore)}</div>
                    <span className="font-bold text-lg">{rating.overallScore.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">From Clinic</span>
                  </div>
                  {rating.createdAt && (
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(rating.createdAt), 'MMMM dd, yyyy')}
                    </span>
                  )}
                </div>

                {rating.criteria && typeof rating.criteria === 'object' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {Object.entries(rating.criteria as Record<string, number>).map(([key, val]) => (
                      <div key={key} className="bg-muted/40 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                        <div className="flex justify-center">{renderStars(val)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {rating.comment ? (
                  <div className="flex gap-3 text-muted-foreground bg-muted/30 p-4 rounded-lg">
                    <MessageSquare className="h-5 w-5 shrink-0 text-muted-foreground/50 mt-0.5" />
                    <p className="text-sm italic">"{rating.comment}"</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No written comment provided.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
