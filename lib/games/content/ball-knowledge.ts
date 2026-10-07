import type { GameContent } from "./types";

export const ballKnowledge: GameContent = {
  angle: "name as many as you can game",
  title: "Name As Many As You Can Game: Ball Knowledge",
  description:
    "A free name as many as you can game. One new category every day and 60 seconds on the clock. Type every answer you can think of before time runs out.",
  intro:
    "Ball Knowledge is a name as many as you can game. You get one category and 60 seconds, and you type every answer you can think of before the clock runs out.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Every day there is one category, and it is the same for all players. It might be pizza toppings, dog breeds or state capitals.",
        "When you start, a 60-second clock begins. Type an answer and press enter. If it belongs in the category it is added to your list and you can go straight on to the next one.",
        "When the clock hits zero your run is over and your score is the number of answers that were accepted. You get one run a day, and the next day brings a new category.",
      ],
    },
    {
      heading: "What counts as an answer",
      body: [
        "An answer has to be a real member of the category. Duplicates are rejected, and so are wrong guesses.",
        "Spelling does not have to be perfect. A near miss on a tricky word will usually be accepted, so do not stop to correct a typo while the clock is running.",
        "Obscure or joke answers will not make the cut. If you would have to argue for it, it probably will not count.",
      ],
    },
    {
      heading: "Tips for a higher score",
      body: [
        "Start with the obvious answers and type them fast. The first ten seconds are where most of your score comes from.",
        "When you slow down, change how you are searching. For name as many as you can categories it helps to go by letter of the alphabet, by region, by size, or by the ones you have personally seen or eaten.",
        "Keep typing. A rejected answer costs you a second or two; sitting and thinking costs more.",
        "If you have played a name 5 things game at a party, this is the same skill at speed: a 60-second category game rewards whoever keeps a list moving.",
      ],
    },
    {
      heading: "Why it is called Ball Knowledge",
      body: [
        "Ball knowledge is slang for knowing your subject properly. It started with sports fans, where having ball knowledge means you really understand the game.",
        "This game borrows the phrase and applies it to everything else. The daily categories are general knowledge, and they are not sports quizzes.",
      ],
    },
  ],
  faq: [
    {
      question: "Is Ball Knowledge a sports quiz?",
      answer:
        "No. The name is slang for knowing a subject well. The categories are general knowledge, such as foods, animals and places.",
    },
    {
      question: "How long do I get?",
      answer:
        "60 seconds. The clock starts when you begin and your run ends when it reaches zero.",
    },
    {
      question: "Does spelling matter?",
      answer:
        "Not much. Close spellings are accepted, but the answer has to be a real member of the category.",
    },
    {
      question: "What kinds of categories are there?",
      answer:
        "One new category every day, on everyday topics. Examples include pizza toppings, dog breeds and state capitals.",
    },
    {
      question: "Is Ball Knowledge free?",
      answer:
        "Yes. This name as many as you can game runs in your browser, with nothing to download and no account needed.",
    },
  ],
};
