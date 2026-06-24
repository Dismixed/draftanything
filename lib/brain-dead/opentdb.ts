/**
 * Shared OpenTDB API utilities for Brain Dead trivia.
 */
import type { Difficulty } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OpenTDBQuestion {
  category: string;
  type: "multiple" | "boolean";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TransformedQuestion {
  q: string;
  a: string[];
  c: number;
  d: Difficulty;
}

/* ------------------------------------------------------------------ */
/*  HTML entity decoding                                               */
/* ------------------------------------------------------------------ */

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&eacute;": "é",
  "&Eacute;": "É",
  "&egrave;": "è",
  "&Egrave;": "È",
  "&agrave;": "à",
  "&Agrave;": "À",
  "&aacute;": "á",
  "&Aacute;": "Á",
  "&iacute;": "í",
  "&Iacute;": "Í",
  "&oacute;": "ó",
  "&Oacute;": "Ó",
  "&uacute;": "ú",
  "&Uacute;": "Ú",
  "&ecirc;": "ê",
  "&Ecirc;": "Ê",
  "&ocirc;": "ô",
  "&Ocirc;": "Ô",
  "&uuml;": "ü",
  "&Uuml;": "Ü",
  "&ccedil;": "ç",
  "&Ccedil;": "Ç",
  "&ntilde;": "ñ",
  "&Ntilde;": "Ñ",
  "&lt;": "<",
  "&gt;": ">",
  "&iexcl;": "¡",
  "&iquest;": "¿",
  "&mdash;": "—",
  "&ndash;": "–",
  "&shy;": "\u00AD",
};

export function decodeHtml(text: string): string {
  let result = text;
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    result = result.split(entity).join(char);
  }
  // Handle numeric entities like &#123;
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code)),
  );
  return result;
}

/* ------------------------------------------------------------------ */
/*  Difficulty mapping                                                 */
/* ------------------------------------------------------------------ */

function mapDifficulty(d: string): Difficulty {
  switch (d) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
    default:
      return 2;
  }
}

/* ------------------------------------------------------------------ */
/*  Question transformation                                            */
/* ------------------------------------------------------------------ */

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function transformQuestion(raw: OpenTDBQuestion): TransformedQuestion {
  const answers = [raw.correct_answer, ...raw.incorrect_answers];
  const shuffled = shuffleArray(answers);
  const correctIndex = shuffled.indexOf(raw.correct_answer);

  return {
    q: decodeHtml(raw.question),
    a: shuffled.map((a) => decodeHtml(a)),
    c: correctIndex,
    d: mapDifficulty(raw.difficulty),
  };
}

/* ------------------------------------------------------------------ */
/*  Category mapping from our CategoryId → OpenTDB category number     */
/* ------------------------------------------------------------------ */

export const CATEGORY_MAP: Record<string, number> = {
  general: 9,
  sports: 21,
  movies: 11,
  music: 12,
  science: 17,
  history: 23,
  tech: 18,
  geography: 22,
};
