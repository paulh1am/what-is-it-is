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
      className="text-sm transition-opacity disabled:opacity-40"
      style={{
        color: "var(--text-muted)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
      }}
    >
      {loading ? "creating game..." : "play live →"}
    </button>
  );
}
