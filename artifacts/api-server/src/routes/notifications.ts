import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, notificationPreferencesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { UpdateNotificationPreferencesBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/notifications", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const query = db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId));
    const data = await query.limit(limit).offset(offset);
    const unreadCount = data.filter(n => !n.readAt).length;
    res.json({ data, total: data.length, unreadCount });
  } catch (err) {
    req.log.error({ err }, "List notifications error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications/preferences", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    let [prefs] = await db.select().from(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId)).limit(1);
    if (!prefs) {
      [prefs] = await db.insert(notificationPreferencesTable).values({ userId }).returning();
    }
    res.json(prefs);
  } catch (err) {
    req.log.error({ err }, "Get prefs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/preferences", authenticate, async (req, res) => {
  const { userId } = (req as any).user;
  const parse = UpdateNotificationPreferencesBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }
  try {
    let [prefs] = await db.select().from(notificationPreferencesTable).where(eq(notificationPreferencesTable.userId, userId)).limit(1);
    if (!prefs) {
      [prefs] = await db.insert(notificationPreferencesTable).values({ userId, ...parse.data }).returning();
    } else {
      [prefs] = await db.update(notificationPreferencesTable)
        .set({ ...parse.data, updatedAt: new Date() })
        .where(eq(notificationPreferencesTable.userId, userId)).returning();
    }
    res.json(prefs);
  } catch (err) {
    req.log.error({ err }, "Update prefs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/:id/read", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.update(notificationsTable).set({ status: "read", readAt: new Date() }).where(eq(notificationsTable.id, id));
    res.json({ message: "Marked as read" });
  } catch (err) {
    req.log.error({ err }, "Mark read error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
