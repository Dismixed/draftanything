import type { GameContent } from "./types";

export const anyguessr: GameContent = {
  angle: "guess the country from clues",
  title: "AnyGuessr: Guess the Country From Clues",
  description:
    "A free daily geography game. Guess the country from clues like a flag, a currency or a landmark, then pin it on the map. Close guesses still score.",
  intro:
    "AnyGuessr is a daily game where you guess the country from clues. Each of the ten rounds gives you one clue, and you answer by picking a country on the map.",
  sections: [
    {
      heading: "How to play",
      body: [
        "A daily puzzle has ten rounds, and everyone gets the same ten. Each round shows a single clue about a country.",
        "Tap the map and choose the country you think the clue belongs to. You get one guess per round, so there is no second try.",
        "After each guess you see how close you were and how many points you earned, then the next round begins. When all ten are done you get a total for the day. You can play through once, and a new set of countries arrives the next day.",
      ],
    },
    {
      heading: "The kinds of clue",
      body: [
        "Each round uses a different type of clue: a flag, a currency, a sports jersey, a brand, a landmark, a written language, a person, a food, an environment and wildlife.",
        "Some are direct. If you have played a guess the country by flag quiz, that round is familiar ground. Others take more thought: a banknote, a sign in an unfamiliar script, or an animal that only lives in one part of the world.",
        "That mix is what sets it apart from a country guessing game like Wordle, where you narrow down one answer over several tries. Here you get ten separate countries and one shot at each.",
      ],
    },
    {
      heading: "How scoring works",
      body: [
        "Each round is worth up to 100 points, for a possible 1,000 across the day. Pick the right country and you get the full 100.",
        "A wrong pick is not a zero. Points depend on how far your guess is from the answer, so a nearby country still earns partial credit, and the further away you are the less you get.",
      ],
    },
    {
      heading: "Tips",
      body: [
        "When you are unsure, guess towards the middle of the region you suspect. Because near misses score, a central pick limits the damage.",
        "Use language clues carefully. A script can narrow things to a region, but several countries often share one.",
        "For wildlife and environment rounds, think about climate first, then about which countries have that climate.",
        "Treat it as a daily geography game for learning, too. The countries you miss today are the ones you will recognise next time.",
      ],
    },
  ],
  faq: [
    {
      question: "How many countries are in each daily puzzle?",
      answer:
        "Ten, one per round, each with a different type of clue.",
    },
    {
      question: "Do I get points for a near miss?",
      answer:
        "Yes. Points depend on how close your guess is, so a nearby country still scores.",
    },
    {
      question: "Is AnyGuessr like GeoGuessr?",
      answer:
        "Both are geography guessing games, but they work differently. In AnyGuessr you guess the country from clues such as flags, currencies and landmarks. There is no street-view imagery.",
    },
    {
      question: "Can I play more than once a day?",
      answer:
        "No. It is a country guessing game with one daily puzzle: ten rounds, played once.",
    },
    {
      question: "Is AnyGuessr free?",
      answer:
        "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
  ],
};
