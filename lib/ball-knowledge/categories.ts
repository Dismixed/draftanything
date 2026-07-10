export const CATEGORIES = [
  "NBA Teams",
  "Pizza Toppings",
  "90s Cartoons",
  "Countries in South America",
  "Sneaker Brands",
  "Breakfast Cereals",
  "Dog Breeds",
  "Fast Food Chains",
  "Superheroes",
  "US State Capitals",
  "Card Games",
  "Dance Moves",
  "Video Game Consoles",
  "Rappers",
  "Ice Cream Flavors",
  "Types of Pasta",
  "Broadway Musicals",
  "Marvel Movies",
  "Types of Sandwiches",
  "NFL Teams",
  "Board Games",
  "80s Action Movies",
  "Types of Cheese",
  "Countries That Border the Mediterranean",
  "Sitcoms Set in New York City",
  "Taylor Swift Albums",
  "Types of Whiskey",
  "Olympic Sports",
  "Disney Animated Movies",
  "Wrestling Moves",
  "Kitchen Appliances",
  "Types of Tacos",
  "2000s Boy Bands",
  "Types of Sushi Rolls",
] as const;

export type CategoryName = (typeof CATEGORIES)[number];

export function getDayIndex(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export function getCategoryForDayIndex(dayIndex: number): CategoryName {
  return CATEGORIES[dayIndex % CATEGORIES.length]!;
}
