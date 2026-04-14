"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSessionStatus, startSession } from "@/app/actions";
import CardForm from "@/app/components/CardForm";

interface LobbyClientProps {
  code: string;
  sessionId: number;
  initialPlayerCount: number;
  initialStatus: "waiting" | "active";
}

export function LobbyClient({
  code,
  sessionId,
  initialPlayerCount,
  initialStatus,
}: LobbyClientProps) {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [status, setStatus] = useState(initialStatus);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const poll = useCallback(async () => {
    const result = await getSessionStatus(code);
    if (!result) return;
    setPlayerCount(result.playerCount);
    setStatus(result.status as "waiting" | "active");
    if (result.status === "active" && submissionId) {
      router.push(`/results?id=${submissionId}&session=${code}`);
    }
  }, [code, submissionId, router]);

  useEffect(() => {
    if (status === "active" && submissionId) {
      router.push(`/results?id=${submissionId}&session=${code}`);
      return;
    }
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [status, submissionId, poll, router, code]);

  async function handleStart() {
    if (starting || playerCount < 2) return;
    setStarting(true);
    await startSession(code);
    if (submissionId) {
      router.push(`/results?id=${submissionId}&session=${code}`);
    } else {
      router.push(`/session/${code}/results`);
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Player count */}
      <div
        className="w-full max-w-sm mb-8 flex items-center justify-between"
        style={{ fontSize: "0.85rem" }}
      >
        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
          {playerCount === 0
            ? "waiting for players..."
            : `${playerCount} player${playerCount !== 1 ? "s" : ""} ready`}
        </span>
        {playerCount >= 2 && !submissionId && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-serif)" }}
          >
            {starting ? "starting..." : "generate poems →"}
          </button>
        )}
      </div>

      {submissionId ? (
        /* Player submitted — waiting for host */
        <div
          className="w-full max-w-sm text-center py-12"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}
        >
          <p className="mb-2">your cards are in.</p>
          <p style={{ fontSize: "0.85rem" }}>waiting for the host to generate poems...</p>
          {playerCount >= 2 && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-6 px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: "var(--text)", color: "var(--bg)", fontFamily: "var(--font-serif)" }}
            >
              {starting ? "starting..." : "generate poems →"}
            </button>
          )}
        </div>
      ) : (
        /* Card entry form — session mode */
        <CardForm
          gameSessionId={sessionId}
          onSubmitComplete={(id) => setSubmissionId(id)}
        />
      )}
    </div>
  );
}
