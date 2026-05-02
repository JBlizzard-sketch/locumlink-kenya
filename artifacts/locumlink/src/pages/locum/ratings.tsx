import { useGetLocumRatings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function LocumRatings() {
  // Using ID 0 as a placeholder, normally would come from auth context or specific hook for 'my' ratings
  const { data: ratingsData, isLoading } = useGetLocumRatings(0);

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < score ? "fill-accent text-accent" : "text-muted"}`} />
    ));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-serif tracking-tight">My Ratings</h1>
        <p className="text-muted-foreground mt-1">Feedback from clinics you've worked with.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : ratingsData?.data?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No ratings yet</h3>
          <p className="text-muted-foreground mt-2">Complete a shift to receive your first rating.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {ratingsData?.data?.map((rating) => (
            <Card key={rating.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex">{renderStars(rating.overallScore)}</div>
                    <span className="font-bold">{rating.overallScore.toFixed(1)}</span>
                  </div>
                  {rating.createdAt && (
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(rating.createdAt), 'MMMM dd, yyyy')}
                    </span>
                  )}
                </div>
                
                {rating.comment ? (
                  <div className="flex gap-3 text-muted-foreground">
                    <MessageSquare className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                    <p className="text-sm italic">"{rating.comment}"</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No comment provided.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}