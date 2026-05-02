import { Router } from "express";
import { db } from "@workspace/db";
import { specialtiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/specialties", async (req, res) => {
  try {
    const data = await db.select().from(specialtiesTable).orderBy(specialtiesTable.category, specialtiesTable.name);
    res.json({ data, total: data.length });
  } catch (err) {
    req.log.error({ err }, "List specialties error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/specialties/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [specialty] = await db.select().from(specialtiesTable).where(eq(specialtiesTable.id, id)).limit(1);
    if (!specialty) { res.status(404).json({ error: "Specialty not found" }); return; }
    res.json(specialty);
  } catch (err) {
    req.log.error({ err }, "Get specialty error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
