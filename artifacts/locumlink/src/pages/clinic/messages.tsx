import { useListMessageConversations, getListMessageConversationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  UserRound,
  Calendar,
  CheckCircle2,
  Clock,
  FileSignature,
  ChevronRight,
} from "lucide-react";

function formatTime(ts: string) {
  const d = parseISO(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 h-4 gap-0.5"><Calendar className="h-2.5 w-2.5" /> Confirmed</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4 gap-0.5"><Clock className="h-2.5 w-2.5" /> In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-4 gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> Completed</Badge>;
    case "pending_contract":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] px-1.5 py-0 h-4 gap-0.5"><FileSignature className="h-2.5 w-2.5" /> Pending</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">{status}</Badge>;
  }
}

export default function ClinicMessages() {
  const { data, isLoading } = useListMessageConversations({
    query: { refetchInterval: 15_000, queryKey: getListMessageConversationsQueryKey() },
  });

  const conversations = data?.data ?? [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">Your booking conversations with locum doctors.</p>
        </div>
        {totalUnread > 0 && (
          <Badge className="gap-1.5 text-sm px-3 py-1">
            <MessageSquare className="h-4 w-4" />
            {totalUnread} unread
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground/70">
              Once you confirm a booking with a locum, you can message them directly from the booking page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.bookingId} href={`/clinic/bookings/${conv.bookingId}`}>
              <Card className={`transition-colors hover:bg-muted/40 cursor-pointer ${conv.unreadCount > 0 ? "border-primary/40 bg-primary/5" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${conv.unreadCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <UserRound className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm truncate">
                            Dr. {conv.locumName}
                          </span>
                          {statusBadge(conv.bookingStatus)}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatTime(conv.latestMessage.createdAt)}
                          </span>
                        </div>
                      </div>
                      {conv.shift && (
                        <p className="text-xs text-muted-foreground mb-1 truncate">
                          {conv.shift.title} · {conv.shift.shiftDate ? format(parseISO(conv.shift.shiftDate), "EEE d MMM") : ""}
                        </p>
                      )}
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {conv.latestMessage.isFromMe ? (
                          <span className="text-muted-foreground text-xs mr-1">You:</span>
                        ) : (
                          <span className="text-muted-foreground text-xs mr-1">Dr. {conv.latestMessage.senderName.split(" ")[0]}:</span>
                        )}
                        {conv.latestMessage.body}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
