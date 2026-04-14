"use server";

import { db } from "@/db";
import { gameSessions, submissions, whatIs, itIs, poems } from "@/db/schema";
import { eq, gte, or, inArray } from "drizzle-orm";

// ---- Types ----

export type CardBatch = {
  sessionToken: string;
  whatIsCards: string[];
  itIsCards: string[];
  gameSessionId?: number;
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
    .values({
      sessionToken: batch.sessionToken,
      gameSessionId: batch.gameSessionId ?? null,
    })
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

async function getSessionPool(gameSessionId: number) {
  const sessionSubmissionIds = (
    await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.gameSessionId, gameSessionId))
  ).map((r) => r.id);

  if (sessionSubmissionIds.length === 0) return { whatIsPool: [], itIsPool: [] };

  const whatIsPool = await db
    .select()
    .from(whatIs)
    .where(inArray(whatIs.submissionId, sessionSubmissionIds));

  const itIsPool = await db
    .select()
    .from(itIs)
    .where(inArray(itIs.submissionId, sessionSubmissionIds));

  return { whatIsPool, itIsPool };
}

// ---- 3.4 generatePoems ----

export async function generatePoems(
  submissionId: number,
  window: TimeWindow = "all",
  gameSessionId?: number
) {
  const { itIsPool } = gameSessionId
    ? await getSessionPool(gameSessionId)
    : await getPairingPool(window);

  const myWhatIs = await db
    .select()
    .from(whatIs)
    .where(eq(whatIs.submissionId, submissionId));

  const othersItIs = itIsPool.filter((i) => i.submissionId !== submissionId);

  const shuffle = <T>(arr: T[]): T[] =>
    [...arr].sort(() => Math.random() - 0.5);

  const shuffledOthers = shuffle(othersItIs);
  const shuffledAll = shuffle(itIsPool);

  // In session mode: blend based on player count so cross-pollination feels intentional.
  // 2-player game → prefer others 3/4 of draws; 3+ players → 1/2.
  // Solo mode → always prefer others, fall back to own only if pool is empty.
  const otherPlayerCount = new Set(othersItIs.map((i) => i.submissionId)).size;
  const otherRatio = !gameSessionId
    ? 1
    : otherPlayerCount === 1
    ? 0.75
    : 0.5;

  // Build a deduplicated pool of the right size:
  // take ~otherRatio of slots from others, fill the rest from remaining cards, then shuffle.
  const targetOtherCount = Math.round(myWhatIs.length * otherRatio);
  const fromOthers = shuffledOthers.slice(0, Math.min(targetOtherCount, shuffledOthers.length));
  const usedIds = new Set(fromOthers.map((c) => c.id));
  const fromRemainder = shuffledAll.filter((c) => !usedIds.has(c.id));
  const needed = Math.max(0, myWhatIs.length - fromOthers.length);
  const finalPool = shuffle([...fromOthers, ...fromRemainder.slice(0, needed)]);

  const pairings: { whatIsId: number; itIsId: number }[] = [];

  myWhatIs.forEach((w, i) => {
    const match = finalPool[i];
    if (match) pairings.push({ whatIsId: w.id, itIsId: match.id });
  });

  if (pairings.length === 0) return [];
  const inserted = await db.insert(poems).values(pairings).returning();
  return inserted;
}

// ---- 3.4b reshufflePoems ----

export async function reshufflePoems(submissionId: number, window: TimeWindow = "all") {
  const myWhatIsIds = (
    await db.select({ id: whatIs.id }).from(whatIs).where(eq(whatIs.submissionId, submissionId))
  ).map((r) => r.id);

  const myItIsIds = (
    await db.select({ id: itIs.id }).from(itIs).where(eq(itIs.submissionId, submissionId))
  ).map((r) => r.id);

  const conditions = [];
  if (myWhatIsIds.length > 0) conditions.push(inArray(poems.whatIsId, myWhatIsIds));
  if (myItIsIds.length > 0) conditions.push(inArray(poems.itIsId, myItIsIds));
  if (conditions.length > 0) {
    await db.delete(poems).where(or(...conditions));
  }

  return generatePoems(submissionId, window);
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

// ---- 6.3 createSession ----

const CODE_CHARS = "BCDFGHJKMNPQRSTVWXYZ234679";

function generateCode(length = 6): string {
  return Array.from(
    { length },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

export async function createSession(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .where(eq(gameSessions.code, code));
    if (existing.length === 0) {
      await db.insert(gameSessions).values({ code });
      return code;
    }
  }
  throw new Error("Could not generate a unique session code.");
}

// ---- 6.4 getSessionStatus ----

export async function getSessionStatus(code: string) {
  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.code, code));

  if (!session) return null;

  const players = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.gameSessionId, session.id));

  return {
    sessionId: session.id,
    status: session.status as "waiting" | "active",
    playerCount: players.length,
  };
}

// ---- 6.5 startSession ----

export async function startSession(code: string) {
  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.code, code));

  if (!session) throw new Error("Session not found.");

  await db
    .update(gameSessions)
    .set({ status: "active" })
    .where(eq(gameSessions.id, session.id));

  const sessionSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.gameSessionId, session.id));

  for (const sub of sessionSubmissions) {
    await generatePoems(sub.id, "all", session.id);
  }

  return session.id;
}

// ---- 6.x getSessionPoems ----

export async function getSessionPoems(code: string) {
  const [session] = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.code, code));

  if (!session) return [];

  const sessionSubmissionIds = (
    await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.gameSessionId, session.id))
  ).map((r) => r.id);

  if (sessionSubmissionIds.length === 0) return [];

  return db
    .select({
      poemId: poems.id,
      whatIsText: whatIs.text,
      itIsText: itIs.text,
    })
    .from(poems)
    .innerJoin(whatIs, eq(poems.whatIsId, whatIs.id))
    .innerJoin(itIs, eq(poems.itIsId, itIs.id))
    .where(
      or(
        inArray(whatIs.submissionId, sessionSubmissionIds),
        inArray(itIs.submissionId, sessionSubmissionIds)
      )
    )
    .orderBy(poems.id);
}
