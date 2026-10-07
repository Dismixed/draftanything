import type { GameContent } from "./types";

export const brainDead: GameContent = {
  angle: "daily trivia game",
  title: "Brain Dead: Daily Trivia Game",
  description:
    "A free daily trivia game with fifteen questions that get harder as you go. One wrong answer ends your run. Play in your browser, no account needed.",
  intro:
    "Brain Dead is a daily trivia game with one rule that changes everything: one wrong answer ends your run. There are fifteen questions a day, and getting through all of them takes a clean run.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Every day there is a set of fifteen questions, and it is the same set for every player. Questions come one at a time, each with a timer.",
        "Choose your answer before the time runs out. Get it right and you move to the next question. Get it wrong, or let the clock run down, and the run is over on the spot.",
        "You get one daily run. When it ends, you see your score and how far you got, and you can add it to the leaderboard. A fresh set of fifteen arrives the next day.",
      ],
    },
    {
      heading: "How scoring works",
      body: [
        "Harder questions are worth more points, and the questions get harder the further you go. Answering quickly earns a bonus on top.",
        "That gives you two ways to score well: survive longer, or answer faster. The best runs do both, but speed is risky, because one wrong answer ends your run no matter how many points you have banked.",
      ],
    },
    {
      heading: "Daily and free play",
      body: [
        "The daily is the main event: one attempt, the same questions for everybody, and a leaderboard to compare scores.",
        "If you want more after that, free play lets you pick a category and play as many runs as you like. It is a good way to practise, or to keep going when your daily ended on question three.",
      ],
    },
    {
      heading: "Tips for a longer run",
      body: [
        "Read the whole question. Many early exits come from answering the question you expected, not the one that was asked.",
        "Use the clock. A bonus for speed is worth less than staying alive, so take the extra second when you are unsure.",
        "Rule answers out. With one obviously wrong option gone, a guess stops being a long shot.",
        "If you enjoy daily trivia games like Wordle, where everyone gets the same puzzle and compares results, treat this as a daily quiz game with higher stakes.",
      ],
    },
  ],
  faq: [
    {
      question: "What happens when I get a question wrong?",
      answer:
        "Your run ends immediately. Brain Dead is a daily trivia game where one wrong answer, or one timeout, finishes the day's attempt.",
    },
    {
      question: "How many questions are in the daily?",
      answer:
        "Fifteen. Everyone gets the same fifteen on a given day.",
    },
    {
      question: "Is there a time limit?",
      answer:
        "Yes. Each question is timed, and running out of time counts the same as a wrong answer.",
    },
    {
      question: "Can I play more than once a day?",
      answer:
        "The daily can be played once. Free play has no limit and lets you choose a category.",
    },
    {
      question: "Is Brain Dead free?",
      answer:
        "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
  ],
};
