import type { GameContent } from "./types";

export const slipperySlope: GameContent = {
  angle: "trivia game with friends online",
  title: "Slippery Slope: Trivia Game With Friends Online",
  description:
    "A free trivia game with friends online. Bet on how well you know a topic, answer to climb a 50-square board, and watch out for the slides.",
  intro:
    "Slippery Slope is a trivia game with friends online, played on a board. Answer questions to climb towards square 50, and try not to land on anything that sends you back down.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Players take turns. On your turn you are shown a topic and asked how confident you are. You place a bet from 1 to 10.",
        "Then you get a question. Answer correctly and you move forward by the number you bet. Answer wrongly and you slide back by half of it.",
        "After you move, the square you land on may send you somewhere else. The first player to reach square 50 wins.",
      ],
    },
    {
      heading: "Wagers, climbs and slides",
      body: [
        "The bet is the heart of the game. A higher bet moves you further, but it also brings a harder question: bets of 1 to 3 get the easiest questions and bets of 9 or 10 get the hardest.",
        "So a cautious player creeps forward with safe answers, and a bold one leaps ahead or tumbles back. Being wrong on a bet of 10 costs you five squares.",
        "The board adds its own swings. Six squares have climbs that carry you up the board and six have slides that drop you down, and they are placed differently every game, so there is no route to memorise.",
        "If you know snakes and ladders, trivia is the only new part. Think of it as a snakes and ladders quiz game where the dice are replaced by what you know.",
      ],
    },
    {
      heading: "Solo and multiplayer",
      body: [
        "You can play on your own against computer opponents, choosing the category of questions before you start.",
        "For free online trivia with friends, create a room and share the code. Up to 6 people can join, each from their own phone or computer, and nobody needs an account.",
      ],
    },
    {
      heading: "Tips",
      body: [
        "Early on, bet low on topics you do not know and save the big bets for your best subjects.",
        "Watch where a move would land you. A bet that puts you on a slide is worse than a smaller one that does not.",
        "Near the end, remember that you only need to reach square 50. A small, safe bet can win the game.",
      ],
    },
  ],
  faq: [
    {
      question: "Is Slippery Slope like snakes and ladders?",
      answer:
        "Yes, with trivia in place of dice. You move by answering questions, and the board has climbs and slides. Some people would call it snakes and ladders trivia.",
    },
    {
      question: "Can I play on my own?",
      answer:
        "Yes. There is a solo mode as well as multiplayer rooms.",
    },
    {
      question: "How do friends join my game?",
      answer:
        "Create a room and send them the room code. They enter it on the Slippery Slope page along with a name.",
    },
    {
      question: "Do we need accounts?",
      answer:
        "No. A room code and a display name are all anyone needs.",
    },
    {
      question: "Is Slippery Slope free?",
      answer:
        "Yes. It runs in the browser with nothing to download.",
    },
  ],
};
