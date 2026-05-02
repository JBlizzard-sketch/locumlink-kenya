import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { addClient, removeClient, startKeepAlive } from "../lib/sse";

const router = Router();

// Start keep-alive pings (30s interval)
startKeepAlive(30_000);

/**
 * GET /api/events
 * SSE stream — authenticated users receive real-time push events
 */
router.get("/events", authenticate, (req, res) => {
  const { userId } = (req as any).user;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId, ts: Date.now() })}\n\n`);

  addClient(userId, res);

  req.on("close", () => {
    removeClient(userId, res);
  });
});

export default router;
