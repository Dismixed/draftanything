import type { DraftType, PickSlot } from "./types";

export type RandomSource = () => number;

const validateRange = (
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): void => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
};

const shuffledSeats = (
  players: number,
  random: RandomSource,
): readonly number[] => {
  const seats = Array.from({ length: players }, (_, index) => index + 1);

  for (let index = seats.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("random source must return a finite value in [0, 1)");
    }
    const swapIndex = Math.floor(value * (index + 1));
    [seats[index], seats[swapIndex]] = [seats[swapIndex], seats[index]];
  }

  return seats;
};

export const buildPickOrder = (
  players: number,
  rounds: number,
  type: DraftType,
  random: RandomSource,
): PickSlot[] => {
  validateRange(players, 2, 6, "players");
  validateRange(rounds, 1, 10, "rounds");

  const ascending = Array.from({ length: players }, (_, index) => index + 1);
  const slots: PickSlot[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const seats =
      type === "random"
        ? shuffledSeats(players, random)
        : type === "snake" && round % 2 === 0
          ? [...ascending].reverse()
          : ascending;

    seats.forEach((seat, index) => {
      slots.push(
        Object.freeze({
          overallPick: slots.length + 1,
          round,
          pickInRound: index + 1,
          seat,
        }),
      );
    });
  }

  Object.freeze(slots);
  return slots;
};

export const seededRandom = (seed: string): RandomSource => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
