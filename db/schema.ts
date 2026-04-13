import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whatIs = pgTable("what_is", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const itIs = pgTable("it_is", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const poems = pgTable("poems", {
  id: serial("id").primaryKey(),
  whatIsId: integer("what_is_id").references(() => whatIs.id).notNull(),
  itIsId: integer("it_is_id").references(() => itIs.id).notNull(),
  inGallery: boolean("in_gallery").default(false).notNull(),
  likes: integer("likes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
