"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/actions";

export function PlayLiveButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    const code = await createSession();
    router.push(`/session/${code}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs transition-opacity disabled:opacity-40"
      style={{
        color: "var(--text)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        border: "1px solid var(--text)",
        borderRadius: "6px",
        padding: "4px 14px",
        background: "var(--card-it)",
        cursor: loading ? "default" : "pointer",
      }}
    >
      {loading ? "creating game..." : "play live →"}
    </button>
  );
}
