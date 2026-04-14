"use server";

import { db } from "@/db";
import { submissions, whatIs, itIs, poems } from "@/db/schema";
import { eq, gte, or } from "drizzle-orm";

// ---- Types ----

export type CardBatch = {
  sessionToken: string;
  whatIsCards: string[];
  itIsCards: string[];
};

// ---- Validation ----

function isValidCard(text: string): boolean {
  const t = text.trim();
  if (t.length <= 1) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  if (/^test[?.!]?$/i.test(t)) return false;
  return true;
}

// ---- 3.2 saveSubmission ----

export async function saveSubmission(batch: CardBatch) {
  const allCards = [...batch.whatIsCards, ...batch.itIsCards];
  if (allCards.some((text) => !isValidCard(text))) {
    throw new Error("One or more cards failed validation.");
  }
  const [submission] = await db
    .insert(submissions)
    .values({ sessionToken: batch.sessionToken })
    .returning();

  await db.insert(whatIs).values(
    batch.whatIsCards.map((text) => ({ text, submissionId: submission.id }))
  );

  await db.insert(itIs).values(
    batch.itIsCards.map((text) => ({ text, submissionId: submission.id }))
  );

  return submission.id;
}

// ---- 3.3 getPairingPool ----

type TimeWindow = "all" | "year" | "month" | "week";

function timeWindowCutoff(window: TimeWindow): Date | null {
  const now = new Date();
  if (window === "all") return null;
  if (window === "year") return new Date(now.getFullYear(), 0, 1);
  if (window === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (window === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  return null;
}

export async function getPairingPool(window: TimeWindow = "all") {
  const cutoff = timeWindowCutoff(window);

  const whatIsPool = cutoff
    ? await db.select().from(whatIs).where(gte(whatIs.createdAt, cutoff))
    : await db.select().from(whatIs);

  const itIsPool = cutoff
    ? await db.select().from(itIs).where(gte(itIs.createdAt, cutoff))
    : await db.select().from(itIs);

  return { whatIsPool, itIsPool };
}

// ---- 3.4 generatePoems ----

export async function generatePoems(
  submissionId: number,
  window: TimeWindow = "all",
  allowDoubles: boolean = true
) {
  const { whatIsPool, itIsPool } = await getPairingPool(window);

  const myWhatIs = await db
    .select()
    .from(whatIs)
    .where(eq(whatIs.submissionId, submissionId));

  const myItIs = await db
    .select()
    .from(itIs)
    .where(eq(itIs.submissionId, submissionId));

  // Filter pool to exclude the user's own cards if doubles not allowed
  const whatIsCandidates = allowDoubles
    ? whatIsPool
    : whatIsPool.filter((w) => w.submissionId !== submissionId);

  const itIsCandidates = allowDoubles
    ? itIsPool
    : itIsPool.filter((i) => i.submissionId !== submissionId);

  const shuffle = <T>(arr: T[]): T[] =>
    [...arr].sort(() => Math.random() - 0.5);

  const shuffledItIs = shuffle(itIsCandidates);
  const shuffledWhatIs = shuffle(whatIsCandidates);

  const pairings: { whatIsId: number; itIsId: number }[] = [];

  // Pair each of the user's "what is" with a random "it is" from the pool
  myWhatIs.forEach((w, i) => {
    const match = shuffledItIs[i % shuffledItIs.length];
    if (match) pairings.push({ whatIsId: w.id, itIsId: match.id });
  });

  // Pair each of the user's "it is" with a random "what is" from the pool
  myItIs.forEach((it, i) => {
    const match = shuffledWhatIs[i % shuffledWhatIs.length];
    if (match) pairings.push({ whatIsId: match.id, itIsId: it.id });
  });

  const inserted = await db.insert(poems).values(pairings).returning();
  return inserted;
}

// ---- 3.5 getResults ----

export async function getResults(submissionId: number) {
  return db
    .select({
      poemId: poems.id,
      whatIsText: whatIs.text,
      itIsText: itIs.text,
    })
    .from(poems)
    .innerJoin(whatIs, eq(poems.whatIsId, whatIs.id))
    .innerJoin(itIs, eq(poems.itIsId, itIs.id))
    .where(or(eq(whatIs.submissionId, submissionId), eq(itIs.submissionId, submissionId)))
    .orderBy(poems.id);
}

// ---- 3.6 likePoem ----

export async function likePoem(poemId: number) {
  await db
    .update(poems)
    .set({ inGallery: true, likes: 1 })
    .where(eq(poems.id, poemId));
}

// ---- 3.6 upvotePoem ----

export async function upvotePoem(poemId: number, currentLikes: number) {
  await db
    .update(poems)
    .set({ likes: currentLikes + 1 })
    .where(eq(poems.id, poemId));
}
