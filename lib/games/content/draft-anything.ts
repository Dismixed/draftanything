import type { GameContent } from "./types";

export const draftAnything: GameContent = {
  angle: "draft anything with friends online",
  title: "Draft Anything With Friends Online",
  description:
    "A free party game for 2 to 6 players. Draft anything with friends online: pick a topic, take turns choosing, defend your picks and let a judge decide.",
  intro:
    "Draft Anything lets you draft anything with friends online. Pick a topic, take turns choosing from it, then argue for your picks and find out whose lineup wins.",
  sections: [
    {
      heading: "How to play",
      body: [
        "One person creates a room and chooses a topic. It can be anything you could make a list of: films, snacks, athletes, holiday destinations. The room gets a short code.",
        "Everyone else joins with that code and a display name. Nobody needs an account. A room holds 2 to 6 players.",
        "When the draft starts, players take turns picking from a pool of options for the topic. Once something is picked, it is gone. After the final round, each player has a lineup.",
        "Then comes the argument. Each player defends their picks, and the judging begins.",
      ],
    },
    {
      heading: "How judging works",
      body: [
        "You choose how the winner is decided when you set up the room. With the AI judge, an AI weighs every lineup and ranks them. With a community vote, the players decide. Hybrid uses both.",
        "The AI judge has a personality you can pick: an analyst who takes the picks seriously, a hype voice, or one that roasts everybody. You can also write your own.",
      ],
    },
    {
      heading: "Fun draft ideas with friends",
      body: [
        "The best topics are ones where everybody has an opinion and nobody is objectively right. Some good draft topics the game suggests: best movies of the 2010s, ultimate comfort foods, greatest athletes of all time, best video games ever, best TV shows to binge, greatest albums of all time, dream vacation destinations, and things you would bring to a desert island.",
        "You can type any topic you like, and the game will suggest some if you are short of ideas.",
      ],
    },
    {
      heading: "Setting up a room",
      body: [
        "The host sets the number of players and the number of rounds, from 1 to 10. More rounds means bigger lineups and a longer game.",
        "The pick order can be standard, where the order repeats every round; snake, where it reverses each round; or random.",
        "A turn timer is optional, for groups that take too long to decide.",
        "When a game ends, you can start a rematch from the results screen without setting everything up again.",
      ],
    },
  ],
  faq: [
    {
      question: "How many people can play Draft Anything?",
      answer:
        "2 to 6 in one room.",
    },
    {
      question: "Do we need accounts?",
      answer:
        "No. The host creates a room, and everyone joins with the room code and a name.",
    },
    {
      question: "What can we draft?",
      answer:
        "Anything. You type the topic yourself, so it can be films, foods, athletes, places or something only your group would understand.",
    },
    {
      question: "Who decides the winner?",
      answer:
        "That is up to the host. Choose an AI judge, a vote among the players, or a mix of both.",
    },
    {
      question: "Is Draft Anything free?",
      answer:
        "Yes. It is a draft anything website that runs in the browser, with nothing to download.",
    },
  ],
};
