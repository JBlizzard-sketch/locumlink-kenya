import { useEffect, useRef, useState } from "react";
import {
  useListBookingMessages,
  getListBookingMessagesQueryKey,
  useSendBookingMessage,
  useMarkMessagesRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  bookingId: number;
}

function formatMsgTime(ts: string) {
  const d = parseISO(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
}

function rolePill(role: string) {
  if (role === "locum") return "Locum";
  if (role === "clinic_admin") return "Clinic HR";
  return role;
}

export function BookingChat({ bookingId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const msgKey = getListBookingMessagesQueryKey(bookingId);

  const { data, isLoading } = useListBookingMessages(bookingId, {
    query: {
      enabled: !!bookingId,
      queryKey: msgKey,
      refetchInterval: 8000, // poll every 8 s as a lightweight live update
    },
  });

  const sendMutation = useSendBookingMessage();
  const markRead = useMarkMessagesRead();

  const messages = data?.data ?? [];
  const unreadCount = messages.filter(m => !m.isRead && m.senderId !== user?.id).length;

  // Scroll to bottom when messages load/update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark messages as read when panel is viewed
  useEffect(() => {
    if (unreadCount > 0) {
      markRead.mutate({ id: bookingId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: msgKey }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, unreadCount]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMutation.mutateAsync({ id: bookingId, data: { body } });
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: msgKey });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Booking Messages</span>
        {unreadCount > 0 && (
          <Badge className="h-5 px-1.5 text-xs ml-auto">{unreadCount} new</Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          Press Enter to send · Shift+Enter for new line
        </span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[280px] max-h-[420px]">
        {isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading messages…
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground/70">
              Use this thread to coordinate shift details, ask questions, or confirm arrangements.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.senderId === user?.id;
          const showName =
            i === 0 || messages[i - 1].senderId !== msg.senderId;

          return (
            <div key={msg.id} className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
              {showName && (
                <div className={`flex items-center gap-1.5 text-xs text-muted-foreground px-1 ${isMine ? "flex-row-reverse" : ""}`}>
                  <span className="font-medium text-foreground/80">{isMine ? "You" : msg.senderName}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {rolePill(msg.senderRole)}
                  </Badge>
                </div>
              )}
              <div className="flex items-end gap-2">
                <div
                  className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
              <span className={`text-[10px] text-muted-foreground px-1 ${isMine ? "text-right" : ""}`}>
                {formatMsgTime(msg.createdAt as unknown as string)}
                {isMine && msg.isRead && " · Read"}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="border-t px-4 py-3 flex gap-3 items-end bg-muted/10">
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="resize-none min-h-[44px] max-h-[120px] text-sm flex-1"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="shrink-0 h-10 w-10"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
