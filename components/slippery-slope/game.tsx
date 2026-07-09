"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_CODE_LENGTH } from "@/features/room/schema";
import {
  CATS,
  DCLASS,
  DLABEL,
  LETTERS,
  PCOLORS,
  generateSlMap,
  WCLASS,
  wagerToDiff,
  type Player,
  type Question,
} from "./data";
import { appendUniqueQuestions } from "@/lib/brain-dead/trivia-api";
import { resolveWagerTopicHint } from "@/features/slippery-slope/topic-hint";
import { PREVIEW_WAGER } from "@/features/slippery-slope/game-logic";

/* ══════════════════════════════════
   Types
   ══════════════════════════════════ */

type Screen_ =
  | "home"
  | "solo-setup"
  | "multi-home"
  | "create-room"
  | "join-room"
  | "game"
  | "win";

type Phase = "wager" | "question" | "wait";

interface GameState {
  mode: "solo" | "multi" | null;
  cat: string;
  players: Player[];
  currentIdx: number;
  wager: number | null;
  usedQ: Set<number>;
  roomCode: string;
  totalPlayers: number;
}

/* ══════════════════════════════════
   Helpers
   ══════════════════════════════════ */

function matchesDifficulty(q: Question, diff: number): boolean {
  if (diff === 4) return q.d >= 3;
  return q.d === diff;
}

function pickQuestion(
  pool: Question[],
  wager: number,
  usedQ: Set<number>,
  seed?: number,
): { q: Question; index: number; usedQ: Set<number> } | null {
  if (!pool.length) return null;

  const d = wagerToDiff(wager);
  let cands = pool
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => matchesDifficulty(q, d) && !usedQ.has(i));

  if (!cands.length) {
    cands = pool.map((q, i) => ({ q, i })).filter(({ i }) => !usedQ.has(i));
  }

  if (!cands.length) return null;

  const pickIndex =
    seed === undefined
      ? Math.floor(Math.random() * cands.length)
      : ((seed % cands.length) + cands.length) % cands.length;
  const pick = cands[pickIndex];
  const nextUsed = new Set(usedQ);
  nextUsed.add(pick.i);
  return { q: pick.q, index: pick.i, usedQ: nextUsed };
}

function clampPos(pos: number): number {
  return Math.max(0, Math.min(50, pos));
}

function applyPenalty(pos: number, pen: number): number {
  return clampPos(pos - Math.min(pen, pos));
}

/** Board cells are 1–50; pos 0 is off-board start (shown on square 1). */
function boardSquare(pos: number): number {
  return pos === 0 ? 1 : pos;
}

/* Board: top row = 41-50 (boustrophedon) */
function buildBoardRows(): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < 5; r++) {
    const base = (4 - r) * 10;
    const cells = Array.from({ length: 10 }, (_, i) => base + i + 1);
    if ((4 - r) % 2 === 1) cells.reverse();
    rows.push(cells);
  }
  return rows;
}

const BOARD_ROWS = buildBoardRows();

/* ══════════════════════════════════
   Component
   ══════════════════════════════════ */

export default function SlipperySlopeGame() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen_>("home");
  const [G, setG] = useState<GameState>({
    mode: null,
    cat: "general",
    players: [],
    currentIdx: 0,
    wager: null,
    usedQ: new Set(),
    roomCode: "",
    totalPlayers: 2,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const tokenRef = useRef("");
  const seenIdsRef = useRef<string[]>([]);
  const loadingRef = useRef(false);
  const [soloCat, setSoloCat] = useState("general");
  const [crName, setCrName] = useState("");
  const [crCat, setCrCat] = useState("general");
  const [crCount, setCrCount] = useState(2);
  const [jrName, setJrName] = useState("");
  const [jrCode, setJrCode] = useState("");
  const [jrErr, setJrErr] = useState("");
  const [crErr, setCrErr] = useState("");
  const [crSubmitting, setCrSubmitting] = useState(false);
  const [jrSubmitting, setJrSubmitting] = useState(false);

  /* Game phase state */
  const [phase, setPhase] = useState<Phase>("wager");
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [currentW, setCurrentW] = useState(0);
  const [revealedSL, setRevealedSL] = useState<Set<number>>(new Set());
  const [slMap, setSlMap] = useState<Record<number, number>>(() => generateSlMap());

  /* Timer */
  const [timerPct, setTimerPct] = useState(100);
  const [timerColor, setTimerColor] = useState("var(--ss-lime)");
  const [timerText, setTimerText] = useState("30s");

  /* Toast & overlays */
  const [toast, setToast] = useState<{ id: string; cls: string; h: string; b: string } | null>(null);
  const [slToast, setSlToast] = useState<{ h: string; b: string; isSnake: boolean } | null>(null);
  const [slLine, setSlLine] = useState<{ from: number; to: number; isSnake: boolean } | null>(null);
  const [cellCenters, setCellCenters] = useState<Record<number, { x: number; y: number }>>({});
  const [gridSize, setGridSize] = useState<{ w: number; h: number } | null>(null);
  const boardGridRef = useRef<HTMLDivElement>(null);

  /* Animation */
  const [hopAnimating, setHopAnimating] = useState(false);
  const [hoppingCell, setHoppingCell] = useState<number | null>(null);
  const [poppedCell, setPoppedCell] = useState<number | null>(null);

  /* Topic hint */
  const [topicHint, setTopicHint] = useState<string | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);

  /* UI */
  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [answered, setAnswered] = useState<"idle" | "correct" | "wrong" | "timeout">("idle");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wagerTurnRef = useRef(0);
  const previewIndexRef = useRef<number | null>(null);

  /*
   * Refs for cross-referenced game functions.
   * We store these after render so that startTurn/aiTurn/checkSL
   * can call each other without declaration-order issues.
   */
  const startTurnRef = useRef<((g: GameState) => void) | null>(null);
  const checkSLRef = useRef<((landedPos: number) => void) | null>(null);
  const triggerWinRef = useRef<((wi: number) => void) | null>(null);
  const animateMoveRef = useRef<
    ((playerIdx: number, from: number, to: number, done: (landedPos: number) => void) => void) | null
  >(null);
  const gRef = useRef(G);
  const revealedSLRef = useRef(revealedSL);
  const slMapRef = useRef(slMap);

  /* ══════════════════════════════════
     Cleanup
     ══════════════════════════════════ */

  function clearTimerFn() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  const resetQuestionPool = useCallback(() => {
    setQuestions([]);
    setFetchError(null);
    tokenRef.current = "";
    seenIdsRef.current = [];
    loadingRef.current = false;
  }, []);

  const fetchMoreQuestions = useCallback(async (cat: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setFetchError(null);
    try {
      const params = new URLSearchParams({ count: "30" });
      if (cat !== "random") params.set("category", cat);
      if (tokenRef.current) params.set("token", tokenRef.current);
      if (seenIdsRef.current.length) {
        params.set("seen", seenIdsRef.current.slice(-150).join(","));
      }

      const res = await fetch(`/api/slippery-slope/questions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();

      if (data.questions?.length) {
        setQuestions((prev) => {
          const next = appendUniqueQuestions(prev, data.questions);
          for (const q of data.questions) {
            if (q.id && !seenIdsRef.current.includes(q.id)) {
              seenIdsRef.current.push(q.id);
            }
          }
          return next;
        });
        tokenRef.current = data.token ?? tokenRef.current;
      } else {
        setQuestions((prev) => {
          if (!prev.length) {
            setFetchError("No questions available. Try again.");
          }
          return prev;
        });
      }
    } catch {
      setQuestions((prev) => {
        if (!prev.length) {
          setFetchError("Could not load trivia questions. Check your connection.");
        }
        return prev;
      });
    } finally {
      loadingRef.current = false;
      setQuestionsLoading(false);
    }
  }, []);

  /* ══════════════════════════════════
     Navigation
     ══════════════════════════════════ */

  const goHome = useCallback(() => {
    clearTimerFn();
    setScreen("home");
  }, []);

  const goSolo = useCallback(() => {
    setScreen("solo-setup");
  }, []);

  /* ══════════════════════════════════
     SOLO
     ══════════════════════════════════ */

  const startSolo = useCallback(() => {
    resetQuestionPool();
    setSlMap(generateSlMap());
    setG({
      mode: "solo",
      cat: soloCat,
      players: [{ name: "You", color: PCOLORS[0], pos: 0, isHuman: true }],
      currentIdx: 0,
      wager: null,
      usedQ: new Set(),
      roomCode: "",
      totalPlayers: 2,
    });
    setRevealedSL(new Set());
    setPhase("wager");
    setToast(null);
    setSlToast(null);
    setSlLine(null);
    setCurrentQ(null);
    setCurrentW(0);
    setSelectedWager(null);
    setSelectedAnswer(null);
    setAnswered("idle");
    setTopicHint(null);
    setTopicLoading(false);
    setScreen("game");
  }, [soloCat, resetQuestionPool]);

  /* ══════════════════════════════════
     ROOM / MULTIPLAYER
     ══════════════════════════════════ */

  const createRoom = useCallback(async () => {
    if (!crName.trim() || crSubmitting) return;
    setCrErr("");
    setCrSubmitting(true);
    try {
      await fetch("/api/guest", { method: "POST" });
      const res = await fetch("/api/slippery-slope/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: crName.trim(),
          category: crCat,
          maxPlayers: crCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCrErr(data.message ?? data.error ?? "Failed to create room");
        return;
      }
      router.push(`/slippery-slope/${data.roomCode}`);
    } catch {
      setCrErr("Network error. Please try again.");
    } finally {
      setCrSubmitting(false);
    }
  }, [crName, crCat, crCount, crSubmitting, router]);

  const joinRoom = useCallback(async () => {
    if (!jrName.trim()) {
      setJrErr("Enter a name");
      return;
    }
    if (jrCode.trim().length !== ROOM_CODE_LENGTH) {
      setJrErr(`Enter a valid ${ROOM_CODE_LENGTH}-character code.`);
      return;
    }
    if (jrSubmitting) return;
    setJrErr("");
    setJrSubmitting(true);
    try {
      await fetch("/api/guest", { method: "POST" });
      const res = await fetch(
        `/api/slippery-slope/by-code/${jrCode.trim().toUpperCase()}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: jrName.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setJrErr(data.message ?? data.error ?? "Failed to join room");
        return;
      }
      router.push(`/slippery-slope/${data.roomCode}`);
    } catch {
      setJrErr("Network error. Please try again.");
    } finally {
      setJrSubmitting(false);
    }
  }, [jrName, jrCode, jrSubmitting, router]);

  const playAgain = useCallback(() => {
    resetQuestionPool();
    setSlMap(generateSlMap());
    setG((prev) => ({
      ...prev,
      currentIdx: 0,
      usedQ: new Set(),
      players: prev.players.map((p) => ({ ...p, pos: 0 })),
    }));
    setRevealedSL(new Set());
    setPhase("wager");
    setToast(null);
    setSlToast(null);
    setSlLine(null);
    setCurrentQ(null);
    setCurrentW(0);
    setSelectedWager(null);
    setSelectedAnswer(null);
    setAnswered("idle");
    setTopicHint(null);
    setTopicLoading(false);
    setScreen("game");
  }, [resetQuestionPool]);

  /* ══════════════════════════════════
     GAME LOGIC FUNCTIONS
     These are all regular function declarations so they hoist
     within the component scope and can reference each other.
     ══════════════════════════════════ */

  function triggerWin(winnerIdx: number) {
    clearTimerFn();
    setG((prev) => ({ ...prev, currentIdx: winnerIdx }));
    setScreen("win");
  }

  function animateMove(
    playerIdx: number,
    from: number,
    to: number,
    done: (landedPos: number) => void,
  ) {
    from = clampPos(from);
    to = clampPos(to);
    if (from === to) {
      setG((prev) => {
        const players = [...prev.players];
        players[playerIdx] = { ...players[playerIdx], pos: to };
        return { ...prev, players };
      });
      done(to);
      return;
    }
    const step = to > from ? 1 : -1;
    const steps: number[] = [];
    for (let s = from + step; to > from ? s <= to : s >= to; s += step) {
      steps.push(clampPos(s));
    }
    let i = 0;
    const HOP_MS = to > from ? Math.max(60, 180 - steps.length * 8) : 100;
    setHopAnimating(true);

    function hop() {
      if (i >= steps.length) {
        setHopAnimating(false);
        done(to);
        return;
      }
      const pos = clampPos(steps[i]);
      setHoppingCell(pos);
      setG((prev) => {
        const players = [...prev.players];
        players[playerIdx] = { ...players[playerIdx], pos };
        return { ...prev, players };
      });
      i++;
      setTimeout(hop, HOP_MS);
    }
    setTimeout(hop, 500);
  }

  function checkSL(landedPos: number) {
    const playerIdx = gRef.current.currentIdx;
    const playerName = gRef.current.players[playerIdx]?.name ?? "Player";
    const pos = landedPos;

    if (slMapRef.current[pos] !== undefined && !revealedSLRef.current.has(pos)) {
      const newRevealed = new Set(revealedSLRef.current);
      newRevealed.add(pos);
      setRevealedSL(newRevealed);
      const dest = slMapRef.current[pos];
      const isSnake = dest < pos;
      const diff = Math.abs(dest - pos);
      setSlLine({ from: pos, to: dest, isSnake });

      if (isSnake) {
        setSlToast({
          h: `\u{1F40D} SNAKE! Slide down ${diff} squares`,
          b: `${playerName} lands on a snake at sq.${pos} → drops to sq.${dest}`,
          isSnake: true,
        });
      } else {
        setSlToast({
          h: `\u{1FA9C} LADDER! Climb up ${diff} squares`,
          b: `${playerName} hits a ladder at sq.${pos} → jumps to sq.${dest}`,
          isSnake: false,
        });
      }

      setTimeout(() => {
        setSlLine(null);
        setPoppedCell(dest);
        setG((prev) => {
          const players = [...prev.players];
          players[playerIdx] = { ...players[playerIdx], pos: clampPos(dest) };
          return { ...prev, players };
        });
        setTimeout(() => setPoppedCell(null), 400);
        if (dest >= 50) {
          setTimeout(() => triggerWin(playerIdx), 1200);
          return;
        }
        advanceToNextTurn(2000);
      }, 2200);
    } else {
      advanceToNextTurn();
    }
  }

  function aiTurn(g: GameState, wager: number) {
    const success = 0.7 - wager * 0.022;
    const correct = Math.random() < success;
    const from = g.players[g.currentIdx].pos;
    let to: number;
    if (correct) {
      to = clampPos(g.players[g.currentIdx].pos + wager);
    } else {
      to = applyPenalty(g.players[g.currentIdx].pos, Math.floor(wager / 2));
    }
    if (to >= 50) {
      animateMove(g.currentIdx, from, to, () => setTimeout(() => triggerWin(g.currentIdx), 600));
    } else {
      animateMove(g.currentIdx, from, to, checkSL);
    }
  }

  function startTurn(g: GameState) {
    clearTimerFn();
    setSlLine(null);
    setSlToast(null);
    setToast(null);
    setAnswered("idle");
    setSelectedAnswer(null);
    setSelectedWager(null);
    setCurrentQ(null);
    setHopAnimating(false);

    const p = g.players[g.currentIdx];
    if (p.isHuman) {
      setPhase("wager");
      wagerTurnRef.current += 1;
      const picked = pickQuestion(
        questions,
        PREVIEW_WAGER,
        new Set(g.usedQ),
        wagerTurnRef.current,
      );
      if (picked) {
        previewIndexRef.current = picked.index;
        setCurrentQ(picked.q);
        setTopicHint(resolveWagerTopicHint(g.cat, picked.q));
        setTopicLoading(!picked.q.topic && g.cat !== "general" && g.cat !== "random");
      } else {
        previewIndexRef.current = null;
        setTopicHint(null);
        setTopicLoading(true);
      }
    } else {
      setPhase("wait");
      const w = Math.floor(Math.random() * 10) + 1;
      setTimeout(() => aiTurn(g, w), 1200 + Math.random() * 1200);
    }
  }

  /* Sync refs after every render so cross-calls work */
  useEffect(() => {
    startTurnRef.current = startTurn;
    checkSLRef.current = checkSL;
    triggerWinRef.current = triggerWin;
    animateMoveRef.current = animateMove;
    gRef.current = G;
    revealedSLRef.current = revealedSL;
    slMapRef.current = slMap;
  });

  function advanceToNextTurn(delayMs = 1800) {
    setTimeout(() => {
      setG((prev) => {
        const nextG = {
          ...prev,
          currentIdx: (prev.currentIdx + 1) % prev.players.length,
        };
        queueMicrotask(() => startTurnRef.current?.(nextG));
        return nextG;
      });
    }, delayMs);
  }

  /* ══════════════════════════════════
     EFFECT: Start first turn on game screen
     ══════════════════════════════════ */

  const gameStarted = useRef(false);
  useEffect(() => {
    if (screen !== "game") {
      gameStarted.current = false;
      return;
    }

    if (fetchError) return;

    if (questions.length === 0) {
      if (!loadingRef.current) {
        setQuestionsLoading(true);
        void fetchMoreQuestions(G.cat);
      }
      return;
    }

    if (!gameStarted.current) {
      gameStarted.current = true;
      startTurn(G);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, questions.length, fetchError, G.cat]);

  useEffect(() => {
    if (screen !== "game" || fetchError) return;
    const remaining = questions.length - G.usedQ.size;
    if (remaining <= 8) {
      void fetchMoreQuestions(G.cat);
    }
  }, [screen, questions.length, G.usedQ.size, G.cat, fetchError, fetchMoreQuestions]);

  /* Measure cell centers so snake/ladder lines align with the grid */
  useLayoutEffect(() => {
    const grid = boardGridRef.current;
    if (!grid || screen !== "game" || questions.length === 0) return;

    const measure = () => {
      const rect = grid.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const centers: Record<number, { x: number; y: number }> = {};
      for (let n = 1; n <= 50; n++) {
        const el = grid.querySelector(`#ss-cell-${n}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        centers[n] = {
          x: r.left + r.width / 2 - rect.left,
          y: r.top + r.height / 2 - rect.top,
        };
      }
      setCellCenters(centers);
      setGridSize({ w: rect.width, h: rect.height });
    };

    const scheduleMeasure = () => {
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };

    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [screen, questions.length]);

  function slEndpoint(n: number): { x: number; y: number } | null {
    return cellCenters[n] ?? null;
  }

  /* ══════════════════════════════════
     QUESTION FLOW
     ══════════════════════════════════ */

  function askQuestion(wager: number) {
    let q: Question;
    let nextUsed: Set<number>;

    if (previewIndexRef.current !== null) {
      const idx = previewIndexRef.current;
      const preview = questions[idx];
      if (!preview) return;
      q = preview;
      nextUsed = new Set(G.usedQ);
      nextUsed.add(idx);
      previewIndexRef.current = null;
    } else {
      const picked = pickQuestion(questions, wager, new Set(G.usedQ));
      if (!picked) return;
      q = picked.q;
      nextUsed = picked.usedQ;
    }

    setPhase("question");
    setCurrentQ(q);
    setCurrentW(wager);
    setG((prev) => ({ ...prev, usedQ: nextUsed }));
    setAnswered("idle");
    setSelectedAnswer(null);
    startTimer(30);
  }

  function startTimer(seconds: number) {
    clearTimerFn();
    let elapsed = 0;
    setTimerPct(100);
    setTimerColor("var(--ss-lime)");
    setTimerText(`${seconds}s`);

    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      const rem = Math.max(0, seconds - elapsed);
      const pct = (rem / seconds) * 100;
      setTimerPct(pct);
      setTimerColor(pct < 25 ? "var(--ss-red)" : pct < 55 ? "var(--ss-orange)" : "var(--ss-lime)");
      setTimerText(`${Math.ceil(rem)}s`);
      if (rem <= 0) {
        clearTimerFn();
        onTimeout();
      }
    }, 100);
  }

  function onTimeout() {
    if (!currentQ) return;
    setAnswered("timeout");
    const pen = Math.floor(currentW / 2);
    const p = G.players[G.currentIdx];
    const from = p.pos;
    const to = applyPenalty(p.pos, pen);
    const actualPen = from - to;
    setToast({
      id: "ans",
      cls: "ss-toast ss-toast-time",
      h: `\u23F1 Time's up! -${actualPen} squares`,
      b: `The answer was: ${currentQ.a[currentQ.c]}`,
    });
    setSelectedAnswer(currentQ.c);
    setTimeout(() => animateMove(G.currentIdx, from, to, checkSL), 600);
  }

  function resolveAnswer(idx: number) {
    clearTimerFn();
    if (!currentQ) return;
    const q = currentQ;
    const w = currentW;
    const p = G.players[G.currentIdx];
    const from = p.pos;
    setSelectedAnswer(idx);
    setAnswered(idx === q.c ? "correct" : "wrong");

    if (idx === q.c) {
      const to = clampPos(p.pos + w);
      setToast({
        id: "ans",
        cls: "ss-toast ss-toast-ok",
        h: `\u2713 Correct! +${w} squares`,
        b: `${p.name} hops to square ${to}`,
      });
      if (to >= 50) {
        animateMove(G.currentIdx, from, to, () => setTimeout(() => triggerWin(G.currentIdx), 600));
      } else {
        animateMove(G.currentIdx, from, to, checkSL);
      }
    } else {
      const pen = Math.floor(w / 2);
      const to = applyPenalty(p.pos, pen);
      const actualPen = from - to;
      setToast({
        id: "ans",
        cls: "ss-toast ss-toast-bad",
        h: `\u2717 Wrong! -${actualPen} squares`,
        b: `Correct: "${q.a[q.c]}" - ${p.name} slides to ${to}`,
      });
      setSelectedAnswer(q.c);
      animateMove(G.currentIdx, from, to, checkSL);
    }
  }

  /* ══════════════════════════════════
     WAGER CONFIRM
     ══════════════════════════════════ */

  const confirmWager = useCallback(() => {
    if (selectedWager === null || !currentQ) return;
    askQuestion(selectedWager);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWager, currentQ]);

  /* ══════════════════════════════════
     TOPIC HINT
     ══════════════════════════════════ */

  useEffect(() => {
    if (phase !== "wager" || !currentQ || !G.players[G.currentIdx]?.isHuman) return;
    if (currentQ.topic || G.cat === "general" || G.cat === "random") return;

    const timeout = setTimeout(() => {
      setTopicLoading(false);
      setTopicHint(resolveWagerTopicHint(G.cat, currentQ));
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentQ, G.currentIdx, G.cat]);

  /* ══════════════════════════════════
     RENDER HELPERS
     ══════════════════════════════════ */

  const sortedStandings = [...G.players].sort((a, b) => b.pos - a.pos);
  const winner = G.players[G.currentIdx];
  const isHumanWinner = winner?.isHuman;

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ss-bg)",
        color: "var(--ss-text)",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ═══ NAV ═══ */}
      {screen !== "game" && (
        <nav className="ss-nav">
          <div className="ss-logo" style={{ color: "var(--ss-text)" }}>
            <span style={{ color: "var(--ss-lime)" }}>slippery</span>slope
          </div>
        </nav>
      )}

      {/* ═══ HOME ═══ */}
      {screen === "home" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p className="ss-eyebrow">◆ Stim Games</p>
          <h1 className="ss-display">
            Slippery<br />
            <span className="hl">Slope</span>
          </h1>
          <p className="ss-sub">
            Trivia meets Snakes &amp; Ladders. Wager your confidence. Land somewhere you didn&apos;t expect.
          </p>
          <div className="ss-home-btns">
            <button className="ss-btn ss-btn-lime" onClick={goSolo}>
              Play Solo
            </button>
            <button className="ss-btn ss-btn-ghost" onClick={() => setScreen("multi-home")}>
              Multiplayer
            </button>
          </div>
        </div>
      )}

      {/* ═══ SOLO SETUP ═══ */}
      {screen === "solo-setup" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p className="ss-eyebrow">Solo</p>
          <h2 className="ss-section-head">
            Pick a <span className="hl">category</span>
          </h2>
          <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginBottom: 0 }}>
            Race to square 50 &mdash; wager 1&ndash;10 each turn
          </p>
          <div className="ss-catgrid">
            {CATS.map((c) => (
              <button
                key={c.id}
                className={`ss-catbtn ${c.id === soloCat ? "sel" : ""}`}
                onClick={() => setSoloCat(c.id)}
              >
                <span className="ss-cat-em">{c.em}</span>
                {c.name}
              </button>
            ))}
          </div>
          <button className="ss-btn ss-btn-lime" onClick={startSolo}>
            Start →
          </button>
        </div>
      )}

      {/* ═══ MULTI HOME ═══ */}
      {screen === "multi-home" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p className="ss-eyebrow">Multiplayer</p>
          <h2 className="ss-section-head">
            Play with <span className="hl">friends</span>
          </h2>
          <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
            Create or join a room
          </p>
          <div className="ss-home-btns">
            <button className="ss-btn ss-btn-lime" onClick={() => setScreen("create-room")}>
              Create Room
            </button>
            <button className="ss-btn ss-btn-ghost" onClick={() => setScreen("join-room")}>
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* ═══ CREATE ROOM ═══ */}
      {screen === "create-room" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div className="ss-lobby-wrap">
            <div className="ss-card" style={{ textAlign: "left" }}>
              <p className="ss-eyebrow" style={{ marginBottom: "1.1rem", textAlign: "center" }}>
                Create Room
              </p>
              <div className="ss-field" style={{ marginBottom: "0.9rem" }}>
                <label className="ss-flabel">Your Name</label>
                <input
                  className="ss-inp"
                  placeholder="Enter your name"
                  maxLength={16}
                  value={crName}
                  onChange={(e) => setCrName(e.target.value)}
                />
              </div>
              <div className="ss-field" style={{ marginBottom: "0.9rem" }}>
                <label className="ss-flabel">Category</label>
                <select className="ss-inp" value={crCat} onChange={(e) => setCrCat(e.target.value)}>
                  {CATS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.em} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ss-field" style={{ marginBottom: "1.3rem" }}>
                <label className="ss-flabel">Players</label>
                <div className="ss-count-row">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      className={`ss-cntbtn ${n === crCount ? "sel" : ""}`}
                      onClick={() => setCrCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--ss-red)",
                  minHeight: "1.2em",
                  marginBottom: "0.6rem",
                  fontFamily: "'Syne Mono', monospace",
                }}
              >
                {crErr}
              </p>
              <button
                className="ss-btn ss-btn-lime"
                style={{ width: "100%" }}
                disabled={crSubmitting}
                onClick={createRoom}
              >
                {crSubmitting ? "Creating…" : "Create Room →"}
              </button>
              <button
                className="ss-btn ss-btn-ghost ss-btn-sm"
                style={{ width: "100%", marginTop: "0.65rem" }}
                onClick={() => setScreen("multi-home")}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ JOIN ROOM ═══ */}
      {screen === "join-room" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div className="ss-lobby-wrap">
            <div className="ss-card" style={{ textAlign: "left" }}>
              <p className="ss-eyebrow" style={{ marginBottom: "1.1rem", textAlign: "center" }}>
                Join Room
              </p>
              <div className="ss-field" style={{ marginBottom: "0.9rem" }}>
                <label className="ss-flabel">Your Name</label>
                <input
                  className="ss-inp"
                  placeholder="Enter your name"
                  maxLength={16}
                  value={jrName}
                  onChange={(e) => setJrName(e.target.value)}
                />
              </div>
              <div className="ss-field" style={{ marginBottom: "0.9rem" }}>
                <label className="ss-flabel">Room Code</label>
                <input
                  className="ss-inp"
                  placeholder="ABC123"
                  maxLength={ROOM_CODE_LENGTH}
                  style={{
                    textTransform: "uppercase",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textAlign: "center",
                  }}
                  value={jrCode}
                  onChange={(e) => setJrCode(e.target.value.toUpperCase())}
                />
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--ss-red)",
                  minHeight: "1.2em",
                  marginBottom: "0.6rem",
                  fontFamily: "'Syne Mono', monospace",
                }}
              >
                {jrErr}
              </p>
              <button
                className="ss-btn ss-btn-lime"
                style={{ width: "100%" }}
                disabled={jrSubmitting}
                onClick={joinRoom}
              >
                {jrSubmitting ? "Joining…" : "Join →"}
              </button>
              <button
                className="ss-btn ss-btn-ghost ss-btn-sm"
                style={{ width: "100%", marginTop: "0.65rem" }}
                onClick={() => setScreen("multi-home")}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ GAME ════ */}
      {screen === "game" && (questionsLoading || fetchError || questions.length === 0) && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            {fetchError ? (
              <>
                <p style={{ color: "var(--ss-muted)", marginBottom: "1rem" }}>{fetchError}</p>
                <button
                  className="ss-btn ss-btn-lime"
                  onClick={() => {
                    setQuestionsLoading(true);
                    void fetchMoreQuestions(G.cat);
                  }}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    border: "3px solid var(--ss-border)",
                    borderTopColor: "var(--ss-lime)",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    margin: "0 auto 1rem",
                  }}
                />
                <p style={{ color: "var(--ss-muted)" }}>Loading trivia questions…</p>
              </>
            )}
          </div>
        </div>
      )}

      {screen === "game" && !questionsLoading && !fetchError && questions.length > 0 && (
        <div
          className="ss-game-layout"
          style={{
            padding: "1rem 1.2rem 1.5rem",
            maxWidth: "920px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* LEFT COLUMN */}
          <div className="ss-game-left">
            {/* BOARD */}
            <div className="ss-board-shell">
              <div className="ss-board-topbar">
                <span className="ss-board-title-sm">slipperyslope</span>
                <div className="ss-board-legend">
                  <span>
                    <span className="ss-leg-dot" style={{ background: "var(--ss-red)" }} />
                    snake
                  </span>
                  <span>
                    <span className="ss-leg-dot" style={{ background: "var(--ss-lime)" }} />
                    ladder
                  </span>
                  <span>
                    <span className="ss-leg-dot" style={{ background: "var(--ss-teal)" }} />
                    goal
                  </span>
                </div>
              </div>
              <div className="ss-board-grid-wrap">
                <div className="ss-grid" ref={boardGridRef}>
                  {BOARD_ROWS.flat().map((n) => {
                      const slDest = slMap[n];
                      const isRevealed = revealedSL.has(n);
                      const isSnakeHead = slDest !== undefined && slDest < n && isRevealed;
                      const isLadderHead = slDest !== undefined && slDest > n && isRevealed;
                      const isGoal = n === 50;
                      const classNames = [
                        "ss-gcell",
                        isGoal ? "goal-cell" : "",
                        isSnakeHead ? "revealed-snake" : "",
                        isLadderHead ? "revealed-ladder" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const tokensHere = G.players.filter((p) => boardSquare(p.pos) === n);
                      return (
                        <div key={n} id={`ss-cell-${n}`} className={classNames}>
                          <span className="ss-cell-num">{n}</span>
                          {(isSnakeHead || isLadderHead) && (
                            <span className={isSnakeHead ? "ss-snake-icon" : "ss-ladder-icon"}>
                              {isSnakeHead ? "\u{1F40D}" : "\u{1FA9C}"}
                            </span>
                          )}
                          {tokensHere.length > 0 && (
                            <div className="ss-token-wrap">
                              {tokensHere.map((tp, ti) => (
                                <div
                                  key={ti}
                                  className={`ss-tok ${tp.pos === 0 ? "ss-tok-start" : ""} ${hoppingCell === n ? "ss-tok-hopping" : ""} ${poppedCell === n ? "ss-popped" : ""}`}
                                  style={{ background: tp.color }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
                {gridSize && (
                  <svg
                    id="ss-sl-overlay"
                    viewBox={`0 0 ${gridSize.w} ${gridSize.h}`}
                    preserveAspectRatio="none"
                  >
                    {Object.entries(slMap).map(([from, to]) => {
                      const fromN = Number(from);
                      const toN = to;
                      const isRevealed = revealedSL.has(fromN);
                      const active = slLine?.from === fromN && slLine?.to === toN;
                      if (!isRevealed && !active) return null;
                      const a = slEndpoint(fromN);
                      const b = slEndpoint(toN);
                      if (!a || !b) return null;
                      const isSnake = toN < fromN;
                      return (
                        <line
                          key={from}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={isSnake ? "#f87171" : "#b5f23d"}
                          strokeWidth={active ? 3 : 2}
                          strokeLinecap="round"
                          opacity={active ? 1 : 0.75}
                          className={active ? "ss-sl-line" : undefined}
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            {/* TURN PANEL */}
            <div className="ss-turn-shell">
              <div className="ss-turn-label">
                {G.players[G.currentIdx]?.isHuman ? "Your Turn" : "Their Turn"}
              </div>
              <div className="ss-turn-player" style={{ color: G.players[G.currentIdx]?.color }}>
                {G.players[G.currentIdx]?.name}
              </div>
              <div className="ss-turn-pos">
                {G.players[G.currentIdx]?.pos === 0
                  ? "At the start — square 1"
                  : `On square ${G.players[G.currentIdx]?.pos}`}
              </div>

              {/* WAGER PHASE — HUMAN */}
              {phase === "wager" && G.players[G.currentIdx]?.isHuman && (
                <>
                  <div className="ss-topic-card">
                    <div className="ss-topic-eyebrow">This turn</div>
                    {topicLoading ? (
                      <div className="ss-topic-loading">
                        <div
                          style={{
                            width: "14px",
                            height: "14px",
                            border: "2px solid var(--ss-border)",
                            borderTopColor: "var(--ss-lime)",
                            borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                            flexShrink: 0,
                          }}
                        />
                        Thinking of a topic…
                      </div>
                    ) : topicHint ? (
                      <div className="ss-topic-question">
                        How much do you know about <span className="hl">{topicHint}</span>?
                      </div>
                    ) : null}
                  </div>
                  <p className="ss-wager-hint">
                    How confident are you? Bet 1&ndash;10.
                    <br />
                    Correct = move forward that many squares. Wrong = go back half.
                  </p>
                  <div className="ss-wager-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <button
                        key={w}
                        className={`ss-wbtn ${selectedWager === w ? WCLASS[w] : ""}`}
                        onClick={() => setSelectedWager(w)}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="ss-wager-meta">
                    <div className="ss-wager-preview">
                      {selectedWager !== null ? (
                        <>
                          <span className={`ss-diff-pip ${DCLASS[wagerToDiff(selectedWager)]}`}>
                            {DLABEL[wagerToDiff(selectedWager)]}
                          </span>
                          &nbsp; &check; +{selectedWager} squares &nbsp; &cross; -
                          {Math.floor(selectedWager / 2)} squares
                        </>
                      ) : (
                        "Pick a number to see the difficulty"
                      )}
                    </div>
                    <button
                      className="ss-btn ss-btn-lime ss-btn-sm"
                      disabled={selectedWager === null}
                      onClick={confirmWager}
                    >
                      Let&apos;s go →
                    </button>
                  </div>
                </>
              )}

              {/* WAGER PHASE — AI */}
              {phase === "wager" && !G.players[G.currentIdx]?.isHuman && (
                <div
                  style={{
                    background: "var(--ss-surface2)",
                    border: "1px solid var(--ss-border)",
                    borderRadius: "10px",
                    padding: "1rem 1.2rem",
                    fontSize: "0.85rem",
                    color: "var(--ss-muted)",
                    marginTop: "0.5rem",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "var(--ss-teal)", fontWeight: 700 }}>
                    {G.players[G.currentIdx]?.name}
                  </span>{" "}
                  is picking a wager\u2026
                </div>
              )}

              {/* QUESTION PHASE */}
              {phase === "question" && currentQ && (
                <>
                  <div className="ss-qcard">
                    <div className="ss-qmeta">
                      <span className="ss-qlabel">Wager: {currentW}</span>
                      <span className={`ss-diff-pip ${DCLASS[wagerToDiff(currentW)]}`}>
                        {DLABEL[wagerToDiff(currentW)]}
                      </span>
                    </div>
                    <div className="ss-qtimer-row">
                      <div className="ss-tbar-bg">
                        <div
                          className="ss-tbar"
                          style={{ width: `${timerPct}%`, background: timerColor }}
                        />
                      </div>
                      <div className="ss-ttxt">{timerText}</div>
                    </div>
                    <div className="ss-qtext">{currentQ.q}</div>
                    <div className="ss-agrid">
                      {currentQ.a.map((ans, i) => {
                        const showCorrect =
                          (answered !== "idle" && i === currentQ.c);
                        const showWrong =
                          answered === "wrong" && i === selectedAnswer && i !== currentQ.c;
                        const isDisabled = answered !== "idle";
                        return (
                          <button
                            key={i}
                            className={`ss-abtn ${showCorrect ? "correct" : ""} ${showWrong ? "wrong" : ""}`}
                            disabled={isDisabled}
                            onClick={() => resolveAnswer(i)}
                          >
                            <span className="ss-aletter">{LETTERS[i]}</span>
                            <span
                              style={{
                                opacity:
                                  isDisabled && !showCorrect && !showWrong ? 0.45 : 1,
                              }}
                            >
                              {ans}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {toast && (
                    <div className={`ss-toast show ${toast.cls}`}>
                      <div className="ss-toast-h">{toast.h}</div>
                      <div className="ss-toast-b">{toast.b}</div>
                    </div>
                  )}
                  {slToast && (
                    <div
                      className={`ss-toast show ${slToast.isSnake ? "ss-toast-snake" : "ss-toast-ladder"}`}
                    >
                      <div className="ss-toast-h">{slToast.h}</div>
                      <div className="ss-toast-b">{slToast.b}</div>
                    </div>
                  )}
                </>
              )}

              {/* WAIT PHASE */}
              {phase === "wait" && (
                <div
                  style={{
                    background: "var(--ss-surface2)",
                    border: "1px solid var(--ss-border)",
                    borderRadius: "10px",
                    padding: "1rem 1.2rem",
                    fontSize: "0.85rem",
                    color: "var(--ss-muted)",
                    marginTop: "0.5rem",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "var(--ss-teal)", fontWeight: 700 }}>
                    {G.players[G.currentIdx]?.name}
                  </span>{" "}
                  is thinking\u2026
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — SIDEBAR */}
          <div className="ss-sidebar">
            {G.players.map((p, i) => (
              <div key={i} className={`ss-pcard ${i === G.currentIdx ? "myturn" : ""}`}>
                <div className="ss-pcard-top">
                  <div className="ss-pdot2" style={{ background: p.color }} />
                  <div className="ss-pcard-name">{p.name}</div>
                  <div className="ss-turn-pip" style={{ display: i === G.currentIdx ? "block" : "none" }}>
                    TURN
                  </div>
                </div>
                <div className="ss-pbar-bg">
                  <div
                    className="ss-pbar"
                    style={{ width: `${(p.pos / 50) * 100}%`, background: p.color }}
                  />
                </div>
                <div className="ss-ppos">
                  <span>{p.pos === 0 ? "Start" : `Sq. ${p.pos}`}</span>
                  <span style={{ color: "var(--ss-muted)" }}>
                    {p.pos >= 50 ? "WINNER!" : `${50 - Math.max(p.pos, 0)} to go`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ WIN SCREEN ════ */}
      {screen === "win" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            background: "var(--ss-bg)",
          }}
        >
          <div className="ss-win-em">{isHumanWinner ? "\u{1F3C6}" : "\u{1F62E}"}</div>
          <h2 className="ss-win-title">
            {isHumanWinner ? (
              <>
                You <span className="hl">Win!</span>
              </>
            ) : (
              <>
                {winner?.name} <span className="hl">Wins!</span>
              </>
            )}
          </h2>
          <p className="ss-win-sub">
            {isHumanWinner
              ? "You navigated snakes, climbed ladders, and got to 50 first."
              : `${winner?.name} reached square 50. Better luck next time.`}
          </p>
          <div className="ss-standings">
            {sortedStandings.map((p, i) => (
              <div key={i} className="ss-srow">
                <div className="ss-srank">
                  {["\u{1F947}", "\u{1F948}", "\u{1F949}"][i] || i + 1}
                </div>
                <div className="ss-sdot2" style={{ background: p.color }} />
                <div className="ss-sname">{p.name}</div>
                <div className="ss-spos">Sq. {p.pos}</div>
              </div>
            ))}
          </div>
          <div className="ss-home-btns" style={{ gap: "0.8rem" }}>
            <button className="ss-btn ss-btn-lime" onClick={playAgain}>
              Play Again
            </button>
            <button className="ss-btn ss-btn-ghost" onClick={goHome}>
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
