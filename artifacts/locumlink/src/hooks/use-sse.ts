import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

export type SseEventType =
  | "application_received"
  | "application_shortlisted"
  | "application_confirmed"
  | "application_rejected"
  | "booking_updated"
  | "payment_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "credential_verified"
  | "credential_rejected"
  | "shift_reminder"
  | "ping";

export type SseHandler = (payload: Record<string, unknown>) => void;

/**
 * Connects to /api/events SSE stream while the user is authenticated.
 * Automatically reconnects on disconnect (exponential backoff, max 30s).
 * Calls onEvent for every non-ping server-sent event.
 */
export function useSSE(onEvent?: (type: SseEventType, payload: Record<string, unknown>) => void) {
  const { user } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/events", { withCredentials: true });
    esRef.current = es;

    es.addEventListener("connected", () => {
      backoffRef.current = 1000; // reset backoff on successful connect
    });

    const eventTypes: SseEventType[] = [
      "application_received", "application_shortlisted", "application_confirmed",
      "application_rejected", "booking_updated", "payment_released",
      "dispute_opened", "dispute_resolved", "credential_verified",
      "credential_rejected", "shift_reminder",
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.(type, payload);
        } catch { /* ignore malformed event */ }
      });
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Exponential backoff: 1s → 2s → 4s → ... → 30s
      const delay = Math.min(backoffRef.current, 30_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      retryRef.current = setTimeout(connect, delay);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [user, connect]);
}
