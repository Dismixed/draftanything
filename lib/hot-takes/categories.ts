export interface HotTakesItem {
  id: string;
  label: string;
  icon: string;
}

export interface HotTakesCategory {
  name: string;
  emoji: string;
  items: HotTakesItem[];
}

export const HOT_TAKES_CATEGORIES: HotTakesCategory[] = [
  {
    name: "Pizza Toppings",
    emoji: "🍕",
    items: [
      { id: "pepperoni", label: "Pepperoni", icon: "🍕" },
      { id: "mushroom", label: "Mushroom", icon: "🍄" },
      { id: "pineapple", label: "Pineapple", icon: "🍍" },
      { id: "olives", label: "Olives", icon: "🫒" },
      { id: "onion", label: "Onion", icon: "🧅" },
      { id: "pepper", label: "Bell Pepper", icon: "🫑" },
      { id: "sausage", label: "Sausage", icon: "🌭" },
      { id: "bacon", label: "Bacon", icon: "🥓" },
      { id: "jalapeno", label: "Jalapeño", icon: "🌶️" },
      { id: "garlic", label: "Garlic", icon: "🧄" },
      { id: "spinach", label: "Spinach", icon: "🥬" },
      { id: "anchovy", label: "Anchovy", icon: "🐟" },
      { id: "tomato", label: "Tomato", icon: "🍅" },
      { id: "corn", label: "Corn", icon: "🌽" },
      { id: "pesto", label: "Pesto", icon: "🌿" },
    ],
  },
  {
    name: "Breakfast Foods",
    emoji: "🍳",
    items: [
      { id: "pancakes", label: "Pancakes", icon: "🥞" },
      { id: "waffles", label: "Waffles", icon: "🧇" },
      { id: "bacon", label: "Bacon", icon: "🥓" },
      { id: "eggs", label: "Eggs", icon: "🍳" },
      { id: "toast", label: "Toast", icon: "🍞" },
      { id: "bagel", label: "Bagel", icon: "🥯" },
      { id: "cereal", label: "Cereal", icon: "🥣" },
      { id: "oatmeal", label: "Oatmeal", icon: "🥣" },
      { id: "yogurt", label: "Yogurt", icon: "🥛" },
      { id: "fruit", label: "Fresh Fruit", icon: "🍓" },
      { id: "sausage", label: "Sausage", icon: "🌭" },
      { id: "hash", label: "Hash Browns", icon: "🥔" },
      { id: "avocado", label: "Avocado Toast", icon: "🥑" },
      { id: "smoothie", label: "Smoothie", icon: "🥤" },
      { id: "donut", label: "Donut", icon: "🍩" },
    ],
  },
  {
    name: "Movie Snacks",
    emoji: "🎬",
    items: [
      { id: "popcorn", label: "Popcorn", icon: "🍿" },
      { id: "nachos", label: "Nachos", icon: "🧀" },
      { id: "candy", label: "Candy", icon: "🍬" },
      { id: "soda", label: "Soda", icon: "🥤" },
      { id: "pretzel", label: "Pretzel", icon: "🥨" },
      { id: "hotdog", label: "Hot Dog", icon: "🌭" },
      { id: "pizza", label: "Pizza Slice", icon: "🍕" },
      { id: "icecream", label: "Ice Cream", icon: "🍦" },
      { id: "chips", label: "Chips", icon: "🥔" },
      { id: "cookie", label: "Cookie", icon: "🍪" },
      { id: "water", label: "Water", icon: "💧" },
      { id: "wine", label: "Wine", icon: "🍷" },
      { id: "slushie", label: "Slushie", icon: "🧊" },
      { id: "churro", label: "Churro", icon: "🥖" },
      { id: "pickles", label: "Pickles", icon: "🥒" },
    ],
  },
];

export function getDailyCategoryIndex(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % HOT_TAKES_CATEGORIES.length;
}

export function getDailyCategory(date: Date = new Date()): HotTakesCategory {
  const dateStr = date.toISOString().slice(0, 10);
  return HOT_TAKES_CATEGORIES[getDailyCategoryIndex(dateStr)];
}
