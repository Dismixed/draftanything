export function buildTopicsPrompt(options?: {
  interests?: string;
  exclude?: string[];
}): { system: string; user: string } {
  const parts: string[] = [
    "You are a creative brainstorming assistant for a multiplayer draft game.",
    "Suggest interesting, fun, and diverse topics that players would enjoy drafting.",
    "Topics should be specific enough to guide item generation but broad enough for creative picks.",
    'Each topic must be 2-80 characters and self-explanatory (e.g. "Best Sci-Fi Movies of the 80s", "Top Vacation Destinations").',
  ];

  if (options?.interests) {
    parts.push(
      `The user is interested in: ${options.interests}. Tailor suggestions to these interests while still keeping variety.`,
    );
  }

  if (options?.exclude && options.exclude.length > 0) {
    parts.push(
      `Do NOT suggest any of these topics (they were already shown): ${options.exclude.join(", ")}.`,
    );
  }

  const userParts: string[] = ["Suggest 6 creative topics for a draft game."];

  if (!options?.interests) {
    userParts.push("Cover a variety of categories (entertainment, food, travel, sports, technology, etc.).");
  }

  userParts.push("Return them as a JSON array of strings.");

  return {
    system: parts.join(" "),
    user: userParts.join(" "),
  };
}
