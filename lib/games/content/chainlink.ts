import type { GameContent } from "./types";

export const chainlink: GameContent = {
  angle: "daily word chain game",
  title: "Chain Link: Daily Word Chain Game",
  description:
    "A free daily word chain game. Each word pairs with the one before it to make a common phrase. One new chain every day, played in your browser.",
  intro:
    "Chain Link is a daily word chain game. Every word in the chain pairs with the one before it to make a common phrase, and you work out the chain one word at a time.",
  sections: [
    {
      heading: "How to play",
      body: [
        "The first word of the chain is given to you. Your job is to find the next one. It pairs with the word above it to form a common phrase or compound word.",
        "You guess one word at a time, and you only see the first letter of the word you are working on. Type your guess. If it is right, the word locks in and you move down the chain.",
        "Each wrong guess reveals one more letter of the current word, and it also uses up one of your mistakes. You have four for the whole chain, not for each word, so the fourth wrong guess ends the puzzle. Asking for a hint reveals a letter too, and counts against the same allowance.",
        "There is one chain a day, and it is the same chain for all players.",
      ],
    },
    {
      heading: "A worked example",
      body: [
        "Say the chain starts with SNOW and the next word begins with B. Snow and what? Snowball. BALL locks in.",
        "Now BALL is the word you are linking from, and the next word starts with P. Ballpark. PARK locks in, and the chain carries on from there: you would now be looking for a word that follows park.",
        "Notice that each word does two jobs. BALL finishes one phrase and starts the next. That is the trick to the whole chain link game: the answer has to make sense with the word above it, and the word below it will have to make sense with your answer.",
      ],
    },
    {
      heading: "Tips for hard links",
      body: [
        "Say the word above out loud and let phrases come to you. Most links are things you have heard many times: compound words, two-word phrases, names of everyday objects.",
        "Use the first letter properly. Run through phrases that start with the word above, and keep only the ones whose second half begins with that letter.",
        "Do not burn guesses early. A wrong guess gives you a letter, which helps, but you can only afford three across the entire word chain puzzle. If two candidates fit, ask which one is more likely to start a phrase of its own, since the next link has to follow from it.",
        "If you are stuck, look at the length of the word. The number of blank tiles rules out most of your candidates before you type anything.",
      ],
    },
  ],
  faq: [
    {
      question: "How does the chain link game work?",
      answer:
        "You are given the first word and have to find each following word in turn. Every word pairs with the one before it to make a common phrase, such as snow, ball, park: snowball, ballpark.",
    },
    {
      question: "How many wrong guesses do I get?",
      answer:
        "Three across the whole chain. Every wrong guess reveals another letter of the current word, and a fourth wrong guess ends the puzzle.",
    },
    {
      question: "Is there a new word chain every day?",
      answer:
        "Yes. Chain Link is a daily word chain game with one new chain each day, and all players get the same one. If you are looking for the word chain game today, it is at the top of this page.",
    },
    {
      question: "Do the words have to be compound words?",
      answer:
        "No. Any common pairing counts, whether it is written as one word, like snowball, or as two. In that sense it is a word link game more than a compound word quiz.",
    },
    {
      question: "Is Chain Link free?",
      answer:
        "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
  ],
};
