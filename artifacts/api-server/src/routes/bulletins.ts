import { Router } from "express";
import { db } from "@workspace/db";
import { bulletinsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  CreateBulletinBody,
  UpdateBulletinBody,
  GetBulletinParams,
  UpdateBulletinParams,
  DeleteBulletinParams,
  DuplicateBulletinParams,
  ListBulletinsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /bulletins
router.get("/bulletins", async (req, res) => {
  const parsed = ListBulletinsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Paramètres invalides" });
  }
  const { type, limit = 50, offset = 0 } = parsed.data;

  const query = db
    .select()
    .from(bulletinsTable)
    .orderBy(desc(bulletinsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const bulletins = type
    ? await db
        .select()
        .from(bulletinsTable)
        .where(eq(bulletinsTable.type, type))
        .orderBy(desc(bulletinsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : await query;

  return res.json(bulletins.map(serializeBulletin));
});

// GET /bulletins/stats
router.get("/bulletins/stats", async (req, res) => {
  const all = await db
    .select()
    .from(bulletinsTable)
    .orderBy(desc(bulletinsTable.createdAt));

  const parType: Record<string, number> = {};
  for (const b of all) {
    parType[b.type] = (parType[b.type] || 0) + 1;
  }

  const recents = all.slice(0, 5).map(serializeBulletin);

  return res.json({ total: all.length, parType, recents });
});

// GET /bulletins/:id
router.get("/bulletins/:id", async (req, res) => {
  const parsed = GetBulletinParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "ID invalide" });

  const [bulletin] = await db
    .select()
    .from(bulletinsTable)
    .where(eq(bulletinsTable.id, parsed.data.id));

  if (!bulletin) return res.status(404).json({ error: "Bulletin introuvable" });

  return res.json(serializeBulletin(bulletin));
});

// POST /bulletins
router.post("/bulletins", async (req, res) => {
  const parsed = CreateBulletinBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const data = parsed.data;
  const [created] = await db
    .insert(bulletinsTable)
    .values({
      type: data.type,
      bulletinDate: data.bulletinDate,
      periodLabel: data.periodLabel,
      validiteLabel: data.validiteLabel,
      heureLabel: data.heureLabel ?? null,
      situationGenerale: data.situationGenerale as any,
      donneesVilles: (data.donneesVilles ?? []) as any,
      vigilanceNiveaux: (data.vigilanceNiveaux ?? []) as any,
    })
    .returning();

  return res.status(201).json(serializeBulletin(created));
});

// PUT /bulletins/:id
router.put("/bulletins/:id", async (req, res) => {
  const paramsParsed = UpdateBulletinParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "ID invalide" });

  const bodyParsed = UpdateBulletinBody.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.message });
  }

  const data = bodyParsed.data;
  const [updated] = await db
    .update(bulletinsTable)
    .set({
      type: data.type,
      bulletinDate: data.bulletinDate,
      periodLabel: data.periodLabel,
      validiteLabel: data.validiteLabel,
      heureLabel: data.heureLabel ?? null,
      situationGenerale: data.situationGenerale as any,
      donneesVilles: (data.donneesVilles ?? []) as any,
      vigilanceNiveaux: (data.vigilanceNiveaux ?? []) as any,
      updatedAt: new Date(),
    })
    .where(eq(bulletinsTable.id, paramsParsed.data.id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Bulletin introuvable" });

  return res.json(serializeBulletin(updated));
});

// DELETE /bulletins/:id
router.delete("/bulletins/:id", async (req, res) => {
  const parsed = DeleteBulletinParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "ID invalide" });

  const [deleted] = await db
    .delete(bulletinsTable)
    .where(eq(bulletinsTable.id, parsed.data.id))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Bulletin introuvable" });

  return res.status(204).send();
});

// POST /bulletins/:id/duplicate
router.post("/bulletins/:id/duplicate", async (req, res) => {
  const parsed = DuplicateBulletinParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "ID invalide" });

  const [original] = await db
    .select()
    .from(bulletinsTable)
    .where(eq(bulletinsTable.id, parsed.data.id));

  if (!original) return res.status(404).json({ error: "Bulletin introuvable" });

  // Advance date by 1 day
  const origDate = new Date(original.bulletinDate);
  origDate.setDate(origDate.getDate() + 1);
  const newDate = origDate.toISOString().split("T")[0];

  const [created] = await db
    .insert(bulletinsTable)
    .values({
      type: original.type,
      bulletinDate: newDate,
      periodLabel: original.periodLabel,
      validiteLabel: original.validiteLabel,
      heureLabel: original.heureLabel,
      situationGenerale: original.situationGenerale as any,
      donneesVilles: original.donneesVilles as any,
      vigilanceNiveaux: original.vigilanceNiveaux as any,
    })
    .returning();

  return res.status(201).json(serializeBulletin(created));
});

function serializeBulletin(b: typeof bulletinsTable.$inferSelect) {
  return {
    id: b.id,
    type: b.type,
    bulletinDate: b.bulletinDate,
    periodLabel: b.periodLabel,
    validiteLabel: b.validiteLabel,
    heureLabel: b.heureLabel,
    situationGenerale: b.situationGenerale,
    donneesVilles: b.donneesVilles,
    vigilanceNiveaux: b.vigilanceNiveaux,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export default router;
