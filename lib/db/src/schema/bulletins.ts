import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bulletinsTable = pgTable("bulletins", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // radio | matinal | journaux | ortm | national
  bulletinDate: text("bulletin_date").notNull(),
  periodLabel: text("period_label").notNull(),
  validiteLabel: text("validite_label").notNull(),
  heureLabel: text("heure_label"),
  situationGenerale: jsonb("situation_generale").notNull(),
  donneesVilles: jsonb("donnees_villes").notNull().$type<VilleData[]>(),
  vigilanceNiveaux: jsonb("vigilance_niveaux").notNull().$type<VigilanceData[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type VilleData = {
  nom: string;
  tmax: number | null;
  tmin: number | null;
  directionVent: string | null;
  vitesseVent: number | null;
  condition: string | null;
};

export type VigilanceData = {
  region: string;
  niveau: string;
};

export type SituationGenerale = {
  ciel: string;
  vents: string;
  visibilite: string;
  orages: string | null;
  temperatures: string;
};

export const insertBulletinSchema = createInsertSchema(bulletinsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBulletin = z.infer<typeof insertBulletinSchema>;
export type Bulletin = typeof bulletinsTable.$inferSelect;
