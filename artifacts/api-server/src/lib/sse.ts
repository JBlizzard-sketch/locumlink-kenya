/**
 * Server-Sent Events (SSE) — real-time push notifications to connected clients
 *
 * Each authenticated user gets their own event stream at GET /api/events.
 * The server pushes typed events when bookings change, applications update, etc.
 */

import { Response } from "express";
import { logger } from "./logger";

// userId → set of active SSE response streams
const clients = new Map<number, Set<Response>>();

/**
 * Register a new SSE connection for a user
 */
export function addClient(userId: number, res: Response): void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  logger.info({ userId, total: clients.get(userId)!.size }, "SSE client connected");
}

/**
 * Remove a disconnected SSE stream
 */
export function removeClient(userId: number, res: Response): void {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
  logger.info({ userId }, "SSE client disconnected");
}

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

export interface SseEvent {
  type: SseEventType;
  payload: Record<string, unknown>;
}

/**
 * Send an event to all active streams for a user
 */
export function sendToUser(userId: number, event: SseEvent): void {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(data);
    } catch (err) {
      logger.warn({ err, userId }, "SSE write error — removing client");
      set.delete(res);
    }
  }
}

/**
 * Broadcast an event to all connected users (e.g. platform-wide announcements)
 */
export function broadcast(event: SseEvent): void {
  for (const [userId] of clients) {
    sendToUser(userId, event);
  }
}

/**
 * Keep-alive ping — call this on an interval to prevent proxy timeouts
 */
export function startKeepAlive(intervalMs = 30_000): NodeJS.Timeout {
  return setInterval(() => {
    for (const [userId] of clients) {
      sendToUser(userId, { type: "ping", payload: { ts: Date.now() } });
    }
  }, intervalMs);
}
