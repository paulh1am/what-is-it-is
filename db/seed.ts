import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { submissions, whatIs, itIs } from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function seed() {
  // Create a starter submission
  const [submission] = await db
    .insert(submissions)
    .values({ sessionToken: "seed" })
    .returning();

  // Seed "what is..." cards
  await db.insert(whatIs).values([
    { text: "a quiet morning", submissionId: submission.id },
    { text: "a borrowed coat", submissionId: submission.id },
    { text: "an empty station", submissionId: submission.id },
    { text: "a broken clock", submissionId: submission.id },
    { text: "a warm window", submissionId: submission.id },
    { text: "a faded map", submissionId: submission.id },
    { text: "a heavy door", submissionId: submission.id },
    { text: "a small fire", submissionId: submission.id },
  ]);

  // Seed "it is..." cards
  await db.insert(itIs).values([
    { text: "a slow forgetting", submissionId: submission.id },
    { text: "a borrowed light", submissionId: submission.id },
    { text: "an old argument", submissionId: submission.id },
    { text: "a patient silence", submissionId: submission.id },
    { text: "a sudden distance", submissionId: submission.id },
    { text: "a familiar ache", submissionId: submission.id },
    { text: "a brief return", submissionId: submission.id },
    { text: "a clean beginning", submissionId: submission.id },
  ]);

  console.log("Seeded successfully.");
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
