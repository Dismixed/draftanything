import type { Puzzle } from "./types";

/* ------------------------------------------------------------------ */
/*  Themed word database                                               */
/* ------------------------------------------------------------------ */

interface ThemedList {
  theme: string;
  words: readonly string[];
}

const THEMES: readonly ThemedList[] = [
  {
    theme: "Animals",
    words: [
      "alligator", "ant", "ape", "bat", "bear", "beaver", "bird",
      "buffalo", "camel", "cat", "chicken", "cow", "crab", "deer",
      "dog", "dolphin", "donkey", "duck", "eagle", "eel", "elephant",
      "emu", "falcon", "ferret", "fish", "fox", "frog", "giraffe",
      "goat", "goose", "gorilla", "hamster", "hare", "hawk", "horse",
      "iguana", "jaguar", "jellyfish", "kangaroo", "koala", "lemur",
      "leopard", "lion", "lizard", "llama", "lobster", "lynx",
      "monkey", "moose", "mouse", "otter", "owl", "panda", "panther",
      "parrot", "penguin", "pig", "pigeon", "rabbit", "raccoon",
      "rat", "raven", "rhino", "rooster", "seal", "shark", "sheep",
      "shrimp", "skunk", "snake", "sparrow", "spider", "squid",
      "squirrel", "swan", "tiger", "toad", "trout", "turkey",
      "turtle", "walrus", "whale", "wolf", "zebra",
    ],
  },
  {
    theme: "Countries",
    words: [
      "albania", "algeria", "argentina", "australia", "austria",
      "bahrain", "bangladesh", "belgium", "brazil", "cambodia",
      "canada", "chad", "china", "colombia", "croatia", "cuba",
      "denmark", "ecuador", "egypt", "estonia", "ethiopia", "fiji",
      "finland", "france", "georgia", "germany", "ghana", "greece",
      "hungary", "iceland", "india", "indonesia", "iran", "iraq",
      "ireland", "israel", "italy", "jamaica", "japan", "jordan",
      "kenya", "laos", "latvia", "lebanon", "libya", "lithuania",
      "malaysia", "mali", "malta", "mexico", "monaco", "mongolia",
      "morocco", "nepal", "netherlands", "nigeria", "norway",
      "oman", "pakistan", "panama", "peru", "poland", "portugal",
      "qatar", "romania", "russia", "rwanda", "senegal", "serbia",
      "singapore", "slovakia", "spain", "sudan", "sweden", "syria",
      "taiwan", "tanzania", "thailand", "tunisia", "turkey",
      "uganda", "ukraine", "uruguay", "uzbekistan", "vietnam",
      "yemen", "zambia", "zimbabwe",
    ],
  },
  {
    theme: "Foods",
    words: [
      "apple", "apricot", "avocado", "bacon", "bagel", "banana",
      "beans", "beef", "bread", "broccoli", "burger", "butter",
      "cake", "candy", "cheese", "cherry", "chicken", "chili",
      "chocolate", "cookie", "corn", "cream", "croissant", "curry",
      "donut", "dumpling", "egg", "enchilada", "fish", "fondue",
      "garlic", "gelatin", "ginger", "granola", "grape", "honey",
      "jam", "jelly", "ketchup", "kiwi", "lamb", "lemon", "lentil",
      "lettuce", "lime", "lobster", "macaroni", "mango", "meatball",
      "melon", "milk", "muffin", "mushroom", "noodle", "oatmeal",
      "olive", "onion", "orange", "oyster", "pancake", "pasta",
      "pastry", "peach", "peanut", "pear", "pepper", "pickle",
      "pie", "pineapple", "pizza", "plantain", "plum", "popcorn",
      "pork", "potato", "pretzel", "pudding", "pumpkin", "quiche",
      "radish", "raisin", "raspberry", "rice", "salmon", "sandwich",
      "sausage", "shrimp", "soup", "spaghetti", "spinach", "squash",
      "steak", "stew", "strawberry", "sushi", "syrup", "taco",
      "tamale", "toast", "tomato", "tortilla", "tuna", "vanilla",
      "waffle", "walnut", "watermelon", "yogurt", "zucchini",
    ],
  },
  {
    theme: "Space",
    words: [
      "andromeda", "asteroid", "astronaut", "astronomer", "atmosphere",
      "aurora", "comet", "constellation", "cosmos", "eclipse",
      "galaxy", "jupiter", "mars", "mercury", "meteor", "milkyway",
      "moon", "nebula", "neptune", "orbit", "planet", "pluto",
      "pulsar", "rocket", "satellite", "saturn", "solar", "spacecraft",
      "spaceship", "star", "sun", "telescope", "universe", "uranus",
      "venus",
    ],
  },
  {
    theme: "Sports",
    words: [
      "archery", "badminton", "baseball", "basketball", "bowling",
      "boxing", "cricket", "cycling", "diving", "fencing", "football",
      "golf", "gymnastics", "hockey", "jogging", "judo", "karate",
      "kickboxing", "lacrosse", "marathon", "polo", "racing",
      "racquetball", "rugby", "running", "sailing", "skating",
      "skiing", "soccer", "softball", "squash", "surfing", "swimming",
      "tennis", "track", "triathlon", "volleyball", "walking",
      "wrestling", "yoga",
    ],
  },
  {
    theme: "Music",
    words: [
      "accordion", "banjo", "bass", "cello", "clarinet", "drum",
      "fiddle", "flute", "guitar", "harmonica", "harp", "harpsichord",
      "keyboard", "lute", "lyre", "mandolin", "marimba", "oboe",
      "organ", "piano", "piccolo", "recorder", "saxophone",
      "tambourine", "trumpet", "tuba", "ukulele", "vibraphone",
      "viola", "violin", "xylophone",
    ],
  },
  {
    theme: "Nature",
    words: [
      "alpine", "arctic", "beach", "canyon", "cave", "cliff", "cloud",
      "coast", "coral", "desert", "dune", "earth", "field", "flower",
      "forest", "glacier", "grassland", "hill", "island", "jungle",
      "lake", "landscape", "meadow", "mountain", "ocean", "prairie",
      "rainforest", "reef", "river", "rock", "savanna", "sea",
      "sky", "snow", "stone", "storm", "stream", "sun", "swamp",
      "thunder", "trail", "tree", "valley", "volcano", "waterfall",
      "wave", "wetland", "wilderness", "wind",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32)                                           */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Puzzle generator — picks 5 random words from a theme               */
/* ------------------------------------------------------------------ */

const WORDS_PER_PUZZLE = 5;

function generatePuzzle(seed: number): Puzzle {
  const rng = mulberry32(seed);

  // Pick a theme deterministically
  const themeIndex = Math.floor(rng() * THEMES.length);
  const chosen = THEMES[themeIndex];

  // Pick 5 random distinct words from the theme
  const shuffled = seededShuffle(chosen.words, rng);
  const words = shuffled.slice(0, WORDS_PER_PUZZLE);

  return { theme: chosen.theme, words };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function getDailyPuzzle(date?: Date): Puzzle {
  const d = date ?? new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return generatePuzzle(seed);
}

export function getRandomPuzzle(): Puzzle {
  return generatePuzzle(Date.now());
}

export function getDateString(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
