import React, { useEffect, useMemo, useState } from "react";

type Flashcard = {
  id: string;
  title: string;
  front: string;
  back: string;
  chapter?: string;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardsChapterSession({
  flashcards,
  chapterName = "Flashcards",
}: {
  flashcards: Flashcard[];
  chapterName?: string;
}) {
  const subtypes = useMemo(() => {
    const set = new Set<string>();
    flashcards.forEach((c) => set.add(c.title));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flashcards]);

  const [selectedSubtype, setSelectedSubtype] = useState<string>("All");
  const [count, setCount] = useState<number>(10);
  const [autoFlip, setAutoFlip] = useState<boolean>(true);
  const [autoMs, setAutoMs] = useState<number>(5000);
  const [session, setSession] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const pool = useMemo(() => {
    const filtered =
      selectedSubtype === "All"
        ? flashcards
        : flashcards.filter((c) => c.title === selectedSubtype);
    return filtered;
  }, [flashcards, selectedSubtype]);

  const startSession = () => {
    const n = Math.max(1, Math.min(count, pool.length || 1));
    const newSession = shuffle(pool).slice(0, n);
    setSession(newSession);
    setIdx(0);
    setFlipped(false);
  };

  useEffect(() => {
    if (pool.length) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubtype, count, pool.length]);

  useEffect(() => {
    if (!autoFlip || !flipped) return;
    const t = setTimeout(() => setFlipped(false), autoMs);
    return () => clearTimeout(t);
  }, [autoFlip, flipped, autoMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable) return;
      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        setFlipped((v) => !v);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFlipped(false);
        setIdx((v) => Math.min(v + 1, session.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFlipped(false);
        setIdx((v) => Math.max(v - 1, 0));
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!pool.length) return;
        startSession();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.length, pool.length, count, selectedSubtype]);

  const current = session[idx];

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-semibold text-foreground">{chapterName} — Flashcards Session</div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={selectedSubtype}
            onChange={(e) => setSelectedSubtype(e.target.value)}
          >
            {subtypes.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? `All (${flashcards.length})` : s}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[5, 10, 15, 20, 30, 40].map((n) => (
              <option key={n} value={n}>
                {n} cards
              </option>
            ))}
          </select>
          <button 
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-accent"
            onClick={startSession}
          >
            Shuffle / New Session
          </button>
          <label className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={autoFlip} onChange={(e) => setAutoFlip(e.target.checked)} />
            Auto-flip back
          </label>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            value={autoMs}
            onChange={(e) => setAutoMs(Number(e.target.value))}
            disabled={!autoFlip}
          >
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={8000}>8s</option>
          </select>
        </div>
      </div>

      {/* Big Card */}
      <div
        className="cursor-pointer select-none rounded-2xl border border-border bg-accent/50 p-12 min-h-[340px]
                   flex flex-col items-center justify-center text-center transition-colors hover:bg-accent/70"
        onClick={() => setFlipped((v) => !v)}
      >
        {current ? (
          <>
            <div className="text-sm uppercase text-muted-foreground">{flipped ? "Answer" : "Question"}</div>
            <div className="mt-5 text-3xl font-semibold leading-snug text-foreground">
              {flipped ? current.back : current.front}
            </div>
            <div className="mt-5 text-sm text-muted-foreground">
              {idx + 1} / {session.length} • Space/Enter flip • ←/→ navigate • S reshuffle
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">No cards available for this filter.</div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          className="rounded-lg border border-border bg-background px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
          onClick={() => {
            setFlipped(false);
            setIdx((v) => Math.max(v - 1, 0));
          }}
          disabled={idx === 0}
        >
          Prev
        </button>
        <button
          className="rounded-lg border border-border bg-background px-4 py-2 text-foreground hover:bg-accent disabled:opacity-50"
          onClick={() => {
            setFlipped(false);
            setIdx((v) => Math.min(v + 1, session.length - 1));
          }}
          disabled={idx >= session.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
