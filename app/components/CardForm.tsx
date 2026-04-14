"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveSubmission, generatePoems } from "@/app/actions";
import { PlayLiveButton } from "./PlayLiveButton";

type Phase = "what" | "it";
type TimeWindow = "all" | "year" | "month" | "week";

const COUNT_OPTIONS = [4, 6, 8] as const;
type CountOption = typeof COUNT_OPTIONS[number];

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: "all", label: "all time" },
  { value: "year", label: "year" },
  { value: "month", label: "month" },
  { value: "week", label: "week" },
];

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

interface CardFormProps {
  gameSessionId?: number;
  onSubmitComplete?: (submissionId: number) => void;
}

export default function CardForm({ gameSessionId, onSubmitComplete }: CardFormProps = {}) {
  const router = useRouter();
  const sessionMode = !!gameSessionId;
  const [phase, setPhase] = useState<Phase>("what");
  const [cardCount, setCardCount] = useState<CountOption>(4);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");
  const [cards, setCards] = useState<Card[]>(
    Array.from({ length: 4 }, () => ({ text: "", done: false }))
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatCards, setWhatCards] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const doneCount = cards.filter((c) => c.done).length;
  const totalCards = cards.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeIndex, phase]);

  function handleTextChange(value: string) {
    setCards((prev) =>
      prev.map((c, i) => (i === activeIndex ? { ...c, text: value } : c))
    );
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }

  function handleConfirm() {
    const current = cards[activeIndex];
    if (!current.text.trim()) return;

    const text = current.text.trim();
    const suffix = phase === "it" ? "." : "?";
    const finalText = /[?.!]$/.test(text) ? text : text + suffix;

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

  function handleCountChange(count: CountOption) {
    if (doneCount > 0 || phase !== "what") return;
    setCardCount(count);
    setCards(Array.from({ length: count }, () => ({ text: "", done: false })));
    setActiveIndex(0);
  }

  function handlePhaseSubmit() {
    if (doneCount === 0) return;
    if (phase === "what") {
      setWhatCards(cards.filter((c) => c.done).map((c) => c.text));
      setPhase("it");
      setCards(Array.from({ length: cardCount }, () => ({ text: "", done: false })));
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
        gameSessionId,
      });

      if (sessionMode) {
        onSubmitComplete?.(submissionId);
      } else {
        await generatePoems(submissionId, timeWindow);
        router.push(`/results?id=${submissionId}&window=${timeWindow}`);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const isItPhase = phase === "it";
  const cardColor = "var(--card-what)";
  const cardColorDark = "var(--card-what-dark)";
  const label = isItPhase ? "it is" : "what is";
  const allDone = cards.every((c) => c.done);

  const lineSpacing = 26;
  const ruledLineColor = isItPhase ? "rgba(70, 100, 140, 0.28)" : "rgba(70, 110, 85, 0.28)";
  const ghostRuledLineColor = isItPhase ? "rgba(70, 100, 140, 0.12)" : "rgba(70, 110, 85, 0.12)";
  const marginColor = "rgba(185, 60, 55, 0.35)";
  const ghostMarginColor = "rgba(185, 60, 55, 0.15)";
  const marginGradient = isItPhase
    ? `linear-gradient(to left, transparent 10px, ${marginColor} 10px, ${marginColor} 11px, transparent 11px)`
    : `linear-gradient(to right, transparent 10px, ${marginColor} 10px, ${marginColor} 11px, transparent 11px)`;
  const ghostMarginGradient = isItPhase
    ? `linear-gradient(to left, transparent 10px, ${ghostMarginColor} 10px, ${ghostMarginColor} 11px, transparent 11px)`
    : `linear-gradient(to right, transparent 10px, ${ghostMarginColor} 10px, ${ghostMarginColor} 11px, transparent 11px)`;
  const linesGradient = `repeating-linear-gradient(to bottom, transparent 0px, transparent ${lineSpacing - 1}px, ${ruledLineColor} ${lineSpacing - 1}px, ${ruledLineColor} ${lineSpacing}px)`;
  const ghostLinesGradient = `repeating-linear-gradient(to bottom, transparent 0px, transparent ${lineSpacing - 1}px, ${ghostRuledLineColor} ${lineSpacing - 1}px, ${ghostRuledLineColor} ${lineSpacing}px)`;
  const notebookBg = `${marginGradient}, ${linesGradient}, ${cardColor}`;
  const cardMinHeight = "130px";

  return (
    <div className={`flex flex-col items-center w-full ${sessionMode ? "pb-8" : "min-h-screen px-4 pt-16 pb-32"}`}>
      {/* Header — solo mode only */}
      {!sessionMode && (
        <div className="mb-12 text-center">
          <div className="mb-4">
            <PlayLiveButton />
          </div>
          <h1
            className="text-3xl mb-1 tracking-tight"
            style={{ fontFamily: "var(--font-serif)", color: "var(--text)" }}
          >
            what is / it is
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
            {isItPhase ? "now fill in some definitions" : "fill in your cards with whatever question comes to mind"}
          </p>
        </div>
      )}

      {/* Controls bar — solo mode only */}
      {!sessionMode && (
        <div
          className="w-full max-w-sm mb-8 flex gap-5 items-start"
          style={{ fontSize: "0.75rem" }}
        >
          {/* Card count */}
          <div className="flex flex-col items-center gap-1.5">
            <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}>cards</span>
            <div className="flex gap-1">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => handleCountChange(n)}
                  disabled={doneCount > 0 || phase !== "what"}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: cardCount === n ? "var(--text)" : "transparent",
                    color: cardCount === n ? "var(--bg)" : "var(--text-muted)",
                    border: `1px solid ${cardCount === n ? "var(--text)" : "var(--border)"}`,
                    fontFamily: "var(--font-sans)",
                    opacity: (doneCount > 0 || phase !== "what") && cardCount !== n ? 0.35 : 1,
                    cursor: doneCount > 0 || phase !== "what" ? "default" : "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: "1px", alignSelf: "stretch", background: "var(--border)", marginTop: "2px" }} />

          {/* Time window */}
          <div className="flex flex-col items-center gap-1.5">
            <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-serif)" }}>cards from</span>
            <div className="flex gap-1">
              {TIME_OPTIONS.map(({ value, label: tLabel }) => (
                <button
                  key={value}
                  onClick={() => setTimeWindow(value)}
                  className="px-2 h-6 rounded-full transition-all"
                  style={{
                    background: timeWindow === value ? "var(--text)" : "transparent",
                    color: timeWindow === value ? "var(--bg)" : "var(--text-muted)",
                    border: `1px solid ${timeWindow === value ? "var(--text)" : "var(--border)"}`,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {tLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
      <div className="w-full max-w-sm">
        {/* Completed cards */}
        <div className="flex flex-col gap-3 mb-3">
          {cards.map((card, i) => {
            if (!card.done) return null;
            return (
              <div
                key={i}
                className="w-full rounded-xl px-5 py-4 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: notebookBg,
                  border: `0.5px solid ${cardColorDark}`,
                  position: "relative",
                  zIndex: 20,
                  minHeight: cardMinHeight,
                }}
                onClick={() => handleEditCard(i)}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-bold shrink-0"
                    style={{ color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "1.6rem" }}
                  >
                    {label}
                  </span>
                  <span style={{ color: "var(--text)", fontFamily: "var(--font-hand)", fontSize: "1.9rem", lineHeight: 1.3 }}>
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
          <div className="relative">
            {/* Ghost cards stacked behind active card */}
            {[...Array(Math.min(4, Math.max(0, totalCards - doneCount - 1)))].map((_, i) => {
              const offset = Math.round((i + 1) * (5 - i / 2));
              return (
                <div
                  key={`ghost-${i}`}
                  className="absolute rounded-xl"
                  style={{
                    background: `${ghostMarginGradient}, ${ghostLinesGradient}, color-mix(in srgb, ${cardColor} ${55 - Math.min(i, 1) * 20}%, var(--bg))`,
                    border: `1px solid color-mix(in srgb, ${cardColorDark} ${55 - Math.min(i, 1) * 20}%, var(--bg))`,
                    top: `${offset}px`,
                    left: `${-offset}px`,
                    right: `${offset}px`,
                    bottom: `${-offset}px`,
                    zIndex: 20 - i,
                  }}
                />
              );
            })}
          <div
            className="w-full rounded-xl px-5 py-5"
            style={{
              background: notebookBg,
              border: `1px solid ${cardColorDark}`,
              boxShadow: `0 4px 20px var(--card-shadow)`,
              position: "relative",
              zIndex: 30,
              minHeight: cardMinHeight,
            }}
          >
            <div
              className="text-xs mb-3"
              style={{ color: "var(--text-muted)", marginTop: "-10px" }}
            >
              finish the sentence
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold shrink-0"
                style={{ color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "1.8rem", position: "relative", top: "-10px" }}
              >
                {label}
              </span>
              <textarea
                ref={inputRef}
                rows={1}
                value={cards[activeIndex]?.text ?? ""}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isItPhase ? "..." : "...?"}
                className="flex-1 bg-transparent outline-none placeholder-opacity-40 resize-none overflow-hidden"
                style={{ color: "var(--text)", fontFamily: "var(--font-hand)", fontSize: "2rem", lineHeight: "1.4", caretColor: cardColorDark, position: "relative", top: "-10px" }}
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
            ? sessionMode ? "submitting..." : "pairing..."
            : isItPhase
            ? sessionMode ? `submit cards →` : `see the results →`
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
