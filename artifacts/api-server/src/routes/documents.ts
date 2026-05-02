import { Router } from "express";
import { db } from "@workspace/db";
import { locumsTable, clinicsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";
import { authenticate } from "../middlewares/auth";
import { sendToUser } from "../lib/sse";

const router = Router();
const storage = new ObjectStorageService();

/** POST /api/storage/uploads/request-url — presigned upload URL */
router.post("/storage/uploads/request-url", authenticate, async (req, res) => {
  try {
    const { name, size, contentType } = req.body as {
      name: string;
      size: number;
      contentType: string;
    };
    if (!name || !size || !contentType) {
      res.status(400).json({ error: "name, size, and contentType are required" });
      return;
    }
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err) {
    req.log.error({ err }, "Request upload URL error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/storage/objects/:objectPath+ — serve uploaded private objects */
router.get("/storage/objects/:objectPath+", authenticate, async (req, res) => {
  try {
    const rawPath = "/" + req.params.objectPath;
    const file = await storage.getObjectEntityFile(rawPath);
    const response = await storage.downloadObject(file);
    const ct = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ct);
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    if (err?.name === "ObjectNotFoundError") {
      res.status(404).json({ error: "File not found" });
    } else {
      req.log.error({ err }, "Serve object error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

/** PATCH /api/locums/:id/documents — save uploaded document URLs after GCS upload */
router.patch("/locums/:id/documents", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { idDocumentUrl, practicingCertUrl, registrationCertUrl } = req.body as {
    idDocumentUrl?: string;
    practicingCertUrl?: string;
    registrationCertUrl?: string;
  };

  try {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (idDocumentUrl) updateData.idDocumentUrl = idDocumentUrl;
    if (practicingCertUrl) updateData.practicingCertUrl = practicingCertUrl;
    if (registrationCertUrl) updateData.registrationCertUrl = registrationCertUrl;

    // Mark as pending verification when docs are submitted
    updateData.verificationStatus = "pending";

    const [locum] = await db.update(locumsTable).set(updateData)
      .where(eq(locumsTable.id, id)).returning();
    if (!locum) { res.status(404).json({ error: "Locum not found" }); return; }

    res.json({ message: "Documents submitted for verification", locum });
  } catch (err) {
    req.log.error({ err }, "Update documents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/clinics/:id/documents — save clinic verification documents */
router.patch("/clinics/:id/documents", authenticate, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { mohLicenceUrl, businessCertUrl, kmpdcLicenceUrl } = req.body as {
    mohLicenceUrl?: string;
    businessCertUrl?: string;
    kmpdcLicenceUrl?: string;
  };

  try {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (mohLicenceUrl) updateData.mohFacilityNumber = mohLicenceUrl;
    if (businessCertUrl) updateData.businessRegistration = businessCertUrl;
    if (kmpdcLicenceUrl) updateData.kmpdc_licence = kmpdcLicenceUrl;
    updateData.verificationStatus = "pending";

    const [clinic] = await db.update(clinicsTable).set(updateData)
      .where(eq(clinicsTable.id, id)).returning();
    if (!clinic) { res.status(404).json({ error: "Clinic not found" }); return; }

    res.json({ message: "Documents submitted for verification", clinic });
  } catch (err) {
    req.log.error({ err }, "Update clinic documents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
