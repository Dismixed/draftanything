import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RoundRecap from "@/components/anyguessr/round-recap";
import type { DailyRoundRecap } from "@/lib/anyguessr/types";

const mapState = vi.hoisted(() => ({ signalsReady: true }));

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/motion/burst", () => ({ burstFrom: vi.fn() }));
vi.mock("@/components/anyguessr/world-map", () => ({
  default: function MapStub({ reveal, onReady }: { reveal?: { framed: boolean; line: boolean; answer: boolean }; onReady?: () => void }) {
    // The real map says so once its outlines have loaded.
    useEffect(() => {
      if (mapState.signalsReady) onReady?.();
    }, [onReady]);
    return <div data-testid="map" data-framed={reveal?.framed} data-line={reveal?.line} data-answer={reveal?.answer} />;
  },
}));

/** Portugal guessed for Spain: a miss that borders the answer. */
const nextDoor = (extra: Partial<DailyRoundRecap> = {}): DailyRoundRecap => ({
  roundIndex: 2,
  clueType: "food",
  guess: "Portugal",
  answer: "Spain",
  distanceKm: 412,
  roundScore: 91,
  exact: false,
  answerLat: 40,
  answerLng: -4,
  guessLat: 39.5,
  guessLng: -8,
  answerCca3: "ESP",
  guessCca3: "PRT",
  isFinalRound: false,
  ...extra,
});

function setup(recap: DailyRoundRecap, streak?: { current: number; broken: number }) {
  const onContinue = vi.fn();
  render(<RoundRecap recap={recap} totalScore={300} streak={streak} onContinue={onContinue} />);
  return { onContinue };
}

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const map = () => screen.getByTestId("map");
const button = () => screen.getByRole("button");

beforeEach(() => {
  mapState.signalsReady = true;
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RoundRecap reveal", () => {
  it("opens with the answer still hidden", () => {
    setup(nextDoor());
    expect(screen.getByText("Where is it?")).toBeTruthy();
    expect(screen.queryByText("Spain")).toBeNull();
    expect(screen.getByText("You guessed")).toBeTruthy();
    expect(map().dataset.framed).toBe("false");
    expect(screen.queryByRole("status")).toBeNull();
    expect(button().textContent).toBe("Skip");
  });

  it("waits for the map before it starts, then plays anyway if the map never says so", () => {
    mapState.signalsReady = false;
    setup(nextDoor());

    advance(2900);
    expect(map().dataset.framed).toBe("false");
    expect(screen.getByText("Where is it?")).toBeTruthy();

    advance(100); // the wait is over; the beats are scheduled as it ends
    advance(400);
    expect(map().dataset.framed).toBe("true");
  });

  it("starts the beats from the moment the map is ready", () => {
    setup(nextDoor());
    advance(400);
    expect(map().dataset.framed).toBe("true");
  });

  it("plays the beats in order: camera, line, answer, then the stamp", () => {
    setup(nextDoor(), { current: 3, broken: 0 });

    advance(400);
    expect(map().dataset.framed).toBe("true");
    expect(map().dataset.line).toBe("false");

    advance(1000);
    expect(map().dataset.line).toBe("true");
    expect(map().dataset.answer).toBe("false");
    expect(screen.queryByText("Spain")).toBeNull();

    advance(700);
    expect(map().dataset.answer).toBe("true");
    expect(screen.getByText("Spain")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    advance(1700);
    expect(screen.getByRole("status").textContent).toBe("Next door!");
    expect(screen.getByText("Next door. Almost.")).toBeTruthy();
    expect(screen.getByText("Streak ×3")).toBeTruthy();
    expect(button().textContent).toBe("Skip");

    advance(600);
    expect(button().textContent).toBe("Next round");
  });

  it("counts the distance and score up to their final values", () => {
    setup(nextDoor());
    advance(3000);
    expect(screen.queryByText("+91")).toBeNull();

    advance(1300);
    expect(screen.getByText("412 km")).toBeTruthy();
    expect(screen.getByText("+91")).toBeTruthy();
    expect(screen.getByText("300")).toBeTruthy();
  });

  it("skips to the end on the first press and continues on the second", () => {
    const { onContinue } = setup(nextDoor());

    fireEvent.click(button());
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByText("Spain")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Next door!");
    expect(button().textContent).toBe("Next round");

    fireEvent.click(button());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("lets a tap on the map skip too", () => {
    setup(nextDoor());
    fireEvent.click(map().parentElement as HTMLElement);
    expect(screen.getByText("Spain")).toBeTruthy();
  });

  it("goes straight to the answer for a bullseye, with no line", () => {
    setup(nextDoor({ exact: true, guess: "Spain", guessCca3: "ESP", guessLat: 40, guessLng: -4, distanceKm: 0, roundScore: 100 }));
    advance(1600);
    expect(map().dataset.answer).toBe("true");
    advance(1300);
    expect(screen.getByRole("status").textContent).toBe("Spot on");
    expect(screen.getByText("0 km")).toBeTruthy();
  });

  it("stamps a given-up round as skipped, with no distance", () => {
    setup(nextDoor({ surrendered: true, guess: "", guessCca3: null, guessLat: null, guessLng: null, roundScore: 0, distanceKm: 20000 }));
    advance(3000);
    expect(screen.getByRole("status").textContent).toBe("Skipped");
    expect(screen.getByText("You gave up this round")).toBeTruthy();
    expect(screen.queryByText(/km/)).toBeNull();
  });

  it("calls a far miss way off, naming the far side of the world", () => {
    setup(nextDoor({ guess: "Argentina", guessCca3: "ARG", distanceKm: 10200, roundScore: 10 }));
    advance(4200);
    expect(screen.getByRole("status").textContent).toBe("Way off");
    expect(screen.getByText("The other side of the world.")).toBeTruthy();
  });

  it("shows a streak of two or more, and one a miss has just broken", () => {
    const { unmount } = render(<RoundRecap recap={nextDoor()} totalScore={0} streak={{ current: 1, broken: 0 }} onContinue={() => {}} />);
    advance(4200);
    expect(screen.queryByText(/Streak/)).toBeNull();
    unmount();

    render(<RoundRecap recap={nextDoor({ roundScore: 5, guessCca3: "ARG" })} totalScore={0} streak={{ current: 0, broken: 3 }} onContinue={() => {}} />);
    advance(4200);
    expect(screen.getByText("Streak ×3 broken")).toBeTruthy();
  });

  it("shows everything at once for a player who prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
    setup(nextDoor());
    expect(screen.getByText("Spain")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Next door!");
    expect(button().textContent).toBe("Next round");
  });
});

describe("RoundRecap fun fact", () => {
  it("shows the fact under a heading for what the clue showed", () => {
    setup(nextDoor({ funFact: "Paella began as a farm workers' meal." }));
    expect(screen.getByText("About the dish")).toBeTruthy();
    expect(screen.getByText(/Paella began/)).toBeTruthy();
  });

  it("labels the fact by clue type", () => {
    setup(nextDoor({ clueType: "wildlife", funFact: "x" }));
    expect(screen.getByText("About the animal")).toBeTruthy();
  });

  it("fades the fact in once the reveal is over", () => {
    setup(nextDoor({ funFact: "A fact." }));
    const fact = () => screen.getByText("A fact.", { exact: false }).closest("p") as HTMLElement;
    expect(fact().className).not.toContain("is-in");
    advance(4200);
    expect(fact().className).toContain("is-in");
  });

  it("links the fact to its source", () => {
    setup(nextDoor({ funFact: "x", funFactSource: "https://en.wikipedia.org/wiki/Paella" }));
    const link = screen.getByText("Source: Wikipedia") as HTMLAnchorElement;
    expect(link.href).toBe("https://en.wikipedia.org/wiki/Paella");
    expect(link.rel).toBe("noopener noreferrer");
  });

  it("shows a fact without a link when it has no source, and nothing without a fact", () => {
    const { unmount } = render(<RoundRecap recap={nextDoor({ funFact: "x", funFactSource: null })} totalScore={0} onContinue={() => {}} />);
    expect(screen.queryByText("Source: Wikipedia")).toBeNull();
    unmount();

    render(<RoundRecap recap={nextDoor({ funFact: null })} totalScore={0} onContinue={() => {}} />);
    expect(screen.queryByText("About the dish")).toBeNull();
  });
});
