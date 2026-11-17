"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FinishRun } from "@/components/daily/finish-run";
import { FinishUpNext } from "@/components/daily/finish-up-next";
import { msUntilNextDailyDay } from "@/lib/daily-day";
import { buildFleet, type Fleet } from "@/lib/dead-reckoning/fleet";
import { formatFull, inWords, parseGuess } from "@/lib/dead-reckoning/numbers";
import { FLAVOUR, LEGS, PAR, SQUARES, closeness, dayStr, grade, quickerThan, tierTable, totalDays, type Guess } from "@/lib/dead-reckoning/scoring";
import { loadGuesses, saveGuesses, streaks } from "@/lib/dead-reckoning/storage";
import { PUZZLE_GAMES, type DailyGameId } from "@/lib/games/registry";
import { formatCountdown } from "@/lib/games/today";
import { buildShareText, formatShareDate } from "@/lib/share/share-text";
import { useStreak } from "@/lib/streak/context";
import { readStreakStore, recordDailyCompletion } from "@/lib/streak/storage";
import { sweepCount } from "@/lib/streak/sweep";
import type { Leg } from "@/lib/dead-reckoning/voyage";
import { CrowdStrip, GapLine } from "./charts";
import { createIsles, type IslesHandle } from "./isles";

interface Day {
  date: string;
  voyage: number;
  legs: Leg[];
}

type Phase = "loading" | "failed" | "intro" | "question" | "reveal" | "sail" | "end";

/** Seconds on the clock for each question. */
const CLOCK = 20;

/** How the wind fills the sails on the crossing, by tier. */
const WIND = ["full sails", "a fair wind", "a steady breeze", "a light breeze", "barely a breath", "limp sails", "not a breath of wind"];

function dateLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .toLowerCase();
}

/** "13", "6½": a day count without the word. */
const num = (d: number) => dayStr(d).replace(/ days?$/, "");

export default function DeadReckoningGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const odoRef = useRef<HTMLDivElement>(null);
  const whereRef = useRef<HTMLDivElement>(null);
  const islesRef = useRef<IslesHandle | null>(null);

  const [day, setDay] = useState<Day | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  /** Crossings whose tier has been shown (squares fill in as each one lands). */
  const [shown, setShown] = useState(0);
  const [names, setNames] = useState<string[]>([]);
  const [landed, setLanded] = useState<string | null>(null);
  const [fleet, setFleet] = useState<Fleet | null>(null);

  const legIndex = guesses.length - (phase === "reveal" || phase === "sail" ? 1 : 0);

  const finish = useCallback(async (d: Day, all: Guess[]) => {
    // Counts towards the daily streak and the Sweep, like every other daily.
    recordDailyCompletion("dead-reckoning", d.date);
    let result: Fleet;
    try {
      const res = await fetch("/api/dead-reckoning/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: d.date, guesses: all }),
      });
      if (!res.ok) throw new Error(String(res.status));
      result = ((await res.json()) as { fleet: Fleet }).fleet;
    } catch {
      // No server: the estimated fleet still gives the end screen something to compare with.
      result = buildFleet(d.date, d.legs, []);
    }
    setFleet(result);
  }, []);

  // Load today's voyage.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dead-reckoning/daily", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Day>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setDay(d);
      })
      .catch(() => {
        if (!cancelled) setPhase("failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The sea is drawn from the day's date, so it is the same islands for everyone. Then pick
  // up wherever this device left off.
  useEffect(() => {
    if (!day) return;
    const isles = createIsles(
      canvasRef.current!,
      rootRef.current!,
      { odo: odoRef.current!, where: whereRef.current!, flash: flashRef.current! },
      day.date,
      { onLanded: setLanded },
    );
    islesRef.current = isles;
    setNames(isles.names());
    const saved = loadGuesses(day.date).slice(0, LEGS);
    const tiers = saved.map((g, i) => grade(g, day.legs[i].answer).index);
    isles.place(tiers);
    setGuesses(saved);
    setShown(saved.length);
    if (saved.length === LEGS) {
      isles.end();
      setPhase("end");
      void finish(day, saved);
    } else if (saved.length > 0) {
      isles.ask();
      setPhase("question");
    } else {
      isles.intro();
      setPhase("intro");
    }
    return () => {
      isles.destroy();
      islesRef.current = null;
    };
  }, [day, finish]);

  const firstQuestion = () => {
    islesRef.current?.ask();
    setPhase("question");
  };

  const submit = (g: Guess) => {
    if (!day || phase !== "question") return;
    const next = [...guesses, g];
    setGuesses(next);
    saveGuesses(day.date, next);
    islesRef.current?.reveal();
    setPhase("reveal");
  };

  const sailOn = () => {
    if (!day) return;
    const last = guesses.length >= LEGS;
    setLanded(null);
    setPhase("sail");
    islesRef.current?.sail(() => {
      if (last) {
        islesRef.current?.end();
        setPhase("end");
        void finish(day, guesses);
        return;
      }
      islesRef.current?.ask();
      setPhase("question");
    });
  };

  const leg = day && phase !== "end" ? day.legs[Math.min(legIndex, LEGS - 1)] : null;
  const nextIsland = names[Math.min(legIndex + 1, names.length - 1)] ?? "the next island";

  return (
    <div className="dr" ref={rootRef}>
      <canvas ref={canvasRef} className="dr-cv" aria-label="The sea, island to island, with your ship" />
      <div className="dr-hud dr-tl">
        <div className="dr-brand">dead reckoning</div>
        <div>{day ? `voyage ${day.voyage} · ${dateLabel(day.date)}` : " "}</div>
        <div className="dr-squares" aria-hidden="true">
          {Array.from({ length: LEGS }, (_, i) => {
            const g = i < shown && day ? grade(guesses[i] ?? null, day.legs[i].answer) : null;
            return (
              <i
                key={i}
                className={`${g ? "pop" : ""}${!g && i === legIndex && phase === "question" ? "now" : ""}`}
                style={g ? { background: `var(--dr-t${g.index})`, borderColor: `var(--dr-t${g.index})` } : undefined}
              />
            );
          })}
        </div>
        <Link href="/" className="dr-home">
          all games
        </Link>
      </div>
      <div className="dr-hud dr-tr">
        <div className="dr-dist" ref={odoRef}>
          0 days at sea
        </div>
        <div className="dr-where" ref={whereRef}>
          home port
        </div>
      </div>
      <div className="dr-flash" ref={flashRef} />
      <section className="dr-stage" aria-live="polite">
        {phase === "loading" ? <div className="dr-inner dr-meta">charting today&apos;s course…</div> : null}
        {phase === "failed" ? (
          <div className="dr-inner">
            <div className="dr-meta">the charts didn&apos;t load</div>
            <button type="button" className="dr-cta" onClick={() => window.location.reload()}>
              try again
            </button>
          </div>
        ) : null}
        {phase === "intro" ? <Intro onGo={firstQuestion} /> : null}
        {phase === "question" && leg ? <Question key={legIndex} leg={leg} onSubmit={submit} /> : null}
        {phase === "reveal" && leg && day ? (
          <Reveal
            key={legIndex}
            leg={leg}
            index={legIndex}
            guess={guesses[legIndex] ?? null}
            nextIsland={nextIsland}
            onLand={(tier) => {
              setShown(legIndex + 1);
              islesRef.current?.land(tier);
            }}
            onNext={sailOn}
          />
        ) : null}
        {phase === "sail" && leg ? <Crossing tier={grade(guesses[legIndex] ?? null, leg.answer).index} to={nextIsland} landed={landed} /> : null}
        {phase === "end" && day ? <End day={day} guesses={guesses} fleet={fleet} /> : null}
      </section>
    </div>
  );
}

function HowTo() {
  return (
    <details className="dr-howto">
      <summary className="dr-link">how long each crossing takes</summary>
      <table>
        <tbody>
          {tierTable().map((t) => (
            <tr key={t.index}>
              <td>
                <span className="dr-sw" style={{ background: `var(--dr-t${t.index})` }} />
                {t.name.toLowerCase()}
              </td>
              <td>{t.within}</td>
              <td>{dayStr(t.days)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function Intro({ onGo }: { onGo: () => void }) {
  return (
    <div className="dr-inner dr-intro">
      <h1 className="dr-q">Guess close, sail fast.</h1>
      <p className="dr-lede">One question waits on every island. The nearer your reckoning, the quicker the crossing to the next.</p>
      <button type="button" className="dr-cta dr-solid" onClick={onGo} autoFocus>
        set sail
      </button>
      <HowTo />
    </div>
  );
}

function Question({ leg, onSubmit }: { leg: Leg; onSubmit: (g: Guess) => void }) {
  const [raw, setRaw] = useState("");
  const [nudge, setNudge] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cord = useRef<HTMLDivElement>(null);
  const ember = useRef<HTMLDivElement>(null);
  const secs = useRef<HTMLDivElement>(null);
  const fuse = useRef<HTMLDivElement>(null);
  const rawRef = useRef(raw);
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    rawRef.current = raw;
    submitRef.current = onSubmit;
  });

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  // The fuse burns along the answer line; when it's out, whatever is typed is taken (or nothing).
  useEffect(() => {
    const t0 = performance.now();
    const dur = CLOCK * 1000;
    let raf = 0;
    const tick = (t: number) => {
      const left = Math.max(0, dur - (t - t0));
      const f = left / dur;
      if (cord.current) cord.current.style.width = `${f * 100}%`;
      if (ember.current) ember.current.style.left = `${f * 100}%`;
      if (secs.current) secs.current.textContent = String(Math.ceil(left / 1000));
      fuse.current?.classList.toggle("low", left < 5000);
      if (left <= 0) {
        submitRef.current(parseGuess(rawRef.current));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const parsed = parseGuess(raw);

  const take = () => {
    if (parsed === null) {
      setNudge(raw.trim() ? "that isn’t a number yet · try 4m or 2.5k" : "type a number first");
      input.current?.focus();
      return;
    }
    onSubmit(parsed);
  };

  const addSuffix = (s: string) => {
    setRaw((r) => r.replace(/[a-z\s]+$/i, "") + s);
    setNudge(null);
    input.current?.focus();
  };

  let echo: React.ReactNode;
  if (nudge) echo = <div className="dr-echo dim">{nudge}</div>;
  else if (!raw.trim()) echo = <div className="dr-echo dim">shorthand works: 4m, 2.5k, 1.2b</div>;
  else if (parsed === null) echo = <div className="dr-echo dim">a number, with k, m or b if you like</div>;
  else
    echo = (
      <div className="dr-echo">
        {formatFull(parsed)} <span className="w">· {inWords(parsed)}</span>
      </div>
    );

  return (
    <div className="dr-inner">
      <h1 className="dr-q">{leg.prompt}</h1>
      <div className="dr-unit">in {leg.unit}</div>
      <div className="dr-clue">{leg.clue}</div>
      <div className="dr-field">
        <div className="dr-one">
          <input
            ref={input}
            className="dr-gi"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="your reckoning"
            aria-label={`Your guess, in ${leg.unit}`}
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setNudge(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") take();
            }}
          />
          <div className="dr-fuse" ref={fuse} role="timer" aria-label={`${CLOCK} seconds to answer`}>
            <div className="ash" />
            <div className="cord" ref={cord} style={{ width: "100%" }} />
            <div className="ember" ref={ember} style={{ left: "100%" }} />
            <div className="secs" ref={secs} aria-hidden="true">
              {CLOCK}
            </div>
          </div>
        </div>
        {echo}
      </div>
      <div className="dr-chips">
        {(
          [
            ["k", "thousand"],
            ["m", "million"],
            ["b", "billion"],
          ] as const
        ).map(([s, label]) => (
          <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addSuffix(s)}>
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="dr-cta" onClick={take}>
        take the reading
      </button>
    </div>
  );
}

function Reveal({
  leg,
  index,
  guess,
  nextIsland,
  onLand,
  onNext,
}: {
  leg: Leg;
  index: number;
  guess: Guess;
  nextIsland: string;
  onLand: (tier: number) => void;
  onNext: () => void;
}) {
  const tier = grade(guess, leg.answer);
  /** 0 fog · 1 answer landed · 2 your guess · 3 the gap · 4 tier · 5 the fact. */
  const [beat, setBeat] = useState(0);
  const [clear, setClear] = useState(false);
  const [gone, setGone] = useState(false);
  const countRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const word = tier.name.toLowerCase();

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    let raf = 0;
    let t0 = -1;
    const L = Math.log(Math.max(leg.answer, 1));
    const count = (t: number) => {
      if (t0 < 0) t0 = t;
      const u = Math.min(1, (t - t0) / 1300);
      const e = 1 - Math.pow(1 - u, 3);
      const shown = u >= 1 ? leg.answer : leg.answer < 1 ? leg.answer * e : Math.exp(L * e);
      if (countRef.current) countRef.current.textContent = formatFull(Number.isInteger(leg.answer) && u < 1 ? Math.round(shown) : shown);
      if (u < 1) raf = requestAnimationFrame(count);
      else {
        countRef.current?.classList.add("land");
        setBeat(1);
      }
    };
    raf = requestAnimationFrame(count);
    at(60, () => setClear(true));
    at(1550, () => setBeat(2));
    at(1800, () => setBeat(3));
    at(2300, () => {
      setBeat(4);
      onLand(tier.index);
    });
    at(3600, () => setBeat(5));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => window.clearTimeout(id));
    };
    // The reveal plays once per leg; the component is keyed by leg.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (beat === 5) nextRef.current?.focus({ preventScroll: true });
  }, [beat]);

  return (
    <div className="dr-inner">
      <div className="dr-meta">
        leg {index + 1} of {LEGS} · {leg.prompt.toLowerCase().replace(/\?$/, "")}
      </div>
      <div className={`dr-ans${clear ? "" : " fog"}`}>
        <div className="dr-num" ref={countRef}>
          0
        </div>
        <div className="dr-u">{leg.unit}</div>
      </div>
      <GapLine answer={leg.answer} guess={guess} tier={tier.index} beat={beat} />
      <div className="dr-you" style={{ opacity: beat >= 3 ? 1 : 0 }}>
        {closeness(guess, leg.answer)}
      </div>
      <div className={`dr-tier t${tier.index}${beat >= 4 ? " on" : ""}`} style={{ color: `var(--dr-t${tier.index})` }}>
        <span className="word" aria-label={word}>
          {[...word].map((c, i) => (
            <span key={i} className="ch" style={{ ["--i" as string]: i }} aria-hidden="true">
              {c === " " ? "\u00a0" : c}
            </span>
          ))}
        </span>
        <span className="dr-gain">+{dayStr(tier.days)}</span>
      </div>
      <div className={`dr-flav${beat >= 4 ? " on" : ""}`}>{FLAVOUR[tier.index]}</div>
      <div className={`dr-later${beat >= 5 ? " on" : ""}`}>
        <div className="dr-fact">{leg.fact}</div>
        <button
          ref={nextRef}
          type="button"
          className="dr-cta"
          disabled={gone}
          onClick={() => {
            setGone(true);
            onNext();
          }}
          tabIndex={beat >= 5 ? 0 : -1}
        >
          sail on to {nextIsland}
        </button>
      </div>
    </div>
  );
}

/** On the crossing: where you're bound, and how the wind is. Says how close you got once you arrive. */
function Crossing({ tier, to, landed }: { tier: number; to: string; landed: string | null }) {
  const t = tierTable()[tier];
  return (
    <div className="dr-inner">
      <div className="dr-meta">
        <span style={{ color: `var(--dr-t${tier})` }}>{t.name.toLowerCase()}</span> · bound for
      </div>
      <h1 className="dr-q">{to}</h1>
      <div className="dr-clue">{landed ?? `${WIND[tier]} · ${dayStr(t.days)}`}</div>
    </div>
  );
}

function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(msUntilNextDailyDay(Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  if (left === null) return <>--:--:--</>;
  const s = Math.max(0, Math.floor(left / 1000));
  return (
    <>
      {Math.floor(s / 3600)}:{String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}
    </>
  );
}

/** The shared finish pieces take their colours from these, so they match the voyage. */
const FIN_VARS = {
  "--bg": "var(--dr-bg)",
  "--text": "var(--dr-ink)",
  "--text-dim": "var(--dr-ink2)",
  "--fin-acc": "var(--dr-t1)",
} as CSSProperties;

function End({ day, guesses, fleet }: { day: Day; guesses: Guess[]; fleet: Fleet | null }) {
  const [missed, setMissed] = useState(false);
  const stripsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (missed) stripsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [missed]);
  const [copied, setCopied] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const answers = day.legs.map((l) => l.answer);
  const tiers = day.legs.map((l, i) => grade(guesses[i] ?? null, l.answer));
  const total = totalDays(guesses, answers);
  const over = total - PAR;
  const { streaks: all } = useStreak();
  // The voyage is over, so today counts even before the streak store has caught up.
  const played = useMemo(
    () => new Set<DailyGameId>(["dead-reckoning", ...all.filter((s) => s.playedToday).map((s) => s.id)]),
    [all],
  );
  const dates = typeof window === "undefined" ? [day.date] : readStreakStore().games["dead-reckoning"].playDates;
  const { current, longest } = streaks([...dates, day.date], day.date);
  const allDone = PUZZLE_GAMES.every((id) => played.has(id));
  const sweeps = allDone && typeof window !== "undefined" ? sweepCount(readStreakStore()) : 0;
  // "3h 12m", read once: the end screen's own countdown ticks beside it.
  const [nextIn] = useState(() => formatCountdown(msUntilNextDailyDay(Date.now())));
  const pct = fleet ? quickerThan(total, fleet.days) : null;
  const avg = fleet && fleet.days.length ? fleet.days.reduce((s, x) => s + x, 0) / fleet.days.length : null;
  const share = buildShareText({
    gameId: "dead-reckoning",
    label: formatShareDate(day.date),
    lines: [tiers.map((t) => SQUARES[t.index]).join(""), `${dayStr(total)} at sea (par ${PAR})`],
  });

  useEffect(() => {
    const m = window.matchMedia("(max-width: 560px)");
    const update = () => setNarrow(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const copy = () => {
    if (!navigator.clipboard) {
      setCopied("select the text below");
      return;
    }
    navigator.clipboard.writeText(share).then(
      () => setCopied("copied"),
      () => setCopied("select the text below"),
    );
  };

  return (
    <div className="dr-inner">
      <div className={missed ? "dr-endsheet open" : "dr-endsheet"}>
        <div className="dr-inner">
          <div className="dr-meta">voyage complete</div>
          <h1 className="dr-headline">
            seven islands in <em>{dayStr(total)}</em>
          </h1>
          <div className="dr-meta">{over > 0 ? `par is ${PAR} · ${num(over)} over` : "a perfect voyage · par"}</div>
          <div className="dr-pct">
            {pct !== null && avg !== null ? (
              <>
                <span className="dr-nowrap">
                  quicker than <b>{pct}%</b> of other people
                </span>{" "}
                · <span className="dr-nowrap">
                  average <b>{dayStr(Math.round(avg * 2) / 2)}</b>
                </span>
              </>
            ) : (
              "comparing with everyone…"
            )}
            {fleet?.source === "estimate" ? <div className="dr-note">estimated until more people finish today</div> : null}
          </div>
          <div className="dr-logrow">
            <div>
              <b>{current}</b>day streak
            </div>
            <div>
              <b>{longest}</b>longest
            </div>
            <div>
              <b>
                <Countdown />
              </b>
              next voyage
            </div>
          </div>
          <div className="dr-btnrow">
            <button type="button" className="dr-cta" onClick={copy}>
              {copied ?? "copy result"}
            </button>
            <button type="button" className="dr-link" onClick={() => setMissed((m) => !m)} aria-expanded={missed}>
              {missed ? "hide the guesses" : "see what you missed"}
            </button>
          </div>
          <div className="fin dr-fin" style={FIN_VARS}>
            <FinishRun gameId="dead-reckoning" played={played} />
            <FinishUpNext gameId="dead-reckoning" played={played} sweeps={sweeps} countdown={nextIn} />
          </div>
          {missed ? (
            <div className="dr-strips" ref={stripsRef}>
              {day.legs.map((l, i) => (
                <CrowdStrip
                  key={l.id}
                  index={i}
                  prompt={l.prompt}
                  answer={l.answer}
                  guess={guesses[i] ?? null}
                  tier={tiers[i].index}
                  days={tiers[i].days}
                  crowd={fleet?.guesses[i] ?? []}
                  narrow={narrow}
                />
              ))}
            </div>
          ) : null}
          {/* The result link goes in what is copied, but is too long to be worth showing. */}
          <div className="dr-sharetxt">{share.split("\n").slice(0, -1).join("\n")}</div>
        </div>
      </div>
    </div>
  );
}
