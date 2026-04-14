import { getResults } from "@/app/actions";
import { ResultCard } from "./ResultCard";
import { ReshuffleButton } from "./ReshuffleButton";
import Link from "next/link";

const VALID_WINDOWS = ["all", "year", "month", "week"] as const;
type TimeWindow = typeof VALID_WINDOWS[number];

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; window?: string; session?: string }>;
}) {
  const { id, window: windowParam, session } = await searchParams;
  const submissionId = id ? parseInt(id) : NaN;
  const timeWindow: TimeWindow = VALID_WINDOWS.includes(windowParam as TimeWindow)
    ? (windowParam as TimeWindow)
    : "all";

  if (isNaN(submissionId)) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
          no results found.
        </p>
        <Link href="/" className="mt-4 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}>
          ← start over
        </Link>
      </main>
    );
  }

  const results = await getResults(submissionId, !!session);

  return (
    <main className="flex flex-col items-center min-h-screen px-4 pt-16 pb-32" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="mb-12 text-center">
        <h1
          className="text-3xl mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          your results
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
          tap each card to reveal
        </p>
      </div>

      {/* Result cards */}
      <div className="w-full max-w-sm flex flex-col gap-6">
        {results.map((result) => (
          <ResultCard
            key={result.poemId}
            poemId={result.poemId}
            whatIsText={result.whatIsText}
            itIsText={result.itIsText}
          />
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center gap-3">
        {session && (
          <Link
            href={`/session/${session}/results`}
            className="text-sm"
            style={{ color: "var(--text)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}
          >
            see all results from this game →
          </Link>
        )}
        {!session && <ReshuffleButton submissionId={submissionId} window={timeWindow} />}
        <Link
          href="/"
          className="text-sm"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}
        >
          ← play again
        </Link>
      </div>
    </main>
  );
}
