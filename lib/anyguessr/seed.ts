/**
 * AnyGuessr curated country seed.
 *
 * Each entry maps a country (identified by REST Countries cca3) to:
 *   - written_language: a short display string (script sample) — used as a
 *       text clue directly, no network fetch needed.
 *   - landmark, food, person, environment: Wikipedia article titles that the
 *       generator resolves to Commons image URLs at puzzle-create time.
 *
 * This is the fallback database for fixture mode (no live API access) — every
 * entry is solvable offline because the written-language text alone ranks an
 * answer strongly. Live mode augments clues with fetched Commons images.
 */

export interface SeedEntry {
  cca3: string;            // ISO 3-letter, matches REST Countries
  common: string;          // canonical display name (REST Countries name.common)
  region: string;
  capital: string;
  /** Short human-readable region label rendered as alt only (not shown to player). */
  environment: string;     // Wikipedia page title for clue 1
  person: string;          // Wikipedia page title for clue 2 (famous figure or cultural articles)
  food: string;             // Wikipedia page title for clue 3 (national dish)
  written_language: string; // raw text rendered for clue 4 (native script sample)
  landmark: string;         // Wikipedia page title for clue 5
}

export const SEED: SeedEntry[] = [
  { cca3: "JPN", common: "Japan",       region: "Asia",       capital: "Tokyo",     environment: "Shibuya Crossing",          person: "Hokusai",       food: "Sushi",            written_language: "寿司",      landmark: "Mount Fuji" },
  { cca3: "FRA", common: "France",     region: "Europe",     capital: "Paris",     environment: "Montmartre",                person: "Claude Monet",  food: "Baguette",         written_language: "Bonjour",    landmark: "Eiffel Tower" },
  { cca3: "ITA", common: "Italy",      region: "Europe",     capital: "Rome",      environment: "Amalfi Coast",              person: "Leonardo da Vinci", food: "Pizza Margherita", written_language: "Ciao",       landmark: "Colosseum" },
  { cca3: "EGY", common: "Egypt",      region: "Africa",     capital: "Cairo",     environment: "Nile",                      person: "Tutankhamun",   food: "Kushari",          written_language: "مرحبا",      landmark: "Great Sphinx of Giza" },
  { cca3: "BRA", common: "Brazil",     region: "Americas",   capital: "Brasília",  environment: "Copacabana (Rio de Janeiro)", person: "Pelé",          food: "Feijoada",         written_language: "Olá",        landmark: "Christ the Redeemer" },
  { cca3: "IND", common: "India",      region: "Asia",       capital: "New Delhi", environment: "Varanasi",                  person: "Mahatma Gandhi", food: "Biryani",          written_language: "नमस्ते",     landmark: "Taj Mahal" },
  { cca3: "CHN", common: "China",      region: "Asia",       capital: "Beijing",  environment: "Great Wall of China",       person: "Confucius",     food: "Peking duck",      written_language: "你好",       landmark: "Forbidden City" },
  { cca3: "MEX", common: "Mexico",     region: "Americas",   capital: "Mexico City", environment: "Teotihuacan",            person: "Frida Kahlo",   food: "Mole sauce",       written_language: "Hola",       landmark: "Chichen Itza" },
  { cca3: "ESP", common: "Spain",      region: "Europe",     capital: "Madrid",    environment: "Camino de Santiago",        person: "Pablo Picasso", food: "Paella",           written_language: "Hola",       landmark: "Sagrada Família" },
  { cca3: "GBR", common: "United Kingdom", region: "Europe", capital: "London",   environment: "Piccadilly Circus",         person: "William Shakespeare", food: "Fish and chips", written_language: "Hello",      landmark: "Big Ben" },
  { cca3: "USA", common: "United States", region: "Americas", capital: "Washington, D.C.", environment: "Times Square",      person: "Mark Twain",    food: "Hamburger",        written_language: "Hello",      landmark: "Statue of Liberty" },
  { cca3: "RUS", common: "Russia",     region: "Europe",     capital: "Moscow",    environment: "Red Square",               person: "Leo Tolstoy",   food: "Borscht",         written_language: "Привет",     landmark: "Saint Basil's Cathedral" },
  { cca3: "DEU", common: "Germany",    region: "Europe",     capital: "Berlin",    environment: "Berlin Wall",              person: "Johann Sebastian Bach", food: "Bratwurst", written_language: "Hallo",       landmark: "Brandenburg Gate" },
  { cca3: "KOR", common: "South Korea", region: "Asia",      capital: "Seoul",     environment: "Myeongdong",               person: "Yi Sun-sin",    food: "Kimchi",           written_language: "안녕하세요",   landmark: "Gyeongbokgung Palace" },
  { cca3: "THA", common: "Thailand",   region: "Asia",       capital: "Bangkok",  environment: "Floating market",          person: "Bhumibol Adulyadej", food: "Pad thai",     written_language: "สวัสดี",     landmark: "Wat Arun" },
  { cca3: "GRC", common: "Greece",     region: "Europe",     capital: "Athens",   environment: "Santorini",                 person: "Socrates",       food: "Moussaka",         written_language: "Γειά σου",    landmark: "Parthenon" },
  { cca3: "TUR", common: "Turkey",    region: "Asia",        capital: "Ankara",   environment: "Grand Bazaar",             person: "Mustafa Kemal Atatürk", food: "Kebab",       written_language: "Merhaba",     landmark: "Hagia Sophia" },
  { cca3: "PRT", common: "Portugal",   region: "Europe",     capital: "Lisbon",    environment: "Alfama",                    person: "Luís de Camões", food: "Pastel de nata",   written_language: "Olá",       landmark: "Belém Tower" },
  { cca3: "NLD", common: "Netherlands", region: "Europe",     capital: "Amsterdam", environment: "Canals of Amsterdam",       person: "Rembrandt",     food: "Stroopwafel",      written_language: "Hallo",      landmark: "Rijksmuseum" },
  { cca3: "SWE", common: "Sweden",     region: "Europe",     capital: "Stockholm", environment: "Gamla stan",                person: "Astrid Lindgren", food: "Köttbullar",     written_language: "Hej",        landmark: "Stockholm Palace" },
  { cca3: "NOR", common: "Norway",    region: "Europe",      capital: "Oslo",     environment: "Geirangerfjord",            person: "Edvard Grieg",   food: "Rakfisk",          written_language: "Hei",        landmark: "Bryggen" },
  { cca3: "MAR", common: "Morocco",    region: "Africa",     capital: "Rabat",    environment: "Jemaa el-Fnaa",            person: "Ibn Battuta",   food: "Tagine",           written_language: "سلام",       landmark: "Hassan II Mosque" },
  { cca3: "KEN", common: "Kenya",      region: "Africa",     capital: "Nairobi",  environment: "Maasai Mara",              person: "Wangari Maathai", food: "Ugali",           written_language: "Jambo",      landmark: "Mount Kenya" },
  { cca3: "AUS", common: "Australia",  region: "Oceania",    capital: "Canberra", environment: "Sydney Opera House",       person: "Ned Kelly",     food: "Meat pie",         written_language: "G'day",       landmark: "Uluru" },
  { cca3: "NZL", common: "New Zealand", region: "Oceania",   capital: "Wellington", environment: "Milford Sound",            person: "Ernest Rutherford", food: "Pavlova (food)", written_language: "Kia ora",    landmark: "Aoraki / Mount Cook" },
  { cca3: "IDN", common: "Indonesia",  region: "Asia",        capital: "Jakarta",  environment: "Ubud",                      person: "Sukarno",        food: "Nasi goreng",      written_language: "Halo",        landmark: "Borobudur" },
  { cca3: "VNM", common: "Vietnam",    region: "Asia",        capital: "Hanoi",    environment: "Ha Long Bay",              person: "Ho Chi Minh",    food: "Pho",              written_language: "Xin chào",   landmark: "Imperial City, Huế" },
  { cca3: "IRL", common: "Ireland",    region: "Europe",     capital: "Dublin",   environment: "Cliffs of Moher",          person: "James Joyce",    food: "Irish stew",       written_language: "Dia dhuit",   landmark: "Giant's Causeway" },
  { cca3: "CHE", common: "Switzerland", region: "Europe",    capital: "Bern",     environment: "Matterhorn",               person: "Roger Federer",  food: "Fondue",           written_language: "Grüezi",     landmark: "Chillon Castle" },
  { cca3: "ARG", common: "Argentina", region: "Americas",    capital: "Buenos Aires", environment: "Iguazú Falls",          person: "Lionel Messi",   food: "Asado",            written_language: "Hola",       landmark: "Perito Moreno Glacier" },
  { cca3: "ZAF", common: "South Africa", region: "Africa",   capital: "Pretoria", environment: "Table Mountain",           person: "Nelson Mandela", food: "Bobotie",         written_language: "Sawubona",    landmark: "Cape of Good Hope" },
  { cca3: "CAN", common: "Canada",     region: "Americas",   capital: "Ottawa",   environment: "Banff National Park",      person: "Terry Fox",      food: "Poutine",          written_language: "Bonjour",    landmark: "CN Tower" },
  { cca3: "SAU", common: "Saudi Arabia", region: "Asia",     capital: "Riyadh",   environment: "Empty Quarter",            person: "Ibn Saud",       food: "Kabsa",            written_language: "أهلاً",      landmark: "Mada'in Saleh" },
  { cca3: "PER", common: "Peru",       region: "Americas",   capital: "Lima",     environment: "Machu Picchu",             person: "Mario Vargas Llosa", food: "Ceviche",      written_language: "Hola",       landmark: "Machu Picchu" },
  { cca3: "JOR", common: "Jordan",     region: "Asia",        capital: "Amman",   environment: "Wadi Rum",                  person: "Queen Rania",    food: "Mansaf",           written_language: "أهلاً",      landmark: "Petra" },
];

/** Stable, deduped cca3 list for infinite-mode "avoid recently played". */
export const SEED_CCA3: string[] = Array.from(new Set(SEED.map((s) => s.cca3)));