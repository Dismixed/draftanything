import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RoundRecap from "@/components/anyguessr/round-recap";
import type { DailyRoundRecap } from "@/lib/anyguessr/types";

const recap = (extra: Partial<DailyRoundRecap> = {}): DailyRoundRecap => ({
  roundIndex: 2,
  clueType: "food",
  guess: "Portugal",
  answer: "Brazil",
  distanceKm: 7000,
  roundScore: 21,
  exact: false,
  answerLat: -14,
  answerLng: -51,
  guessLat: 39.5,
  guessLng: -8,
  answerCca3: "BRA",
  guessCca3: "PRT",
  isFinalRound: false,
  ...extra,
});

const render = (r: DailyRoundRecap) => renderToStaticMarkup(<RoundRecap recap={r} totalScore={100} onContinue={() => {}} />);

describe("RoundRecap fun fact", () => {
  it("shows the fact under a heading for what the clue showed", () => {
    const html = render(recap({ funFact: "Feijoada is a black bean stew." }));
    expect(html).toContain("About the dish");
    expect(html).toContain("Feijoada is a black bean stew.");
  });

  it("labels the fact by clue type", () => {
    expect(render(recap({ clueType: "wildlife", funFact: "x" }))).toContain("About the animal");
    expect(render(recap({ clueType: "flag", funFact: "x" }))).toContain("About the flag");
  });

  it("shows nothing when the round has no reviewed fact", () => {
    expect(render(recap({ funFact: null }))).not.toContain("ag-recap-fact");
    expect(render(recap())).not.toContain("ag-recap-fact");
  });
});
