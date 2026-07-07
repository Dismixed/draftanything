/**
 * Extra Wikipedia article titles per country/clue type. The generator merges
 * these with the primary seed titles and stores each resolved image as a
 * variant so daily play can rotate photos even when the same country returns.
 */

export type SeedImageField =
  | "environment"
  | "person"
  | "food"
  | "landmark"
  | "jersey"
  | "brand"
  | "currency";

export const SEED_IMAGE_ALTS: Partial<
  Record<string, Partial<Record<SeedImageField, string[]>>>
> = {
  JPN: {
    environment: ["Fushimi Inari-taisha"],
    person: ["Emperor Meiji"],
    food: ["Ramen"],
    landmark: ["Tokyo Tower"],
    jersey: ["Japan national rugby union team"],
    brand: ["Sony", "Honda"],
    currency: ["5000 yen note"],
  },
  FRA: {
    environment: ["Palace of Versailles"],
    person: ["Marie Curie"],
    food: ["Croissant"],
    landmark: ["Louvre"],
    jersey: ["France national rugby union team"],
    brand: ["Renault", "Air France"],
    currency: ["500 euro note"],
  },
  ITA: {
    environment: ["Venice"],
    person: ["Michelangelo"],
    food: ["Gelato"],
    landmark: ["Leaning Tower of Pisa"],
  },
  EGY: {
    environment: ["Sahara"],
    person: ["Cleopatra"],
    food: ["Ful medames"],
    landmark: ["Pyramids of Giza"],
  },
  BRA: {
    environment: ["Amazon rainforest"],
    person: ["Ayrton Senna"],
    food: ["Brigadeiro"],
    landmark: ["Sugarloaf Mountain"],
    jersey: ["Brazil national basketball team"],
    brand: ["Havaianas"],
    currency: ["Brazilian real banknotes"],
  },
  IND: {
    environment: ["Kerala backwaters"],
    person: ["Rabindranath Tagore"],
    food: ["Samosa"],
    landmark: ["Golden Temple"],
  },
  CHN: {
    environment: ["Li River"],
    person: ["Sun Yat-sen"],
    food: ["Dumpling"],
    landmark: ["Terracotta Army"],
  },
  MEX: {
    environment: ["Cenote"],
    person: ["Diego Rivera"],
    food: ["Taco"],
    landmark: ["Palacio de Bellas Artes"],
  },
  ESP: {
    environment: ["Alhambra"],
    person: ["Salvador Dalí"],
    food: ["Tapas"],
    landmark: ["Park Güell"],
  },
  GBR: {
    environment: ["Scottish Highlands"],
    person: ["Isaac Newton"],
    food: ["Full breakfast"],
    landmark: ["Stonehenge"],
  },
  USA: {
    environment: ["Grand Canyon"],
    person: ["Martin Luther King Jr."],
    food: ["Hot dog"],
    landmark: ["Golden Gate Bridge"],
  },
  RUS: {
    environment: ["Lake Baikal"],
    person: ["Peter the Great"],
    food: ["Blini"],
    landmark: ["Hermitage Museum"],
  },
  DEU: {
    environment: ["Neuschwanstein Castle"],
    person: ["Albert Einstein"],
    food: ["Pretzel"],
    landmark: ["Cologne Cathedral"],
  },
  KOR: {
    environment: ["Jeju Island"],
    person: ["King Sejong the Great"],
    food: ["Bibimbap"],
    landmark: ["N Seoul Tower"],
  },
  THA: {
    environment: ["Phi Phi Islands"],
    person: ["Buddha"],
    food: ["Tom yum"],
    landmark: ["Wat Phra Kaew"],
  },
  GRC: {
    environment: ["Meteora"],
    person: ["Aristotle"],
    food: ["Souvlaki"],
    landmark: ["Acropolis of Athens"],
  },
  TUR: {
    environment: ["Cappadocia"],
    person: ["Rumi"],
    food: ["Baklava"],
    landmark: ["Blue Mosque"],
  },
  PRT: {
    environment: ["Douro"],
    person: ["Vasco da Gama"],
    food: ["Bacalhau"],
    landmark: ["Pena Palace"],
  },
  NLD: {
    environment: ["Kinderdijk windmills"],
    person: ["Vincent van Gogh"],
    food: ["Gouda cheese"],
    landmark: ["Anne Frank House"],
  },
  SWE: {
    environment: ["Swedish Lapland"],
    person: ["Alfred Nobel"],
    food: ["Cinnamon roll"],
    landmark: ["Drottningholm Palace"],
  },
  NOR: {
    environment: ["Lofoten"],
    person: ["Henrik Ibsen"],
    food: ["Lefse"],
    landmark: ["Preikestolen"],
  },
  MAR: {
    environment: ["Sahara"],
    person: ["Hassan II of Morocco"],
    food: ["Couscous"],
    landmark: ["Chefchaouen"],
  },
  KEN: {
    environment: ["Lake Nakuru"],
    person: ["Jomo Kenyatta"],
    food: ["Nyama choma"],
    landmark: ["Lamu Island"],
  },
  AUS: {
    environment: ["Great Barrier Reef"],
    person: ["Cathy Freeman"],
    food: ["Vegemite"],
    landmark: ["Sydney Harbour Bridge"],
  },
  NZL: {
    environment: ["Tongariro National Park"],
    person: ["Edmund Hillary"],
    food: ["Hangi"],
    landmark: ["Sky Tower (Auckland)"],
  },
  IDN: {
    environment: ["Komodo National Park"],
    person: ["Gadjah Mada"],
    food: ["Satay"],
    landmark: ["Prambanan"],
  },
  VNM: {
    environment: ["Mekong Delta"],
    person: ["Trần Hưng Đạo"],
    food: ["Bánh mì"],
    landmark: ["Hội An"],
  },
  IRL: {
    environment: ["Ring of Kerry"],
    person: ["W. B. Yeats"],
    food: ["Soda bread"],
    landmark: ["Blarney Castle"],
  },
  CHE: {
    environment: ["Lake Geneva"],
    person: ["Jean-Jacques Rousseau"],
    food: ["Rösti"],
    landmark: ["Jungfrau"],
  },
  ARG: {
    environment: ["Patagonia"],
    person: ["Diego Maradona"],
    food: ["Empanada"],
    landmark: ["La Boca, Buenos Aires"],
    jersey: ["Argentina national basketball team"],
    brand: ["Aerolíneas Argentinas"],
    currency: ["Argentine peso banknotes"],
  },
  ZAF: {
    environment: ["Kruger National Park"],
    person: ["Desmond Tutu"],
    food: ["Biltong"],
    landmark: ["Robben Island"],
  },
  CAN: {
    environment: ["Niagara Falls"],
    person: ["Wayne Gretzky"],
    food: ["Maple syrup"],
    landmark: ["Parliament Hill"],
  },
  SAU: {
    environment: ["Al-Ula"],
    person: ["Ibn Khaldun"],
    food: ["Dates"],
    landmark: ["Kingdom Centre"],
  },
  PER: {
    environment: ["Nazca Lines"],
    person: ["Atahualpa"],
    food: ["Lomo saltado"],
    landmark: ["Sacsayhuamán"],
  },
  JOR: {
    environment: ["Dead Sea"],
    person: ["Lawrence of Arabia"],
    food: ["Falafel"],
    landmark: ["Jerash"],
  },
};
