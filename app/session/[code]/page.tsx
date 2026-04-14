import { getSessionStatus } from "@/app/actions";
import { ShareButton } from "./ShareButton";
import { LobbyClient } from "./LobbyClient";
import Link from "next/link";
import { headers } from "next/headers";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getSessionStatus(code);

  if (!session) {
    return (
      <main
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: "var(--bg)" }}
      >
        <p
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          session not found.
        </p>
        <Link
          href="/"
          className="mt-4 text-sm"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}
        >
          ← back home
        </Link>
      </main>
    );
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const shareUrl = `${protocol}://${host}/session/${code}`;

  return (
    <main
      className="flex flex-col items-center min-h-screen px-4 pt-16 pb-32"
      style={{ background: "var(--bg)" }}
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <h1
          className="text-3xl mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          what is / it is
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            fontStyle: "italic",
            fontFamily: "var(--font-serif)",
          }}
        >
          live game
        </p>
      </div>

      {/* Session code + share */}
      <div
        className="w-full max-w-sm mb-8 flex items-center justify-between"
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-serif)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "2px",
            }}
          >
            game code
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1.6rem",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "0.15em",
            }}
          >
            {code}
          </div>
        </div>
        <ShareButton url={shareUrl} code={code} />
      </div>

      {/* Divider */}
      <div
        className="w-full max-w-sm mb-8"
        style={{ height: "1px", background: "var(--border)" }}
      />

      {/* Lobby client: player count + card form */}
      <LobbyClient
        code={code}
        sessionId={session.sessionId}
        initialPlayerCount={session.playerCount}
        initialStatus={session.status}
      />
    </main>
  );
}
