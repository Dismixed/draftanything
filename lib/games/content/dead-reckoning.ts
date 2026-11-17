import type { GameContent } from "./types";

export const deadReckoning: GameContent = {
  angle: "daily estimation game",
  title: "Dead Reckoning: Daily Estimation Game",
  description:
    "A free daily estimation game. Seven questions, one number each. The closer your guess, the quicker you sail between islands. New voyage every day.",
  intro:
    "Dead Reckoning is a daily estimation game. You answer seven questions with a single number each, and the closer you get, the faster your ship reaches the next island.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Each day's voyage has seven islands, and each island asks one question with a number for an answer: how many keys on a piano, how tall Mount Everest is, how many calories in a Big Mac.",
        "Type your best estimate before the 20-second fuse burns out. Shorthand works, so 4m, 2.5k and 1.2b are all fine. If the fuse runs out, whatever you have typed is taken.",
        "Every crossing takes between one and five days, depending on how close you were. Your score for the day is the total days at sea. A perfect voyage takes seven.",
      ],
    },
    {
      heading: "How close counts",
      body: [
        "Closeness is measured as a ratio, so being 10% out on a big number counts the same as being 10% out on a small one.",
        "Within 10% of the answer is a Dead Reckoning, and the crossing takes one day. Within 25% takes a day and a half, within 50% takes two days, within 2× takes two and a half, within 5× takes three, and anything further takes four. A blank answer leaves you becalmed for five.",
      ],
    },
    {
      heading: "Why it is called Dead Reckoning",
      body: [
        "Before satellites, sailors found their position by dead reckoning: they took their last known point, their speed, their heading and the time elapsed, and worked out where they must be. No landmark, just a careful estimate from what they knew.",
        "The game asks for the same skill. You rarely know the answer, but you usually know something nearby, and a good reckoning from there gets you most of the way.",
      ],
    },
    {
      heading: "Tips for a quicker voyage",
      body: [
        "Anchor on something you know. If you know roughly how tall a house is, you can work up to a skyscraper.",
        "Get the size right before the detail. Being in the right order of magnitude matters far more than the last digit.",
        "Always type something. Any guess at all beats being becalmed.",
      ],
    },
  ],
  faq: [
    {
      question: "How is Dead Reckoning scored?",
      answer:
        "In days at sea. Each of the seven crossings takes one to five days depending on how close your estimate was, so the best possible voyage is seven days.",
    },
    {
      question: "Do I need the exact number?",
      answer: "No. Anything within 10% of the answer counts as a perfect crossing.",
    },
    {
      question: "How long do I get for each question?",
      answer: "Twenty seconds. When the fuse burns out, whatever you have typed is taken.",
    },
    {
      question: "Is everyone given the same questions?",
      answer: "Yes. Everyone sails the same seven islands each day, so you can compare your voyage with other players.",
    },
    {
      question: "Is Dead Reckoning free?",
      answer: "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
  ],
};
