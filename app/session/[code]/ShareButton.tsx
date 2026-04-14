"use client";

import { useState } from "react";

export function ShareButton({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "what is / it is",
          text: `Join my game! Use code ${code}`,
          url,
        });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        background: "var(--text)",
        color: "var(--bg)",
        fontFamily: "var(--font-serif)",
        opacity: copied ? 0.7 : 1,
      }}
    >
      {copied ? "link copied ✓" : "share game link →"}
    </button>
  );
}
