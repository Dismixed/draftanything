import type { GameContent } from "./types";

export const freezeframes: GameContent = {
  angle: "guess the movie, song, TV show and album daily game",
  title: "FreezeFrames: Guess the Movie, Song, TV Show and Album",
  description:
    "A free daily game in four rounds: guess the movie from a frame, the song from a clip, the TV show from a frame and the artist from an album cover.",
  intro:
    "FreezeFrames is a guess the movie, song, TV show and album daily game. You get four rounds a day, one for each, and a score that drops the longer you take.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Each day has four rounds, and they are the same for every player. You see or hear one thing from a film, a song, a television show or an album, and you type what it is.",
        "Type your guess into the box and submit it. You do not need to be letter-perfect: close spellings and partial matches count.",
        "If you cannot get a round, you can skip it and move on. Once all four rounds are done, your run for the day is over. A new set arrives every day.",
      ],
    },
    {
      heading: "The four rounds",
      body: [
        "Movie. You are shown a single frame from a film and have to name it. If you have played a guess the movie by frame game before, this round will feel familiar, and it works like any movie guessing game like Wordle: one picture, one title.",
        "Song. A 20-second clip plays and you name the song. This is the guess the song daily game part of the puzzle, and the only round where you need your sound on.",
        "TV show. Another still image, this time from a television series. As with guess the TV show by frame games, the setting, the lighting and the cast usually give it away before any single detail does.",
        "Album. You see an album cover and name the artist. It is a guess the album cover game with one twist: the answer is who made the record, not what the record is called.",
      ],
    },
    {
      heading: "How scoring works",
      body: [
        "Every round starts with a full set of points. Each wrong guess takes some away, and the clock keeps draining your score while you think. A fast, correct first guess keeps the most on the board.",
        "Your four round scores add up to your total for the day, which you can compare on the daily leaderboard.",
      ],
    },
    {
      heading: "Tips",
      body: [
        "Do not rush a guess you are unsure of. A wrong answer costs more than a couple of extra seconds of thinking.",
        "For the two frame rounds, look past the actors. Costumes, sets and picture quality tell you the decade, which narrows things quickly.",
        "For the song, listen for the vocal. Plenty of tracks share a similar intro, and a voice is much harder to mistake.",
      ],
    },
  ],
  faq: [
    {
      question: "Is there a daily game where you guess the movie from a frame?",
      answer:
        "Yes. The first round of FreezeFrames shows one frame from a film and asks you to name it. The other three rounds cover a song, a TV show and an album.",
    },
    {
      question: "How long is the song clip?",
      answer:
        "20 seconds.",
    },
    {
      question: "Do I have to spell the title exactly?",
      answer:
        "No. Close spellings and partial matches are accepted.",
    },
    {
      question: "Is FreezeFrames free?",
      answer:
        "Yes. It runs in your browser with nothing to download, and you do not need an account to play.",
    },
    {
      question: "Can I play more than once a day?",
      answer:
        "No. There is one set of four rounds each day, and everyone gets the same set. A new one arrives the next day.",
    },
  ],
};
