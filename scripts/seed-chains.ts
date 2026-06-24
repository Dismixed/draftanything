#!/usr/bin/env tsx
/**
 * Seed script: Migrates hard-coded chains from lib/chainlink/puzzles.ts
 * into the database (chain_phrases + chain_puzzles).
 *
 * Usage: npx tsx scripts/seed-chains.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key);

/* ------------------------------------------------------------------ */
/*  Hard-coded chains (mirrors lib/chainlink/puzzles.ts)              */
/* ------------------------------------------------------------------ */

const CHAINS: readonly (readonly string[])[] = [
  ["apple", "juice", "box", "spring", "break"],
  ["book", "mark", "down", "town", "hall"],
  ["snow", "ball", "park", "bench", "mark"],
  ["tooth", "brush", "fire", "place", "mat"],
  ["news", "paper", "weight", "loss", "leader"],
  ["butter", "fly", "wheel", "chair", "lift"],
  ["foot", "ball", "room", "mate", "ship"],
  ["rain", "bow", "tie", "dye", "job"],
  ["eye", "lash", "out", "door", "bell"],
  ["head", "light", "house", "hold", "up"],
  ["sea", "shell", "shock", "wave", "pool"],
  ["life", "guard", "dog", "house", "cat"],
  ["back", "pack", "rat", "race", "car"],
  ["moon", "light", "year", "book", "store"],
  ["hot", "dog", "days", "off", "ramp"],
  ["cup", "cake", "walk", "way", "side"],
  ["arm", "chair", "man", "hole", "punch"],
  ["foot", "print", "shop", "lift", "gate"],
  ["sun", "flower", "pot", "luck", "charm"],
  ["water", "fall", "out", "field", "goal"],
  ["fire", "fly", "paper", "trail", "mix"],
  ["key", "board", "game", "plan", "book"],
  ["star", "fish", "bowl", "cut", "off"],
  ["horse", "power", "plant", "food", "truck"],
  ["air", "port", "side", "walk", "through"],
  ["night", "fall", "back", "bone", "yard"],
  ["cross", "walk", "out", "look", "out"],
  ["hand", "shake", "down", "pour", "over"],
  ["brain", "storm", "cloud", "burst", "pipe"],
  ["love", "bird", "bath", "robe", "hook"],
];

/* ------------------------------------------------------------------ */
/*  Helper: classify difficulty by commonness                         */
/* ------------------------------------------------------------------ */

function classifyDifficulty(phraseCount: number, totalScore: number): string {
  const avg = totalScore / phraseCount;
  if (avg >= 7) return "easy";
  if (avg >= 5) return "medium";
  return "hard";
}

/* ------------------------------------------------------------------ */
/*  Main seed logic                                                    */
/* ------------------------------------------------------------------ */

async function seed() {
  console.log("Seeding chain phrases and puzzles...\n");

  // 1. Extract unique phrases from all chains
  const phraseMap = new Map<string, { word_a: string; word_b: string; score: number }>();

  for (const chain of CHAINS) {
    for (let i = 0; i < chain.length - 1; i++) {
      const a = chain[i].toLowerCase();
      const b = chain[i + 1].toLowerCase();
      const key = `${a}|${b}`;
      if (!phraseMap.has(key)) {
        phraseMap.set(key, { word_a: a, word_b: b, score: 6 }); // default commonness
      }
    }
  }

  console.log(`Found ${phraseMap.size} unique phrase pairs in ${CHAINS.length} chains.\n`);

  // 2. Assign category based on words
  function inferCategory(wordA: string, wordB: string): string | null {
    const joined = `${wordA} ${wordB}`;
    const categories: [RegExp, string][] = [
      [/food|fruit|juice|cake|milk|bread|butter|sugar|salt|apple|cheese|egg|honey|cream|lunch|dinner|breakfast|toast|soup|salad|cookie|candy|chocolate|coffee|tea|drink|wine|beer/iu, "food"],
      [/animal|dog|cat|bird|fish|horse|sheep|cow|pig|pet|zoo|bear|wolf|fox|rabbit/iu, "animals"],
      [/sports|ball|game|team|player|field|goal|score|league|champ|race|ski|surf/iu, "sports"],
      [/water|rain|snow|sun|moon|star|wind|storm|cloud|ocean|sea|river|lake|wave|ice|fire/iu, "nature"],
      [/house|room|door|window|floor|wall|chair|table|bed|bath|kitchen|garden|yard /iu, "home"],
      [/time|day|night|week|month|year|hour|minute|clock/iu, "time"],
      [/money|bank|price|cost|value|pay|tax|loan|fund/iu, "finance"],
      [/car|truck|bus|train|plane|bike|road|highway|bridge|port|airport|traffic|wheel/iu, "transport"],
      [/book|read|write|paper|pen|page|school|class|study|learn|teach|word|letter|story|news/iu, "education"],
      [/music|song|dance|band|piano|guitar|drum/iu, "music"],
      [/health|doctor|nurse|hospital|medic|drug|pill/iu, "health"],
      [/phone|computer|key|screen|app|tech|digital/iu, "technology"],
      [/love|heart|kiss|hug|friend|family|baby/iu, "relationships"],
      [/art|paint|draw|photo|camera|film/iu, "arts"],
    ];

    for (const [pattern, category] of categories) {
      if (pattern.test(joined)) return category;
    }
    return null;
  }

  // 3. Insert phrase pairs
  let phrasesInserted = 0;
  let phrasesSkipped = 0;

  for (const [_, phrase] of phraseMap) {
    const phraseText = `${phrase.word_a} ${phrase.word_b}`;
    const category = inferCategory(phrase.word_a, phrase.word_b);

    const { error } = await db.from("chain_phrases").insert({
      word_a: phrase.word_a,
      word_b: phrase.word_b,
      phrase: phraseText,
      commonness_score: phrase.score,
      category,
      source: "seed",
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") {
        phrasesSkipped++;
        continue;
      }
      console.error(`  Error inserting "${phraseText}": ${error.message}`);
      phrasesSkipped++;
    } else {
      phrasesInserted++;
    }
  }

  console.log(`Phrases: ${phrasesInserted} inserted, ${phrasesSkipped} skipped`);

  // 4. Insert puzzles
  let puzzlesInserted = 0;
  let puzzlesSkipped = 0;

  for (const chain of CHAINS) {
    const words = chain.slice(0, 5);
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }

    const totalScore = phrases.length * 6; // average score
    const difficulty = classifyDifficulty(phrases.length, totalScore);

    const { error } = await db.from("chain_puzzles").insert({
      title: words.join(" → "),
      words,
      phrases,
      difficulty,
      theme: null,
      status: "approved",
      score: totalScore,
      notes: "Migrated from hard-coded chains",
      created_by: "seed",
    });

    if (error) {
      console.log(`  Skipped puzzle "${words.join(" → ")}": ${error.message}`);
      puzzlesSkipped++;
    } else {
      puzzlesInserted++;
    }
  }

  console.log(`Puzzles: ${puzzlesInserted} inserted, ${puzzlesSkipped} skipped`);
  console.log("\nSeed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
