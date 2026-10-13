import { JSDOM } from "jsdom";
import { sleep } from "./async-pool";

/** Wikimedia asks automated clients to identify themselves. */
const HEADERS = { "User-Agent": "Stim-Labs-AnyGuessr/1.0 (https://stimlabs.games; fact sourcing)" };

/** Courtesy gap between article requests. */
const MIN_GAP_MS = 1200;
const MAX_ATTEMPTS = 6;

export function wikiArticleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.trim().replace(/ /g, "_"))}`;
}

/** The English Wikipedia articles a clue's fact may come from, best first. */
export function articleTitlesFor(entry: {
  clue_type: string;
  wiki_title: string | null;
  country_common: string;
  notes: string | null;
}): string[] {
  if (entry.clue_type === "flag") return [`Flag of ${entry.country_common}`, `Flag of the ${entry.country_common}`];

  if (entry.clue_type === "written_language") {
    // The language is recorded in the notes as `Hindi: "What is your name?"`.
    const match = /(?:^|\|\s*)([A-Z][\w' -]*?)(?:\s*\([^)]*\))?:\s*"/.exec(entry.notes ?? "");
    const language = match?.[1]?.trim();
    return language ? [`${language} language`, language] : [];
  }

  return entry.wiki_title?.trim() ? [entry.wiki_title.trim()] : [];
}

let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/** Runs one request at a time, with a gap, so a whole run stays polite. */
function throttled<T>(work: () => Promise<T>): Promise<T> {
  const next = chain.then(async () => {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return work();
  });
  chain = next.catch(() => undefined);
  return next;
}

/** The article rendered as HTML, or null when it does not exist. */
export async function fetchRenderedArticle(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, "_"))}&action=render`;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await throttled(() => fetch(url, { headers: HEADERS }));
    if (res.status === 404) return null;
    if (res.ok) return res.text();
    if (res.status !== 429 && res.status < 500) throw new Error(`Wikipedia ${res.status} for ${title}`);
    await sleep(2000 * 2 ** attempt);
  }
  throw new Error(`Wikipedia kept refusing ${title}`);
}

/** Headings that end the article's prose. */
const END_SECTIONS = /^(see also|references|notes|footnotes|citations|bibliography|further reading|external links|sources|gallery)$/i;

const REMOVE =
  "style, script, link, meta, table, figure, .thumb, .gallery, sup.reference, .reference, .mw-editsection, .noprint, " +
  ".navbox, .hatnote, .shortdescription, .mw-empty-elt, .reflist, .refbegin, .metadata, .sidebar, .infobox";

/**
 * The article's prose as plain text, one paragraph or list item per line, from the lead to the first
 * closing section. Facts are drawn from, and checked against, exactly this text.
 */
export function extractArticleText(html: string, maxChars = 14_000): string {
  const doc = new JSDOM(html).window.document;
  doc.querySelectorAll(REMOVE).forEach((node) => node.remove());

  const lines: string[] = [];
  let length = 0;
  for (const el of doc.body.querySelectorAll("h2, p, li")) {
    const text = (el.textContent ?? "").replace(/\[\w{1,3}\]/g, "").replace(/\s+/g, " ").trim();
    if (el.tagName === "H2") {
      if (END_SECTIONS.test(text)) break;
      continue;
    }
    if (text.length < 25) continue;
    if (el.tagName === "P" && el.closest("li")) continue;
    if (el.tagName === "LI" && el.querySelector("li")) continue;
    if (length + text.length > maxChars) break;
    lines.push(text);
    length += text.length + 1;
  }
  return lines.join("\n");
}
