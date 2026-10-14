import type { DailyGameId } from "@/lib/games/registry";

/**
 * A shared result travels inside its own link, so the landing page and its preview image can
 * show it without storing anything. Anyone can edit the link, so whatever comes back out is
 * trimmed to plain, short text before it is drawn.
 */
export interface SharedResult {
  /** The puzzle's date ("Oct 6") or category. */
  label: string;
  lines: string[];
}

const MAX_LINES = 3;
const MAX_LABEL = 40;
const MAX_LINE = 80;
// Control and invisible formatting characters. Emoji joiners (U+200D) and variation
// selectors (U+FE0F) are kept, or the emoji would come apart.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩]/g;

function clean(value: string, max: number): string {
  const chars = Array.from(value.replace(UNSAFE, "").trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}

function tidy(result: SharedResult): SharedResult | null {
  const label = clean(result.label, MAX_LABEL);
  const lines = result.lines
    .map((line) => clean(line, MAX_LINE))
    .filter((line) => line !== "")
    .slice(0, MAX_LINES);
  return label === "" || lines.length === 0 ? null : { label, lines };
}

function toBase64Url(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function encodeResult(result: SharedResult): string | null {
  const tidied = tidy(result);
  return tidied ? toBase64Url(JSON.stringify([tidied.label, ...tidied.lines])) : null;
}

/** Null for anything that is not a result this site wrote. */
export function decodeResult(value: string | undefined): SharedResult | null {
  if (!value || value.length > 1024) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return null;
    const [label, ...lines] = parsed as string[];
    return tidy({ label: label ?? "", lines });
  } catch {
    return null;
  }
}

/** The challenge a shared result puts to whoever opens it. */
export function shareDare(gameId: DailyGameId): string {
  if (gameId === "hot-takes") return "Would you rank it the same?";
  if (gameId === "ball-knowledge") return "Can you name more?";
  return "Can you beat it?";
}
