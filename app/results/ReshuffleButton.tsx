"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reshufflePoems } from "@/app/actions";

export function ReshuffleButton({ submissionId, window }: { submissionId: number; window: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReshuffle() {
    if (loading) return;
    setLoading(true);
    await reshufflePoems(submissionId, window as "all" | "year" | "month" | "week");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleReshuffle}
      disabled={loading}
      className="mt-4 text-sm transition-opacity disabled:opacity-40"
      style={{
        color: "var(--text-muted)",
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
      }}
    >
      {loading ? "reshuffling..." : "reshuffle →"}
    </button>
  );
}
