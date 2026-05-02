import { Router } from "express";
import { db } from "@workspace/db";
import { disputesTable, locumsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RaiseDisputeBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/disputes", authenticate, async (req, res) => {
  const parse = RaiseDisputeBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", details: parse.error.message });
    return;
  }
  const { userId, role } = (req as any).user;
  try {
    const insertData: Record<string, any> = {
      bookingId: parse.data.bookingId,
      disputeType: parse.data.disputeType as any,
      description: parse.data.description,
      evidenceUrls: parse.data.evidenceUrls,
    };
    if (role === "locum") {
      const [locum] = await db.select().from(locumsTable).where(eq(locumsTable.userId, userId)).limit(1);
      if (locum) insertData.raisedByLocumId = locum.id;
    } else {
      insertData.raisedByClinicId = userId;
    }
    const [dispute] = await db.insert(disputesTable).values(insertData as any).returning();
    res.status(201).json(dispute);
  } catch (err) {
    req.log.error({ err }, "Raise dispute error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/disputes", authenticate, async (req, res) => {
  try {
    const data = await db.select().from(disputesTable).limit(20);
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "List disputes error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/disputes/:id", authenticate, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, id)).limit(1);
    if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
    res.json(dispute);
  } catch (err) {
    req.log.error({ err }, "Get dispute error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
