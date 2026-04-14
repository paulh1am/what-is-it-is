"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveSubmission, generatePoems } from "@/app/actions";

type Phase = "what" | "it";

interface Card {
  text: string;
  done: boolean;
}

function getOrCreateSessionToken(): string {
  let token = localStorage.getItem("session_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("session_token", token);
  }
  return token;
}

const DEFAULT_COUNT = 4;

export default function CardForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("what");
  const [cards, setCards] = useState<Card[]>(
    Array.from({ length: DEFAULT_COUNT }, () => ({ text: "", done: false }))
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatCards, setWhatCards] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const doneCount = cards.filter((c) => c.done).length;
  const totalCards = cards.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeIndex, phase]);

  function handleTextChange(value: string) {
    setCards((prev) =>
      prev.map((c, i) => (i === activeIndex ? { ...c, text: value } : c))
    );
  }

  function handleConfirm() {
    const current = cards[activeIndex];
    if (!current.text.trim()) return;

    const text = current.text.trim();
    const finalText = text.endsWith("?") ? text : text + "?";

    const updated = cards.map((c, i) =>
      i === activeIndex ? { ...c, text: finalText, done: true } : c
    );
    setCards(updated);

    const nextIncomplete = updated.findIndex((c, i) => i > activeIndex && !c.done);
    if (nextIncomplete !== -1) {
      setActiveIndex(nextIncomplete);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  }

  function handleEditCard(index: number) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, done: false } : c))
    );
    setActiveIndex(index);
  }

  function handlePhaseSubmit() {
    if (doneCount === 0) return;
    if (phase === "what") {
      setWhatCards(cards.filter((c) => c.done).map((c) => c.text));
      setPhase("it");
      setCards(Array.from({ length: DEFAULT_COUNT }, () => ({ text: "", done: false })));
      setActiveIndex(0);
    } else {
      handleFinalSubmit();
    }
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const sessionToken = getOrCreateSessionToken();
      const itIsCards = cards.filter((c) => c.done).map((c) => c.text);

      const submissionId = await saveSubmission({
        sessionToken,
        whatIsCards: whatCards,
        itIsCards,
      });

      await generatePoems(submissionId);
      router.push(`/results?id=${submissionId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const isItPhase = phase === "it";
  const cardColor = isItPhase ? "var(--card-it)" : "var(--card-what)";
  const cardColorDark = isItPhase ? "var(--card-it-dark)" : "var(--card-what-dark)";
  const label = isItPhase ? "it is" : "what is";
  const allDone = cards.every((c) => c.done);

  return (
    <div className="flex flex-col items-center min-h-screen px-4 pt-16 pb-32">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1
          className="text-3xl mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
        >
          what is / it is
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
          {isItPhase ? "now fill in your it is cards" : "fill in your cards with whatever question comes to mind"}
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between mb-1.5" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <span>{label}</span>
          <span>{doneCount} / {totalCards}</span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: "var(--border)" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / totalCards) * 100}%`, background: cardColorDark }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-sm" style={{ minHeight: "200px" }}>
        {/* Ghost cards behind */}
        {[...Array(Math.max(0, totalCards - doneCount - 1))].map((_, i) => (
          <div
            key={`ghost-${i}`}
            className="absolute rounded-xl"
            style={{
              background: cardColor,
              height: "160px",
              top: `${(i + 1) * 6}px`,
              width: `calc(100% + ${(i + 1) * 6}px)`,
              marginLeft: `${(i + 1) * -3}px`,
              opacity: 0.4 - i * 0.1,
              zIndex: 10 - i,
              border: `1px solid ${cardColorDark}`,
            }}
          />
        ))}

        {/* Completed cards */}
        <div className="flex flex-col gap-3 mb-3">
          {cards.map((card, i) => {
            if (!card.done) return null;
            return (
              <div
                key={i}
                className="w-full rounded-xl px-5 py-4 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: cardColor,
                  border: `1px solid ${cardColorDark}`,
                  position: "relative",
                  zIndex: 20,
                }}
                onClick={() => handleEditCard(i)}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-bold text-base shrink-0"
                    style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
                  >
                    {label}
                  </span>
                  <span style={{ color: "var(--text)", fontSize: "1.05rem" }}>
                    {card.text}
                  </span>
                </div>
                <div
                  className="absolute top-3 right-4 text-xs"
                  style={{ color: cardColorDark, filter: "brightness(0.7)" }}
                >
                  edit
                </div>

              </div>
            );
          })}
        </div>

        {/* Active input card */}
        {!allDone && (
          <div
            className="w-full rounded-xl px-5 py-5"
            style={{
              background: cardColor,
              border: `1px solid ${cardColorDark}`,
              boxShadow: `0 4px 20px var(--card-shadow)`,
              position: "relative",
              zIndex: 30,
            }}
          >
            <div
              className="text-xs mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              finish the sentence
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold text-lg shrink-0"
                style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
              >
                {label}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={cards[activeIndex]?.text ?? ""}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="...?"
                className="flex-1 bg-transparent outline-none text-lg placeholder-opacity-40"
                style={{ color: "var(--text)", fontFamily: "var(--font-sans)", caretColor: cardColorDark }}
              />
            </div>
            <div className="flex items-center mt-4">
              <button
                onClick={handleConfirm}
                disabled={!cards[activeIndex]?.text.trim()}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
                style={{ background: cardColorDark, color: "var(--bg)" }}
              >
                done ↵
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit row — always below the active card */}
      <div className="w-full max-w-sm mt-4 flex justify-end">
        <button
          onClick={handlePhaseSubmit}
          disabled={doneCount === 0 || submitting}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
          style={{
            background: "var(--text)",
            color: "var(--bg)",
            fontFamily: "var(--font-serif)",
          }}
        >
          {submitting
            ? "pairing..."
            : isItPhase
            ? `see poems →`
            : `submit ${doneCount} card${doneCount !== 1 ? "s" : ""}`}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "#c0392b" }}>
          {error}
        </p>
      )}
    </div>
  );
}
