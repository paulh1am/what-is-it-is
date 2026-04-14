"use client";

import { useState } from "react";
import { likePoem } from "@/app/actions";

const lineSpacing = 26;
const ruledLineColor = "rgba(70, 110, 85, 0.28)";
const marginColor = "rgba(185, 60, 55, 0.35)";
const marginGradient = `linear-gradient(to right, transparent 10px, ${marginColor} 10px, ${marginColor} 11px, transparent 11px)`;
const linesGradient = `repeating-linear-gradient(to bottom, transparent 0px, transparent ${lineSpacing - 1}px, ${ruledLineColor} ${lineSpacing - 1}px, ${ruledLineColor} ${lineSpacing}px)`;
const notebookBg = `${marginGradient}, ${linesGradient}, var(--card-what)`;

export function ResultCard({ poemId, whatIsText, itIsText }: { poemId: number; whatIsText: string; itIsText: string }) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  async function handleLike() {
    if (liked || liking) return;
    setLiking(true);
    await likePoem(poemId);
    setLiked(true);
    setLiking(false);
  }

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        border: `1px solid var(--card-what-dark)`,
        boxShadow: `0 4px 20px var(--card-shadow)`,
      }}
    >
      {/* Top half — what is */}
      <div className="px-5 pt-5 pb-4" style={{ background: notebookBg, minHeight: "110px" }}>
        <div className="mb-3" style={{ color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "1.25rem" }}>
          what is
        </div>
        <div style={{ fontFamily: "var(--font-hand)", fontSize: "1.9rem", color: "var(--text)", lineHeight: 1.3 }}>
          {whatIsText}
        </div>
      </div>

      {/* Bottom half — it is (spoiler) */}
      <div className="px-5 pt-4 pb-5" style={{ background: notebookBg, minHeight: "110px" }}>
        <div className="mb-3" style={{ color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "1.25rem" }}>
          it is
        </div>

        {/* Spoiler overlay scoped to the text only */}
        <div className="relative">
          <div style={{ fontFamily: "var(--font-hand)", fontSize: "1.9rem", color: "var(--text)", lineHeight: 1.3 }}>
            {itIsText}
          </div>
          <div
            className="absolute inset-x-0 flex items-center justify-center cursor-pointer"
            style={{
              top: "15%",
              bottom: "15%",
              background: "#5a5550",
              opacity: revealed ? 0 : 1,
              transition: "opacity 0.4s ease",
              pointerEvents: revealed ? "none" : "auto",
            }}
            onClick={() => setRevealed(true)}
          >
            <span
              style={{
                color: "rgba(250, 248, 244, 0.45)",
                fontFamily: "var(--font-serif)",
                fontSize: "0.8rem",
                fontStyle: "italic",
              }}
            >
              tap to reveal
            </span>
          </div>
        </div>

        {/* Like button — appears after reveal */}
        <div
          className="mt-4 flex justify-end"
          style={{
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.4s ease 0.2s",
            pointerEvents: revealed ? "auto" : "none",
          }}
        >
          <button
            onClick={handleLike}
            disabled={liked || liking}
            className="text-sm transition-opacity disabled:opacity-60"
            style={{
              fontFamily: "var(--font-serif)",
              color: liked ? "var(--card-what-dark)" : "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            {liked ? "♥ saved to gallery" : "♥ save to gallery"}
          </button>
        </div>
      </div>
    </div>
  );
}
