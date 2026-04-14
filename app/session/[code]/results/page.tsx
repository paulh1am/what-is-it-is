import { getSessionPoems } from "@/app/actions";
import { ResultCard } from "@/app/results/ResultCard";
import Link from "next/link";

export default async function SessionResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const results = await getSessionPoems(code);

  return (
    <main
      className="flex flex-col items-center min-h-screen px-4 pt-16 pb-32"
      style={{ background: "var(--bg)" }}
    >
      <div className="mb-12 text-center">
        <h1
          className="text-3xl mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          all poems
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
          }}
        >
          game {code} · {results.length} poem{results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {results.length === 0 ? (
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          no poems yet — poems are generated when the host starts the game.
        </p>
      ) : (
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
      )}

      <Link
        href="/"
        className="mt-12 text-sm"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}
      >
        ← play again
      </Link>
    </main>
  );
}
