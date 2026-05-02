import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Clock, CheckCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const BASE_URL = import.meta.env.BASE_URL as string;

const TYPE_COLORS: Record<string, string> = {
  application_update: "bg-blue-500",
  booking_confirmed: "bg-emerald-500",
  payment_received: "bg-green-600",
  shift_reminder: "bg-amber-500",
  verification_update: "bg-purple-500",
  dispute_update: "bg-red-500",
  new_shift: "bg-cyan-500",
};

export default function LocumNotifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}api/notifications/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications?.data?.filter(n => n.status !== "read").length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Updates on your applications, bookings, and payments.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount} unread</Badge>
          )}
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-6">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : notifications?.data?.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-foreground">You're all caught up</h3>
              <p className="text-muted-foreground mt-2">No new notifications at this time.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.data?.map((notification) => {
                const isUnread = notification.status !== "read";
                const dotColor = TYPE_COLORS[notification.type ?? ""] ?? "bg-primary";
                return (
                  <div
                    key={notification.id}
                    className={`p-5 transition-colors hover:bg-muted/30 flex gap-4 ${isUnread ? "bg-primary/5" : ""}`}
                  >
                    <div className="mt-1.5 shrink-0">
                      {isUnread ? (
                        <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                      ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {notification.createdAt && formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isUnread ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                        {notification.content}
                      </p>
                      {notification.type && (
                        <Badge variant="outline" className="text-xs capitalize mt-1">
                          {notification.type.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkRead(notification.id)}
                        className="h-8 w-8 shrink-0 mt-0.5"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
