export type BotStyle = "chalk" | "specialist" | "wildcard" | "balancer" | "hipster";

export interface BotProfile {
  style: BotStyle;
  name: string;
  /** One line for the lobby. */
  blurb: string;
  /** How this drafter is described to the AI when it invents picks. */
  domePersona: string;
}

/** AI drafters, in the order they are dealt into a room. */
export const BOT_ROSTER: readonly BotProfile[] = [
  {
    style: "chalk",
    name: "Chalk",
    blurb: "Takes the best one left. Every time.",
    domePersona:
      "You draft by consensus. You take the obvious, widely agreed best pick still available.",
  },
  {
    style: "specialist",
    name: "Specialist",
    blurb: "Cares about one thing and drafts for it.",
    domePersona:
      "You are obsessed with one angle of the topic and pick for that angle every time, even when a more rounded pick is available.",
  },
  {
    style: "wildcard",
    name: "Wildcard",
    blurb: "Nobody knows. Not even Wildcard.",
    domePersona:
      "You are unpredictable. You make a pick nobody saw coming that you could still defend with a straight face.",
  },
  {
    style: "balancer",
    name: "Balancer",
    blurb: "Builds a lineup with no weak spot.",
    domePersona:
      "You build a balanced lineup. You look at what your lineup lacks and pick the thing that fills the gap.",
  },
  {
    style: "hipster",
    name: "Hipster",
    blurb: "Liked it before it was popular.",
    domePersona:
      "You avoid the obvious picks. You take underrated favourites that people who really know the topic would respect.",
  },
];

export function profileForStyle(style: string | null | undefined): BotProfile {
  return BOT_ROSTER.find((b) => b.style === style) ?? BOT_ROSTER[0];
}

/**
 * The next AI drafter to seat: the first roster entry whose style is not
 * already in the room, wrapping to the first when all five are seated.
 * The name gets a numeral when someone in the room already uses it.
 */
export function nextBot(
  existing: ReadonlyArray<{ displayName: string; botStyle: string | null }>,
): BotProfile {
  const seated = new Set(existing.map((p) => p.botStyle).filter(Boolean));
  const base = BOT_ROSTER.find((b) => !seated.has(b.style)) ?? BOT_ROSTER[0];

  const taken = new Set(existing.map((p) => p.displayName.trim().toLowerCase()));
  const numerals = ["", " II", " III", " IV", " V", " VI"];
  const suffix =
    numerals.find((n) => !taken.has((base.name + n).toLowerCase())) ?? " VII";

  return { ...base, name: base.name + suffix };
}
