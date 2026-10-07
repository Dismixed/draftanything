"use client";

import { DAILY_CLUE_TYPE_LABEL, DAILY_FACT_LABEL, formatDistanceKm } from "@/lib/anyguessr/daily";
import type { DailyRoundRecap } from "@/lib/anyguessr/types";
import { stampTone } from "./stamps";
import WorldMap from "./world-map";

interface Props {
  recap: DailyRoundRecap;
  totalScore: number;
  onContinue: () => void;
}

/** Shown after each guess: the answer, where it is, and how far off the guess was. */
export default function RoundRecap({ recap, totalScore, onContinue }: Props) {
  const clueLabel =
    DAILY_CLUE_TYPE_LABEL[recap.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ?? recap.clueType;

  const distance = recap.surrendered ? "—" : recap.exact ? "0 km" : formatDistanceKm(recap.distanceKm);

  return (
    <div className={`ag-recap anim-fade-slide-up is-${stampTone(recap)}`}>
      <p className="ag-recap-kind">
        <b>Round {recap.roundIndex + 1}</b>
        {clueLabel}
      </p>

      <h2 className="ag-recap-answer">
        {recap.flagUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recap.flagUrl} alt="" />
        )}
        {recap.answer}
      </h2>

      <p className="ag-recap-guess">
        {recap.surrendered ? (
          "You gave up this round"
        ) : recap.exact ? (
          "Spot on"
        ) : (
          <>
            You guessed <b>{recap.guess}</b>
          </>
        )}
      </p>

      <div className="ag-recap-map">
        <WorldMap
          answer={{ cca3: recap.answerCca3, lat: recap.answerLat, lng: recap.answerLng }}
          guess={{ cca3: recap.guessCca3, lat: recap.guessLat, lng: recap.guessLng }}
        />
      </div>

      <div className="ag-recap-stats">
        <div>
          <b>{distance}</b>
          <span>Distance</span>
        </div>
        <div>
          <b className="is-score">{recap.surrendered ? "0" : `+${recap.roundScore}`}</b>
          <span>Round score</span>
        </div>
        <div>
          <b>{totalScore}</b>
          <span>Total</span>
        </div>
      </div>

      {recap.funFact && (
        <p className="ag-recap-fact">
          <b>{DAILY_FACT_LABEL[recap.clueType] ?? "Did you know"}</b>
          {recap.funFact}
        </p>
      )}

      <button type="button" className="ag-cta" onClick={onContinue} autoFocus>
        {recap.isFinalRound ? "See results" : "Next round"}
      </button>
    </div>
  );
}
