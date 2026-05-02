import { useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Clock } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";

export default function LocumNotifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ data: { notificationIds: [id] } });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (e) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (!notifications?.data) return;
    const unreadIds = notifications.data.filter(n => n.status === 'unread').map(n => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      await markRead.mutateAsync({ data: { notificationIds: unreadIds } });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Updates on your applications, bookings, and payments.</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead} disabled={markRead.isPending}>
          <Check className="h-4 w-4 mr-2" /> Mark all as read
        </Button>
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
              {notifications?.data?.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-6 transition-colors hover:bg-muted/30 flex gap-4 ${notification.status === 'unread' ? 'bg-primary/5' : ''}`}
                >
                  <div className="mt-1">
                    {notification.status === 'unread' ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                    ) : (
                      <Bell className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      {notification.createdAt && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${notification.status === 'unread' ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                      {notification.content}
                    </p>
                  </div>
                  {notification.status === 'unread' && (
                    <Button variant="ghost" size="icon" onClick={() => handleMarkRead(notification.id)} className="h-8 w-8 shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}