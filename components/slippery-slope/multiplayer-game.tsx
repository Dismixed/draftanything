"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BOARD_ROWS,
  boardSquare,
  parseSlMap,
} from "./board-utils";
import {
  DCLASS,
  DLABEL,
  LETTERS,
  PCOLORS,
  WCLASS,
  wagerToDiff,
} from "./data";
import type {
  SsLastEvent,
  SsQuestionProjection,
  SsRoomProjection,
} from "@/features/slippery-slope/schema";
import { useLiveSsProjection, useSlipperySlopeStore } from "@/features/slippery-slope/store";
import { useSlipperyRoom } from "@/features/slippery-slope/use-slippery-room";

interface MultiplayerGameProps {
  initial: SsRoomProjection;
  myPlayerId: string;
}

export function MultiplayerGame({ initial, myPlayerId }: MultiplayerGameProps) {
  const room = useLiveSsProjection(initial);
  useSlipperyRoom({
    roomId: room.roomId,
    roomCode: room.roomCode,
    myPlayerId,
    initialProjection: initial,
  });

  const slMap = useMemo(() => parseSlMap(room.slMap), [room.slMap]);

  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const currentPlayer = room.players.find((p) => p.seat === room.currentSeat);
  const isMyTurn = myPlayer?.seat === room.currentSeat;

  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState<"idle" | "pending" | "correct" | "wrong" | "timeout">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ h: string; b: string; cls: string } | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<SsQuestionProjection | null>(
    initial.currentQuestion,
  );
  const [opponentReveal, setOpponentReveal] = useState<SsLastEvent | null>(null);
  const [revealedSL, setRevealedSL] = useState<Set<number>>(() => {
    const revealed = new Set<number>();
    if (initial.lastEvent?.slDest != null) {
      revealed.add(initial.lastEvent.to);
    }
    return revealed;
  });
  const [slLine, setSlLine] = useState<{ from: number; to: number } | null>(null);
  const [timerPct, setTimerPct] = useState(100);
  const [timerText, setTimerText] = useState("");
  const [timerColor, setTimerColor] = useState("var(--ss-lime)");
  const [topicHint, setTopicHint] = useState<string | null>(
    initial.turnPhase === "WAGER" ? initial.wagerTopicHint : null,
  );

  const boardGridRef = useRef<HTMLDivElement>(null);
  const [cellCenters, setCellCenters] = useState<Record<number, { x: number; y: number }>>({});
  const [gridSize, setGridSize] = useState<{ w: number; h: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutSentRef = useRef(false);
  const lastEventKeyRef = useRef<string | null>(null);
  const turnSeqRef = useRef(room.turnSeq);

  useEffect(() => {
    turnSeqRef.current = room.turnSeq;
  }, [room.turnSeq]);

  useEffect(() => {
    if (room.turnPhase !== "WAGER") {
      setTopicHint(null);
      return;
    }
    setTopicHint(room.wagerTopicHint);
  }, [room.turnPhase, room.turnSeq, room.wagerTopicHint]);

  useEffect(() => {
    if (room.currentQuestion) {
      setActiveQuestion(room.currentQuestion);
    }
  }, [room.currentQuestion]);

  const submitAnswer = useCallback(
    async (answerIndex: number | null, timedOut = false) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`/api/slippery-slope/${room.roomId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answerIndex,
            turnSeq: turnSeqRef.current,
            timedOut,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.message ?? "Failed to submit answer");
          setAnswered("idle");
          setSelectedAnswer(null);
          return;
        }

        const projection = (await res.json()) as SsRoomProjection;
        useSlipperySlopeStore.getState().setProjection(projection);
        const ev = projection.lastEvent;
        if (ev?.playerId === myPlayerId) {
          setAnswered(
            ev.outcome === "correct"
              ? "correct"
              : ev.outcome === "timeout"
                ? "timeout"
                : "wrong",
          );
          if (ev.answerIndex !== null) setSelectedAnswer(ev.answerIndex);
        }
      } catch {
        setError("Network error");
        setAnswered("idle");
        setSelectedAnswer(null);
      } finally {
        setSubmitting(false);
      }
    },
    [room.roomId, submitting, myPlayerId],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (room.lastEvent) {
      const key = `${room.turnSeq}-${room.lastEvent.playerId}-${room.lastEvent.final}`;
      if (key !== lastEventKeyRef.current) {
        lastEventKeyRef.current = key;
        const ev = room.lastEvent;
        if (ev.slDest != null) {
          setRevealedSL((prev) => {
            if (prev.has(ev.to)) return prev;
            const next = new Set(prev);
            next.add(ev.to);
            return next;
          });
          setSlLine({ from: ev.to, to: ev.slDest });
          setTimeout(() => setSlLine(null), 2200);
        }
        if (ev.playerId !== myPlayerId) {
          setOpponentReveal(ev);
        }
        const slNote =
          ev.slDest !== null && ev.slDest !== ev.to
            ? ev.slDest < ev.to
              ? ` Snake to ${ev.slDest}!`
              : ` Ladder to ${ev.slDest}!`
            : "";
        const pickNote =
          ev.answerIndex !== null && activeQuestion
            ? ` Picked ${LETTERS[ev.answerIndex]}: ${activeQuestion.a[ev.answerIndex]}.`
            : ev.outcome === "timeout"
              ? " Ran out of time."
              : "";
        const cls =
          ev.outcome === "correct"
            ? "ss-toast ss-toast-ok"
            : ev.outcome === "timeout"
              ? "ss-toast ss-toast-time"
              : "ss-toast ss-toast-bad";
        setToast({
          cls,
          h:
            ev.outcome === "correct"
              ? `✓ ${ev.playerName} +${ev.wager} squares`
              : ev.outcome === "timeout"
                ? `⏱ Time's up for ${ev.playerName}`
                : `✗ ${ev.playerName} wrong`,
          b: `Moved ${ev.from} → ${ev.final}.${pickNote}${slNote}`,
        });
        const t = setTimeout(() => {
          setToast(null);
          setOpponentReveal(null);
        }, 4000);
        return () => clearTimeout(t);
      }
    }
  }, [room.lastEvent, room.turnSeq, myPlayerId, activeQuestion]);

  useEffect(() => {
    setSelectedWager(null);
    setSelectedAnswer(null);
    setAnswered("idle");
    setError(null);
    timeoutSentRef.current = false;
  }, [room.turnSeq, room.turnPhase]);

  useEffect(() => {
    clearTimer();
    if (room.turnPhase !== "QUESTION" || !room.turnDeadline) return;

    const deadline = new Date(room.turnDeadline).getTime();
    const totalMs = 30_000;

    timerRef.current = setInterval(() => {
      const rem = Math.max(0, deadline - Date.now());
      const pct = (rem / totalMs) * 100;
      setTimerPct(pct);
      setTimerColor(pct < 25 ? "var(--ss-red)" : pct < 55 ? "var(--ss-orange)" : "var(--ss-lime)");
      setTimerText(`${Math.ceil(rem / 1000)}s`);

      if (rem <= 0) {
        clearTimer();
        if (isMyTurn && !timeoutSentRef.current) {
          timeoutSentRef.current = true;
          setAnswered("timeout");
          void submitAnswer(null, true);
        }
      }
    }, 100);

    return clearTimer;
  }, [room.turnPhase, room.turnDeadline, isMyTurn, clearTimer, submitAnswer]);

  useLayoutEffect(() => {
    const grid = boardGridRef.current;
    if (!grid) return;

    const measure = () => {
      const rect = grid.getBoundingClientRect();
      if (rect.width <= 0) return;
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

    requestAnimationFrame(() => requestAnimationFrame(measure));
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [room.players]);

  async function submitWager() {
    if (selectedWager === null || !isMyTurn || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/slippery-slope/${room.roomId}/wager`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wager: selectedWager, turnSeq: room.turnSeq }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message ?? "Failed to submit wager");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function resolveAnswer(idx: number) {
    if (!room.currentQuestion || answered !== "idle") return;
    clearTimer();
    setSelectedAnswer(idx);
    setAnswered("pending");
    void submitAnswer(idx, false);
  }

  if (room.phase === "WIN") {
    const winner = room.players.find((p) => p.id === room.winnerPlayerId);
    const iWon = winner?.id === myPlayerId;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--ss-bg)",
          color: "var(--ss-text)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div className="ss-win-em">{iWon ? "🏆" : "😮"}</div>
        <h2 className="ss-win-head">
          {iWon ? (
            <>
              You <span className="hl">win!</span>
            </>
          ) : (
            <>
              <span className="hl">{winner?.displayName}</span> wins!
            </>
          )}
        </h2>
        <div className="ss-standings" style={{ margin: "1.5rem 0" }}>
          {[...room.players]
            .sort((a, b) => b.position - a.position)
            .map((p, i) => (
              <div key={p.id} className="ss-srow">
                <span className="ss-srank">{i + 1}</span>
                <span className="ss-semoji" aria-hidden="true">{p.emoji}</span>
                <span className="ss-sname">{p.displayName}</span>
                <span className="ss-spos">sq.{p.position}</span>
              </div>
            ))}
        </div>
        <a href="/slippery-slope" className="ss-btn ss-btn-lime">
          Back to home
        </a>
      </div>
    );
  }

  const q = room.currentQuestion;
  const showingOpponentReveal = opponentReveal !== null;
  const displayQuestion =
    room.turnPhase === "QUESTION" && q
      ? q
      : showingOpponentReveal && activeQuestion
        ? { ...activeQuestion, c: opponentReveal.correctIndex }
        : null;
  const displayWager =
    room.turnPhase === "QUESTION" ? room.currentWager : opponentReveal?.wager ?? room.currentWager;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ss-bg)",
        color: "var(--ss-text)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="ss-game-layout"
        style={{ padding: "1rem 1.2rem 1.5rem", maxWidth: "920px", margin: "0 auto", width: "100%" }}
      >
        <div className="ss-game-left">
          <div className="ss-board-shell">
            <div className="ss-board-topbar">
              <span className="ss-board-title-sm">slipperyslope · {room.roomCode}</span>
            </div>
            <div className="ss-board-grid-wrap">
              <div className="ss-grid" ref={boardGridRef}>
                {BOARD_ROWS.flat().map((n) => {
                  const slDest = slMap[n];
                  const isRevealed = revealedSL.has(n);
                  const isSnakeHead = slDest !== undefined && slDest < n && isRevealed;
                  const isLadderHead = slDest !== undefined && slDest > n && isRevealed;
                  const tokensHere = room.players.filter((p) => boardSquare(p.position) === n);
                  return (
                    <div
                      key={n}
                      id={`ss-cell-${n}`}
                      className={[
                        "ss-gcell",
                        n === 50 ? "goal-cell" : "",
                        isSnakeHead ? "revealed-snake" : "",
                        isLadderHead ? "revealed-ladder" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="ss-cell-num">{n}</span>
                      {(isSnakeHead || isLadderHead) && (
                        <span className={isSnakeHead ? "ss-snake-icon" : "ss-ladder-icon"}>
                          {isSnakeHead ? "🐍" : "🪜"}
                        </span>
                      )}
                      {tokensHere.length > 0 && (
                        <div className="ss-token-wrap">
                          {tokensHere.map((tp) => (
                            <span key={tp.id} className="ss-tok-em" title={tp.displayName}>
                              {tp.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {gridSize && (
                <svg
                  viewBox={`0 0 ${gridSize.w} ${gridSize.h}`}
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  {Object.entries(slMap).map(([from, to]) => {
                    const fromN = Number(from);
                    const toN = to;
                    const isRevealed = revealedSL.has(fromN);
                    const active = slLine?.from === fromN && slLine?.to === toN;
                    if (!isRevealed && !active) return null;
                    const a = cellCenters[fromN];
                    const b = cellCenters[toN];
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

          <div className="ss-turn-shell">
            <div className="ss-turn-label">{isMyTurn ? "Your Turn" : "Their Turn"}</div>
            <div className="ss-turn-player" style={{ color: PCOLORS[currentPlayer?.colorIndex ?? 0] }}>
              {currentPlayer?.displayName}
            </div>
            <div className="ss-turn-pos">
              {currentPlayer?.position === 0
                ? "At the start — square 1"
                : `On square ${currentPlayer?.position}`}
            </div>

            {error && (
              <p style={{ color: "var(--ss-red)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{error}</p>
            )}

            {room.turnPhase === "WAGER" && isMyTurn && (
              <>
                {topicHint && (
                  <div className="ss-topic-card">
                    <div className="ss-topic-eyebrow">Category hint</div>
                    <div className="ss-topic-question">
                      How much do you know about <span className="hl">{topicHint}</span>?
                    </div>
                  </div>
                )}
                <p className="ss-wager-hint">
                  Bet 1–10. Correct = move forward. Wrong = go back half.
                </p>
                <div className="ss-wager-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                    <button
                      key={w}
                      type="button"
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
                        {" "}
                        ✓ +{selectedWager} · ✗ -{Math.floor(selectedWager / 2)}
                      </>
                    ) : (
                      "Pick a wager"
                    )}
                  </div>
                  <button
                    type="button"
                    className="ss-btn ss-btn-lime ss-btn-sm"
                    disabled={selectedWager === null || submitting}
                    onClick={submitWager}
                  >
                    Let&apos;s go →
                  </button>
                </div>
              </>
            )}

            {room.turnPhase === "WAGER" && !isMyTurn && !showingOpponentReveal && (
              <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                Waiting for {currentPlayer?.displayName} to pick a wager…
              </p>
            )}

            {displayQuestion && (
              <>
                <div className="ss-qcard">
                  <div className="ss-qmeta">
                    <span className="ss-qlabel">Wager: {displayWager}</span>
                    <span className={`ss-diff-pip ${DCLASS[wagerToDiff(displayWager ?? 5)]}`}>
                      {DLABEL[wagerToDiff(displayWager ?? 5)]}
                    </span>
                  </div>
                  {isMyTurn && !showingOpponentReveal && (
                    <div className="ss-qtimer-row">
                      <div className="ss-tbar-bg">
                        <div className="ss-tbar" style={{ width: `${timerPct}%`, background: timerColor }} />
                      </div>
                      <div className="ss-ttxt">{timerText}</div>
                    </div>
                  )}
                  <div className="ss-qtext">{displayQuestion.q}</div>
                  <div className="ss-agrid">
                    {displayQuestion.a.map((ans, i) => {
                      const myResolved =
                        answered === "correct" || answered === "wrong" || answered === "timeout";
                      const opponentResolved = showingOpponentReveal && opponentReveal !== null;
                      const correctIdx = opponentResolved
                        ? opponentReveal.correctIndex
                        : myResolved
                          ? (room.lastEvent?.correctIndex ?? displayQuestion.c)
                          : undefined;
                      const pickedIdx = opponentResolved
                        ? opponentReveal.answerIndex
                        : selectedAnswer;
                      const showCorrect = correctIdx !== undefined && i === correctIdx;
                      const showWrong =
                        opponentResolved
                          ? opponentReveal.outcome === "wrong" &&
                            pickedIdx !== null &&
                            i === pickedIdx
                          : answered === "wrong" && i === selectedAnswer;
                      const showPending = !opponentResolved && answered === "pending" && i === selectedAnswer;
                      return (
                        <button
                          key={i}
                          type="button"
                          className={`ss-abtn ${showCorrect ? "correct" : ""} ${showWrong ? "wrong" : ""} ${showPending ? "pending" : ""}`}
                          disabled={!isMyTurn || answered !== "idle" || submitting || showingOpponentReveal}
                          onClick={() => resolveAnswer(i)}
                        >
                          <span className="ss-aletter">{LETTERS[i]}</span>
                          <span>{ans}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!isMyTurn && !showingOpponentReveal && (
                  <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {currentPlayer?.displayName} is answering…
                  </p>
                )}
                {showingOpponentReveal && opponentReveal && (
                  <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {opponentReveal.outcome === "timeout" ? (
                      <>
                        {opponentReveal.playerName} ran out of time. Answer was{" "}
                        <span style={{ color: "var(--ss-lime)" }}>
                          {LETTERS[opponentReveal.correctIndex]}:{" "}
                          {activeQuestion?.a[opponentReveal.correctIndex]}
                        </span>
                      </>
                    ) : opponentReveal.answerIndex !== null ? (
                      <>
                        {opponentReveal.playerName} picked{" "}
                        <span
                          style={{
                            color:
                              opponentReveal.outcome === "correct"
                                ? "var(--ss-lime)"
                                : "var(--ss-red)",
                          }}
                        >
                          {LETTERS[opponentReveal.answerIndex]}:{" "}
                          {activeQuestion?.a[opponentReveal.answerIndex]}
                        </span>
                      </>
                    ) : null}
                  </p>
                )}
              </>
            )}

            {toast && (
              <div className={`ss-toast show ${toast.cls}`} style={{ marginTop: "0.75rem" }}>
                <div className="ss-toast-h">{toast.h}</div>
                <div className="ss-toast-b">{toast.b}</div>
              </div>
            )}
          </div>
        </div>

        <div className="ss-game-right">
          <div className="ss-standings-shell">
            <div className="ss-standings-head">Standings</div>
            {[...room.players]
              .sort((a, b) => b.position - a.position)
              .map((p, i) => (
                <div key={p.id} className="ss-srow">
                  <span className="ss-srank">{i + 1}</span>
                  <span className="ss-semoji" aria-hidden="true">{p.emoji}</span>
                  <span className="ss-sname">
                    {p.displayName}
                    {p.id === myPlayerId ? " (you)" : ""}
                  </span>
                  <span className="ss-spos">{p.position === 0 ? "start" : `sq.${p.position}`}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
