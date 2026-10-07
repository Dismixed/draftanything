import type { GameContent } from "./types";

export const hotTakes: GameContent = {
  angle: "tier list daily game",
  title: "Hot Takes: Tier List Daily Game",
  description:
    "A free tier list daily game. One new category every day with fifteen items to rank from S tier to D. Play in your browser, no account needed.",
  intro:
    "Hot Takes is a tier list daily game. Every day there is one category with fifteen items, and your job is to sort all of them from S tier down to D.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Each day's puzzle is a single category, such as a type of food, a set of films or a list of everyday objects, with fifteen items in it. All fifteen start in a tray at the bottom of the screen.",
        "Move every item into one of five tiers: S, A, B, C or D. S is the top tier, for the items you would defend to anyone. D is the bottom. You can drag an item into a tier, or tap the item and then tap the tier you want.",
        "Nothing is final while you are sorting. Move items between tiers, or back to the tray, as often as you like. When the tray is empty, the Lock in my ranking button becomes active. Locking in ends the sorting and shows your finished list.",
      ],
    },
    {
      heading: "What the tiers mean",
      body: [
        "Tier lists come from video game communities, where players sort characters by strength. S ranks above A, a convention borrowed from Japanese video games, where S marks a grade better than A. The format has since spread to everything from fast food to film franchises.",
        "There is no rule for how many items go in each tier. You can put ten things in S and one in D, or spread them evenly. A list where everything lands in B says something too. The only requirement is that all fifteen items are placed before you lock in.",
      ],
    },
    {
      heading: "Tips for a ranking you can defend",
      body: [
        "Start with the extremes. Pick the one or two items that are obviously S and the one or two that are obviously D, then fill in the middle. The middle tiers are where the arguments are.",
        "Decide what you are ranking by before you begin. Taste, usefulness, nostalgia and quality give four different lists from the same fifteen items. Pick one and stay with it.",
        "Use the whole scale. A ranking with nothing in D is a ranking that avoided the hard calls.",
      ],
    },
    {
      heading: "Playing with friends",
      body: [
        "Because the category is the same for everybody on a given day, Hot Takes works well as a group argument. Lock in your ranking, send the category to a group chat, and compare where each of you put the same item. One person's S tier is reliably another person's D.",
        "For a longer session with a judge and a winner, try Draft Anything, where friends draft picks from any topic and defend them.",
      ],
    },
  ],
  faq: [
    {
      question: "Is there a daily tier list game?",
      answer:
        "Yes. Hot Takes gives you one new category with fifteen items every day. You rank them from S tier to D and lock in your list.",
    },
    {
      question: "Is Hot Takes free?",
      answer:
        "Yes. It runs in your browser. There is nothing to download and you do not need an account to play.",
    },
    {
      question: "Is Hot Takes a blind ranking game?",
      answer:
        "No. In a blind ranking game you place each item before seeing the next one. In Hot Takes you can see all fifteen items from the start and rearrange them freely until you lock in.",
    },
    {
      question: "Can I change my ranking after I lock it in?",
      answer:
        "Not within the same session. Locking in ends the sorting and shows your finished list. Until then you can move any item as many times as you like.",
    },
    {
      question: "How many items go in each tier?",
      answer:
        "As many as you want. The only rule is that every item has to be placed in a tier before you can lock in.",
    },
  ],
};
