"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATS,
  DCLASS,
  DLABEL,
  LETTERS,
  PCOLORS,
  QDB,
  SL_MAP,
  WCLASS,
  wagerToDiff,
  type Player,
  type Question,
} from "./data";

/* ══════════════════════════════════
   Types
   ══════════════════════════════════ */

type Screen_ =
  | "home"
  | "solo-setup"
  | "multi-home"
  | "create-room"
  | "join-room"
  | "lobby"
  | "game"
  | "win";

type Phase = "wager" | "question" | "wait";

interface GameState {
  mode: "solo" | "multi" | null;
  cat: string;
  players: Player[];
  currentIdx: number;
  wager: number | null;
  usedQ: Record<string, Set<number>>;
  roomCode: string;
  totalPlayers: number;
}

/* ══════════════════════════════════
   Helpers
   ══════════════════════════════════ */

function genCode(): string {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

function getQ(
  cat: string,
  wager: number,
  usedQ: Record<string, Set<number>>,
): { q: Question; usedQ: Record<string, Set<number>> } {
  const d = wagerToDiff(wager);
  const key = cat === "random" || !QDB[cat] ? "random" : cat;
  if (!usedQ[key]) usedQ[key] = new Set();
  const pool = QDB[key] || [];
  let cands = pool.filter((q, i) => q.d === d && !usedQ[key].has(i));
  if (!cands.length) cands = pool.filter((q, i) => !usedQ[key].has(i));
  if (!cands.length) {
    usedQ[key] = new Set();
    cands = pool;
  }
  const q = cands[Math.floor(Math.random() * cands.length)];
  const idx = pool.indexOf(q);
  usedQ[key] = new Set([...usedQ[key], idx]);
  return { q, usedQ: { ...usedQ } };
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

/* ══════════════════════════════════
   Component
   ══════════════════════════════════ */

export default function SlipperySlopeGame() {
  const [screen, setScreen] = useState<Screen_>("home");
  const [G, setG] = useState<GameState>({
    mode: null,
    cat: "general",
    players: [],
    currentIdx: 0,
    wager: null,
    usedQ: {},
    roomCode: "",
    totalPlayers: 2,
  });
  const [soloCat, setSoloCat] = useState("general");
  const [crName, setCrName] = useState("");
  const [crCat, setCrCat] = useState("general");
  const [crCount, setCrCount] = useState(2);
  const [jrName, setJrName] = useState("");
  const [jrCode, setJrCode] = useState("");
  const [jrErr, setJrErr] = useState("");
  const [lobbyJoined, setLobbyJoined] = useState(1);

  /* Game phase state */
  const [phase, setPhase] = useState<Phase>("wager");
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [currentW, setCurrentW] = useState(0);
  const [revealedSL, setRevealedSL] = useState<Set<number>>(new Set());

  /* Timer */
  const [timerPct, setTimerPct] = useState(100);
  const [timerColor, setTimerColor] = useState("var(--ss-lime)");
  const [timerText, setTimerText] = useState("30s");

  /* Toast & overlays */
  const [toast, setToast] = useState<{ id: string; cls: string; h: string; b: string } | null>(null);
  const [slToast, setSlToast] = useState<{ h: string; b: string; isSnake: boolean } | null>(null);
  const [slLine, setSlLine] = useState<{ from: number; to: number; isSnake: boolean } | null>(null);

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
  const lobbyIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * Refs for cross-referenced game functions.
   * We store these after render so that startTurn/aiTurn/checkSL
   * can call each other without declaration-order issues.
   */
  const startTurnRef = useRef<((g: GameState) => void) | null>(null);
  const checkSLRef = useRef<(() => void) | null>(null);
  const triggerWinRef = useRef<((wi: number) => void) | null>(null);
  const animateMoveRef = useRef<((playerIdx: number, from: number, to: number, done: () => void) => void) | null>(null);

  /* ══════════════════════════════════
     Cleanup
     ══════════════════════════════════ */

  function clearTimerFn() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  /* ══════════════════════════════════
     Navigation
     ══════════════════════════════════ */

  const goHome = useCallback(() => {
    clearTimerFn();
    if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
    setScreen("home");
  }, []);

  const goSolo = useCallback(() => {
    setScreen("solo-setup");
  }, []);

  /* ══════════════════════════════════
     SOLO
     ══════════════════════════════════ */

  const startSolo = useCallback(() => {
    setG({
      mode: "solo",
      cat: soloCat,
      players: [{ name: "You", color: PCOLORS[0], pos: 0, isHuman: true }],
      currentIdx: 0,
      wager: null,
      usedQ: {},
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
  }, [soloCat]);

  /* ══════════════════════════════════
     ROOM / MULTIPLAYER
     ══════════════════════════════════ */

  const createRoom = useCallback(() => {
    if (!crName.trim()) return;
    const code = genCode();
    const players: Player[] = [
      { name: crName.trim(), color: PCOLORS[0], pos: 0, isHuman: true, joined: true },
    ];
    for (let i = 1; i < crCount; i++) {
      players.push({ name: `Player ${i + 1}`, color: PCOLORS[i], pos: 0, isHuman: false, joined: false });
    }
    setG((prev) => ({
      ...prev,
      mode: "multi",
      roomCode: code,
      cat: crCat,
      totalPlayers: crCount,
      players,
      currentIdx: 0,
      usedQ: {},
    }));
    setLobbyJoined(1);
    setScreen("lobby");

    if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
    let joined = 1;
    lobbyIvRef.current = setInterval(() => {
      joined++;
      setLobbyJoined(joined);
      if (joined >= crCount) {
        if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
        lobbyIvRef.current = null;
      }
    }, 1200 + Math.random() * 1500);
  }, [crName, crCat, crCount]);

  const joinRoom = useCallback(() => {
    if (!jrName.trim()) { setJrErr("Enter a name"); return; }
    if (jrCode.trim().length !== 4) { setJrErr("Enter a valid 4-letter code."); return; }
    setJrErr("");

    const players: Player[] = [
      { name: "Host", color: PCOLORS[0], pos: 0, isHuman: false, joined: true },
      { name: jrName.trim(), color: PCOLORS[1], pos: 0, isHuman: true, joined: true },
      { name: "Player 3", color: PCOLORS[2], pos: 0, isHuman: false, joined: false },
      { name: "Player 4", color: PCOLORS[3], pos: 0, isHuman: false, joined: false },
    ];
    setG((prev) => ({
      ...prev,
      mode: "multi",
      roomCode: jrCode.trim().toUpperCase(),
      cat: "general",
      totalPlayers: 4,
      players,
      currentIdx: 0,
      usedQ: {},
    }));
    setLobbyJoined(2);
    setScreen("lobby");

    if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
    let joined = 2;
    lobbyIvRef.current = setInterval(() => {
      joined++;
      setLobbyJoined(joined);
      if (joined >= 4) {
        if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
        lobbyIvRef.current = null;
      }
    }, 1500 + Math.random() * 1000);
  }, [jrName, jrCode]);

  const startMulti = useCallback(() => {
    setG((prev) => ({
      ...prev,
      currentIdx: 0,
      usedQ: {},
      players: prev.players.map((p) => ({ ...p, pos: 0, joined: true })),
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
  }, []);

  const playAgain = useCallback(() => {
    setG((prev) => ({
      ...prev,
      currentIdx: 0,
      usedQ: {},
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
  }, []);

  /* ══════════════════════════════════
     Clean up lobby interval
     ══════════════════════════════════ */

  useEffect(() => {
    return () => {
      if (lobbyIvRef.current) clearInterval(lobbyIvRef.current);
    };
  }, []);

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

  function animateMove(playerIdx: number, from: number, to: number, done: () => void) {
    if (from === to) {
      setG((prev) => {
        const players = [...prev.players];
        players[playerIdx] = { ...players[playerIdx], pos: to };
        return { ...prev, players };
      });
      done();
      return;
    }
    const step = to > from ? 1 : -1;
    const steps: number[] = [];
    for (let s = from + step; to > from ? s <= to : s >= to; s += step) steps.push(s);
    let i = 0;
    const HOP_MS = to > from ? Math.max(60, 180 - steps.length * 8) : 100;
    setHopAnimating(true);

    function hop() {
      if (i >= steps.length) {
        setHopAnimating(false);
        done();
        return;
      }
      const pos = steps[i];
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

  function checkSL() {
    const playerIdx = G.currentIdx;
    const pos = G.players[playerIdx].pos;
    if (SL_MAP[pos] !== undefined && !revealedSL.has(pos)) {
      const newRevealed = new Set(revealedSL);
      newRevealed.add(pos);
      setRevealedSL(newRevealed);
      const dest = SL_MAP[pos];
      const isSnake = dest < pos;
      const diff = Math.abs(dest - pos);
      setSlLine({ from: pos, to: dest, isSnake });

      if (isSnake) {
        setSlToast({
          h: `\u{1F40D} SNAKE! Slide down ${diff} squares`,
          b: `${G.players[playerIdx].name} lands on a snake at sq.${pos} -> drops to sq.${dest}`,
          isSnake: true,
        });
      } else {
        setSlToast({
          h: `\u{1FA9C} LADDER! Climb up ${diff} squares`,
          b: `${G.players[playerIdx].name} hits a ladder at sq.${pos} -> jumps to sq.${dest}`,
          isSnake: false,
        });
      }

      setTimeout(() => {
        setSlLine(null);
        setPoppedCell(dest);
        setG((prev) => {
          const players = [...prev.players];
          players[playerIdx] = { ...players[playerIdx], pos: dest };
          return { ...prev, players };
        });
        setTimeout(() => setPoppedCell(null), 400);
        if (dest >= 50) {
          setTimeout(() => triggerWin(playerIdx), 1200);
          return;
        }
        setTimeout(() => {
          setG((prev) => {
            const nextIdx = (prev.currentIdx + 1) % prev.players.length;
            startTurnRef.current?.({ ...prev, currentIdx: nextIdx });
            return { ...prev, currentIdx: nextIdx };
          });
        }, 2000);
      }, 2200);
    } else {
      setG((prev) => {
        const nextIdx = (prev.currentIdx + 1) % prev.players.length;
        startTurnRef.current?.({ ...prev, currentIdx: nextIdx });
        return { ...prev, currentIdx: nextIdx };
      });
    }
  }

  function aiTurn(g: GameState, wager: number) {
    const success = 0.7 - wager * 0.022;
    const correct = Math.random() < success;
    const from = g.players[g.currentIdx].pos;
    let to: number;
    if (correct) {
      to = Math.min(50, g.players[g.currentIdx].pos + wager);
    } else {
      to = Math.max(0, g.players[g.currentIdx].pos - Math.floor(wager / 2));
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
      const { q } = getQ(g.cat, 5, { ...g.usedQ });
      setCurrentQ(q);
      setTopicHint(null);
      setTopicLoading(true);
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
  });

  /* ══════════════════════════════════
     EFFECT: Start first turn on game screen
     ══════════════════════════════════ */

  const gameStarted = useRef(false);
  useEffect(() => {
    if (screen === "game" && !gameStarted.current) {
      gameStarted.current = true;
      startTurn(G);
    }
    if (screen !== "game") {
      gameStarted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /* ══════════════════════════════════
     QUESTION FLOW
     ══════════════════════════════════ */

  function askQuestion(wager: number) {
    setPhase("question");
    const { q, usedQ } = getQ(G.cat, wager, { ...G.usedQ });
    setCurrentQ(q);
    setCurrentW(wager);
    setG((prev) => ({ ...prev, usedQ }));
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
    const to = Math.max(0, p.pos - pen);
    setToast({
      id: "ans",
      cls: "ss-toast ss-toast-time",
      h: `\u23F1 Time's up! -${pen} squares`,
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
      const to = Math.min(50, p.pos + w);
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
      const to = Math.max(0, p.pos - pen);
      setToast({
        id: "ans",
        cls: "ss-toast ss-toast-bad",
        h: `\u2717 Wrong! -${pen} squares`,
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
    if (phase === "wager" && currentQ && G.players[G.currentIdx]?.isHuman) {
      const categoryName = CATS.find((c) => c.id === G.cat)?.name || "trivia";
      const timeout = setTimeout(() => {
        setTopicLoading(false);
        setTopicHint(categoryName);
      }, 1200);
      return () => clearTimeout(timeout);
    }
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
          <div className="ss-nav-pills">
            <button className={`ss-npill ${screen === "home" ? "active" : ""}`} onClick={goHome}>
              Home
            </button>
            <button className={`ss-npill ${screen === "solo-setup" ? "active" : ""}`} onClick={goSolo}>
              Solo
            </button>
            <button
              className={`ss-npill ${screen === "multi-home" || screen === "create-room" || screen === "join-room" || screen === "lobby" ? "active" : ""}`}
              onClick={() => setScreen("multi-home")}
            >
              Multiplayer
            </button>
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
              <button className="ss-btn ss-btn-lime" style={{ width: "100%" }} onClick={createRoom}>
                Create Room →
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
                  placeholder="ABCD"
                  maxLength={4}
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
              <button className="ss-btn ss-btn-lime" style={{ width: "100%" }} onClick={joinRoom}>
                Join →
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

      {/* ═══ LOBBY ═══ */}
      {screen === "lobby" && (
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
            <div className="ss-card">
              <p className="ss-eyebrow">Room Code</p>
              <div className="ss-code-block">{G.roomCode}</div>
              <p className="ss-code-hint">Share this with your friends</p>
              <div className="ss-divider" />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.65rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Syne Mono', monospace",
                    fontSize: "0.68rem",
                    color: "var(--ss-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Players
                </span>
                <span
                  style={{
                    fontFamily: "'Syne Mono', monospace",
                    fontSize: "0.68rem",
                    color: "var(--ss-muted)",
                  }}
                >
                  {lobbyJoined} / {G.totalPlayers}
                </span>
              </div>
              <div className="ss-plist">
                {G.players.map((p, i) => (
                  <div key={i} className="ss-prow">
                    <div
                      className="ss-pdot"
                      style={{
                        background: p.joined || lobbyJoined > i ? p.color : "var(--ss-border)",
                      }}
                    />
                    <span className="ss-pname">
                      {lobbyJoined > i || p.joined ? p.name : `Player ${i + 1}`}
                    </span>
                    <span
                      className={
                        i === 0
                          ? "ss-ptag ss-ptag-host"
                          : lobbyJoined <= i && !p.joined
                            ? "ss-ptag ss-ptag-wait"
                            : "ss-ptag"
                      }
                    >
                      {i === 0 ? "HOST" : lobbyJoined <= i && !p.joined ? "waiting\u2026" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ss-divider" />
              <button
                className="ss-btn ss-btn-lime"
                style={{ width: "100%", marginBottom: "0.65rem" }}
                disabled={lobbyJoined < 2}
                onClick={startMulti}
              >
                Start Game →
              </button>
              <button
                className="ss-btn ss-btn-ghost ss-btn-sm"
                style={{ width: "100%" }}
                onClick={goHome}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ GAME ════ */}
      {screen === "game" && (
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
              <div style={{ position: "relative" }}>
                <div className="ss-grid">
                  {buildBoardRows()
                    .flat()
                    .map((n) => {
                      const hasSnake =
                        revealedSL.has(n) && SL_MAP[n] !== undefined && SL_MAP[n] < n;
                      const hasLadder =
                        revealedSL.has(n) && SL_MAP[n] !== undefined && SL_MAP[n] > n;
                      const isGoal = n === 50;
                      const classNames = [
                        "ss-gcell",
                        isGoal ? "goal-cell" : "",
                        hasSnake ? "revealed-snake" : "",
                        hasLadder ? "revealed-ladder" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const tokensHere = G.players.filter((p) => p.pos === n);
                      return (
                        <div key={n} id={`ss-cell-${n}`} className={classNames}>
                          <span className="ss-cell-num">{n}</span>
                          {(hasSnake || hasLadder) && (
                            <span className={hasSnake ? "ss-snake-icon" : "ss-ladder-icon"}>
                              {hasSnake ? "\u{1F40D}" : "\u{1FA9C}"}
                            </span>
                          )}
                          {tokensHere.length > 0 && (
                            <div className="ss-token-wrap">
                              {tokensHere.map((tp, ti) => (
                                <div
                                  key={ti}
                                  className={`ss-tok ${hoppingCell === n ? "ss-tok-hopping" : ""} ${poppedCell === n ? "ss-popped" : ""}`}
                                  style={{ background: tp.color }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
                {slLine && (
                  <svg
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                      zIndex: 10,
                    }}
                  >
                    <line
                      x1="50%"
                      y1="20%"
                      x2="50%"
                      y2="80%"
                      stroke={slLine.isSnake ? "#f87171" : "#b5f23d"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="ss-sl-line"
                    />
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
                        Thinking of a topic\u2026
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
                  <span>Sq. {p.pos}</span>
                  <span style={{ color: "var(--ss-muted)" }}>
                    {p.pos >= 50 ? "WINNER!" : `${50 - p.pos} to go`}
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
