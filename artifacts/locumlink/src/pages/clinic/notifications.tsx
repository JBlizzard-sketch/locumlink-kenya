import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, Clock, CheckCheck, ActivitySquare, CalendarCheck, ShieldCheck, AlertTriangle, DollarSign, UserCheck } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";

function getClinicNotifUrl(type: string, metadata: any): string | null {
  if (type === "application_received" && metadata?.shiftId) return `/clinic/shifts/${metadata.shiftId}`;
  if (type === "application_withdrawn" && metadata?.shiftId) return `/clinic/shifts/${metadata.shiftId}`;
  if (type === "booking_updated" && metadata?.bookingId) return `/clinic/bookings/${metadata.bookingId}`;
  if (type === "dispute_opened" || type === "dispute_resolved") return `/clinic/bookings`;
  if (type === "credential_verified" || type === "credential_rejected") return `/clinic/profile`;
  if (type === "payment_released") return `/clinic/analytics`;
  return null;
}

const BASE_URL = import.meta.env.BASE_URL as string;

const TYPE_META: Record<string, { color: string; Icon: React.ElementType; label: string }> = {
  application_received:  { color: "bg-blue-500",    Icon: ActivitySquare, label: "New Application"   },
  application_shortlisted:{ color: "bg-cyan-500",   Icon: UserCheck,      label: "Shortlisted"       },
  application_confirmed: { color: "bg-emerald-500",  Icon: CalendarCheck,  label: "Booking Confirmed" },
  application_rejected:  { color: "bg-red-400",      Icon: ActivitySquare, label: "Application"       },
  application_withdrawn: { color: "bg-orange-400",   Icon: ActivitySquare, label: "Withdrawn"         },
  booking_updated:       { color: "bg-amber-500",    Icon: CalendarCheck,  label: "Booking Updated"   },
  payment_released:      { color: "bg-green-600",    Icon: DollarSign,     label: "Payment"           },
  shift_cancelled:       { color: "bg-red-500",      Icon: AlertTriangle,  label: "Shift Cancelled"   },
  dispute_opened:        { color: "bg-red-600",      Icon: AlertTriangle,  label: "Dispute"           },
  dispute_resolved:      { color: "bg-purple-500",   Icon: AlertTriangle,  label: "Dispute Resolved"  },
  credential_verified:   { color: "bg-green-500",    Icon: ShieldCheck,    label: "Verification"      },
  credential_rejected:   { color: "bg-destructive",  Icon: ShieldCheck,    label: "Verification"      },
};

export default function ClinicNotifications() {
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch { /* ignore */ }
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
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications?.data?.filter(n => n.status !== "read").length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Applications, bookings, verifications, and platform alerts.</p>
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
          ) : (notifications?.data?.length ?? 0) === 0 ? (
            <div className="text-center py-20">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-foreground">All caught up</h3>
              <p className="text-muted-foreground mt-2">No notifications at this time.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications?.data?.map((notification) => {
                const isUnread = notification.status !== "read";
                const meta = TYPE_META[notification.type ?? ""] ?? { color: "bg-primary", Icon: Bell, label: notification.type?.replace(/_/g, " ") ?? "" };
                const { color, Icon, label } = meta;
                const url = getClinicNotifUrl(notification.type ?? "", (notification as any).metadata);
                const rowContent = (
                  <>
                    <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isUnread ? color : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${isUnread ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{label}</Badge>
                        {url && <span className="text-xs text-primary font-medium">View →</span>}
                      </div>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMarkRead(notification.id); }}
                        className="h-8 w-8 shrink-0 mt-0.5"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                );
                return url ? (
                  <Link
                    key={notification.id}
                    href={url}
                    onClick={() => isUnread && handleMarkRead(notification.id)}
                    className={`p-5 flex gap-4 cursor-pointer transition-colors hover:bg-muted/40 ${isUnread ? "bg-primary/5" : ""}`}
                  >
                    {rowContent}
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={`p-5 flex gap-4 transition-colors hover:bg-muted/30 ${isUnread ? "bg-primary/5" : ""}`}
                  >
                    {rowContent}
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
