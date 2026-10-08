import { MAX_PTS } from "./game-logic";

/** A round never pays less than this, so this is where the frame is fully frozen. */
const FLOOR_PTS = 50;

/**
 * How frozen the frame looks, from 0 (clear) to 1 (iced over), for the points still on offer.
 * The frost is the round's timer: it grows as points drain and jumps with each wrong guess.
 */
export function frostLevel(availablePts: number): number {
  const level = (MAX_PTS - availablePts) / (MAX_PTS - FLOOR_PTS);
  return Math.min(1, Math.max(0, level));
}
