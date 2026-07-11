import { Router } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateTemplateBody,
  ListTemplatesQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /templates
router.get("/templates", async (req, res) => {
  const parsed = ListTemplatesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Paramètres invalides" });
  }

  const { categorie } = parsed.data;

  const templates = categorie
    ? await db
        .select()
        .from(templatesTable)
        .where(eq(templatesTable.categorie, categorie))
        .orderBy(desc(templatesTable.estDefaut), desc(templatesTable.createdAt))
    : await db
        .select()
        .from(templatesTable)
        .orderBy(desc(templatesTable.estDefaut), desc(templatesTable.createdAt));

  return res.json(templates.map(serializeTemplate));
});

// POST /templates
router.post("/templates", async (req, res) => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const [created] = await db
    .insert(templatesTable)
    .values({
      nom: parsed.data.nom,
      categorie: parsed.data.categorie,
      texte: parsed.data.texte,
      estDefaut: false,
    })
    .returning();

  return res.status(201).json(serializeTemplate(created));
});

function serializeTemplate(t: typeof templatesTable.$inferSelect) {
  return {
    id: t.id,
    nom: t.nom,
    categorie: t.categorie,
    texte: t.texte,
    estDefaut: t.estDefaut,
    createdAt: t.createdAt.toISOString(),
  };
}

export default router;
