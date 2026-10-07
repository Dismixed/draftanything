import type { GameContent } from "./types";

export const gettingWarmer: GameContent = {
  angle: "guess the word from clues game",
  title: "Getting Warmer: Guess the Word From Clues Game",
  description:
    "A free guess the word from clues game. Start with two clues to a secret word or phrase, and get another with every wrong guess. New puzzle every day.",
  intro:
    "Getting Warmer is a guess the word from clues game. You start with two clues to a secret word or phrase, and every wrong guess gets you one more.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Each day there is one secret answer. It might be a single word or a short phrase. You begin with two clues that point towards it.",
        "Type a guess. If you are right, you are done. If you are wrong, a new clue appears and you try again. There is no limit on guesses, so you cannot be knocked out.",
        "The aim is to solve it in as few guesses as you can. Your result is your guess count, and the daily leaderboard ranks players by fewest guesses.",
      ],
    },
    {
      heading: "How the clues work",
      body: [
        "Clues are short, often a single word, and each one describes the answer from a different angle. As the name suggests, they get warmer: every new clue brings you closer. It is a getting warmer word game in the literal sense.",
        "If you use up all the written clues, the game does not leave you stuck. It keeps producing hints, and as a last resort it starts revealing letters of the answer.",
        "This makes it a different kind of daily word clue game from the ones that score how close each guess is. Here your guesses are not rated. The clues do the work, and your job is to connect them.",
      ],
    },
    {
      heading: "Tips for fewer guesses",
      body: [
        "Hold off on the first guess. Two clues rarely point to one thing, so think of several answers that fit both before you type any of them.",
        "When a new clue arrives, test it against your whole shortlist and drop everything it rules out. The right answer has to fit every clue so far, not just the latest.",
        "Remember the answer can be a phrase. If no single word fits, try two.",
        "Guess the plain option. In a guess the word game with clues, the everyday answer is right far more often than the clever one.",
      ],
    },
  ],
  faq: [
    {
      question: "How many guesses do I get?",
      answer:
        "As many as you need. Guesses are unlimited, and every wrong one reveals another clue.",
    },
    {
      question: "What happens if I run out of clues?",
      answer:
        "The game keeps giving you new hints, and then starts revealing letters, so there is always a way to finish.",
    },
    {
      question: "Is Getting Warmer a hot and cold word game?",
      answer:
        "No. Hot and cold games rate how close in meaning each guess is. Getting Warmer is a guess the word from clues game: you get a new written clue after each miss.",
    },
    {
      question: "How is the leaderboard ranked?",
      answer:
        "By fewest guesses. Solving it on your first guess puts you at the top.",
    },
    {
      question: "Is Getting Warmer free?",
      answer:
        "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
  ],
};
