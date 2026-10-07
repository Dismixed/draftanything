/**
 * Mechanical checks on a drafted fun fact. They do not prove a fact true; they catch the ways a
 * model most often goes wrong: quoting a sentence the article does not contain, inventing a number,
 * or writing something that will go out of date.
 */

/** Text with the differences that do not change meaning removed, for comparing quotes. */
export function normalizeForMatch(text: string): string {
  return text
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[   ​﻿]/g, " ")
    .replace(/\[\w{1,3}\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Whether the quote appears word for word in the article. A short quote proves nothing. */
export function quoteInArticle(quote: string, article: string): boolean {
  const needle = normalizeForMatch(quote);
  return needle.length >= 25 && normalizeForMatch(article).includes(needle);
}

const numbersIn = (text: string) => (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));

/** Numbers the fact states that its supporting sentence does not. */
export function unsupportedNumbers(fact: string, evidence: string): string[] {
  const allowed = new Set(numbersIn(evidence));
  return numbersIn(fact).filter((n) => !allowed.has(n));
}

const TIME_RELATIVE = /\b(currently|as of|today|now|nowadays|still|at present|these days|recently|latest|this year|so far)\b/i;

/** Words that make a fact false the day something changes. */
export function timeRelativeWords(fact: string): string | null {
  return TIME_RELATIVE.exec(fact)?.[0] ?? null;
}

/**
 * Topics a family game's fun fact should steer clear of. A word list is blunt and will turn away
 * some harmless facts, which is the right trade when nobody reads each one before players do.
 */
const SENSITIVE =
  /\b(kill\w*|murder\w*|assassin\w*|execut(?:ed|ion|ions|ioner)|death|deaths|dead|died|dies|die|dying|suicid\w*|rape\w*|sexual\w*|sex|assault\w*|punch\w*|torture\w*|massacre\w*|genocid\w*|abus\w*|scandal\w*|affair|terror\w*|bomb\w*|slave\w*|prostitut\w*|cocaine|heroin|drugs?|dictator\w*|coup|corrupt\w*|war|wars|warfare|killed|victims?|riots?|invasion|invaded|massacred|hostages?|imprison\w*|prison|jail\w*|funeral\w*|tomb|grave|burial|buried|cannibal\w*|naked|nude)\b/i;

/** The sensitive word a fact contains, if any. */
export function sensitiveWord(fact: string): string | null {
  return SENSITIVE.exec(fact)?.[0] ?? null;
}

/** Why a fact would not read well in the recap, if it would not. */
export function shapeIssue(fact: string, maxLength = 260): string | null {
  if (fact.length > maxLength) return `longer than ${maxLength} characters`;
  const sensitive = sensitiveWord(fact);
  if (sensitive) return `about a sensitive topic ("${sensitive}")`;
  if (/https?:\/\//i.test(fact)) return "contains a link";
  if ((fact.match(/[.!?](\s|$)/g) ?? []).length > 2) return "more than two sentences";
  return null;
}
