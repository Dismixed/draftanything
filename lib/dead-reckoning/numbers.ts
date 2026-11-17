/** Number reading and writing for Dead Reckoning: typed guesses in, readable numbers out. */

const MULTIPLIERS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mil: 1e6,
  mn: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  t: 1e12,
  tn: 1e12,
  trillion: 1e12,
};

const GUESS = /^(\d*\.?\d+)(e\d+)?(k|thousand|mil|mn|million|m|bn|billion|b|tn|trillion|t)?$/;

/**
 * Reads a typed guess. Accepts commas, spaces, currency signs, decimals, `1e6`,
 * and the suffixes k / m / b / t or their words. Returns null for anything else,
 * and for zero or negative numbers.
 */
export function parseGuess(raw: string): number | null {
  const s = raw.toLowerCase().replace(/[,\s$£€_]/g, "");
  if (!s) return null;
  const m = s.match(GUESS);
  if (!m) return null;
  let value = Number.parseFloat(m[1] + (m[2] ?? ""));
  if (m[3]) value *= MULTIPLIERS[m[3]];
  return value > 0 && Number.isFinite(value) ? value : null;
}

/** Full number with commas; small numbers keep up to four significant figures. */
export function formatFull(n: number): string {
  if (n >= 1000) return Math.round(n).toLocaleString("en-US");
  return Number(n.toPrecision(4)).toLocaleString("en-US", { maximumFractionDigits: 3 });
}

/** Short form for tight spots: 63M, 2.5k, 450. */
export function formatShort(n: number): string {
  for (const [v, s] of [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ] as const) {
    if (n >= v) {
      const x = n / v;
      const fixed = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
      return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") + s;
    }
  }
  return n >= 10 ? Math.round(n).toLocaleString("en-US") : String(Number(n.toPrecision(3)));
}

const ONES =
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(
    " ",
  );
const TENS = ",,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety".split(",");

function underThousand(n: number): string {
  const out: string[] = [];
  if (n >= 100) {
    out.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }
  if (n >= 20) out.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  else if (n > 0 || out.length === 0) out.push(ONES[n]);
  return out.join(" ");
}

/** The number in words, rounded where words would get long: "4.2 million". */
export function inWords(n: number): string {
  if (!Number.isInteger(n) && n < 1000) return String(Number(n.toPrecision(4)));
  n = Math.round(n);
  if (n < 1000) return underThousand(n);
  if (n < 1e6) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    return `${underThousand(thousands)} thousand${rest ? ` ${underThousand(rest)}` : ""}`;
  }
  for (const [v, s] of [
    [1e12, "trillion"],
    [1e9, "billion"],
    [1e6, "million"],
  ] as const) {
    if (n >= v) {
      const x = n / v;
      if (Number.isInteger(x) && x < 1000) return `${underThousand(x)} ${s}`;
      return `${Number(x.toPrecision(4))} ${s}`;
    }
  }
  return formatFull(n);
}

/** Rounds to two significant figures, so a dragged range reads 63M rather than 62,817,334. */
export function roundNice(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Number((Math.round(v / p) * p).toPrecision(2));
}
