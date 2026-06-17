export interface HotCategory {
  id: string;
  emoji: string;
  label: string;
  topic: string;
  interest: string;
}

export const HOT_CATEGORIES: HotCategory[] = [
  { id: "movies", emoji: "🎬", label: "Movies", topic: "Best Movies of the 2010s", interest: "movies and film" },
  { id: "food", emoji: "🍕", label: "Food", topic: "Ultimate Comfort Foods", interest: "food and cooking" },
  { id: "sports", emoji: "🏀", label: "Sports", topic: "Greatest Athletes of All Time", interest: "sports" },
  { id: "gaming", emoji: "🎮", label: "Gaming", topic: "Best Video Games Ever", interest: "video games" },
  { id: "tv", emoji: "📺", label: "TV", topic: "Best TV Shows to Binge", interest: "television" },
  { id: "music", emoji: "🎵", label: "Music", topic: "Greatest Albums of All Time", interest: "music" },
  { id: "travel", emoji: "✈️", label: "Travel", topic: "Dream Vacation Destinations", interest: "travel" },
  { id: "wild", emoji: "🔥", label: "Wild", topic: "Things You'd Bring to a Desert Island", interest: "weird and creative" },
];
