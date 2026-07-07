/**
 * AnyGuessr curated country seed.
 *
 * Each entry maps a country (identified by REST Countries cca3) to:
 *   - written_language: a short display string (script sample) — used as a
 *       text clue directly, no network fetch needed.
 *   - landmark, food, person, environment, jersey, brand, currency: Wikipedia
 *       article titles that the generator resolves to Commons image URLs at
 *       puzzle-create time.
 *
 * This is the fallback database for fixture mode (no live API access) — every
 * entry is solvable offline because the written-language text alone ranks an
 * answer strongly. Live mode augments clues with fetched Commons images.
 */

export interface SeedEntry {
  cca3: string;
  common: string;
  region: string;
  capital: string;
  environment: string;
  person: string;
  food: string;
  written_language: string;
  landmark: string;
  /** Wikipedia title for a national-team kit photo. */
  jersey: string;
  /** Wikipedia title for a country-associated brand logo or product. */
  brand: string;
  /** Wikipedia title for currency (banknote/coin); falls back to REST Countries symbol. */
  currency: string;
}

export const SEED: SeedEntry[] = [
  { cca3: "JPN", common: "Japan",       region: "Asia",       capital: "Tokyo",     environment: "Shibuya Crossing",          person: "Hokusai",       food: "Sushi",            written_language: "寿司",      landmark: "Mount Fuji", jersey: "Japan national football team", brand: "Toyota", currency: "Japanese yen" },
  { cca3: "FRA", common: "France",     region: "Europe",     capital: "Paris",     environment: "Montmartre",                person: "Claude Monet",  food: "Baguette",         written_language: "Bonjour",    landmark: "Eiffel Tower", jersey: "France national football team", brand: "Louis Vuitton", currency: "French euro coins" },
  { cca3: "ITA", common: "Italy",      region: "Europe",     capital: "Rome",      environment: "Amalfi Coast",              person: "Leonardo da Vinci", food: "Pizza Margherita", written_language: "Ciao",       landmark: "Colosseum", jersey: "Italy national football team", brand: "Ferrari", currency: "Italian euro coins" },
  { cca3: "EGY", common: "Egypt",      region: "Africa",     capital: "Cairo",     environment: "Nile",                      person: "Tutankhamun",   food: "Kushari",          written_language: "مرحبا",      landmark: "Great Sphinx of Giza", jersey: "Egypt national football team", brand: "EgyptAir", currency: "Egyptian pound" },
  { cca3: "BRA", common: "Brazil",     region: "Americas",   capital: "Brasília",  environment: "Copacabana (Rio de Janeiro)", person: "Pelé",          food: "Feijoada",         written_language: "Olá",        landmark: "Christ the Redeemer", jersey: "Brazil national football team", brand: "Embraer", currency: "Brazilian real" },
  { cca3: "IND", common: "India",      region: "Asia",       capital: "New Delhi", environment: "Varanasi",                  person: "Mahatma Gandhi", food: "Biryani",          written_language: "नमस्ते",     landmark: "Taj Mahal", jersey: "India national cricket team", brand: "Tata Group", currency: "Indian rupee" },
  { cca3: "CHN", common: "China",      region: "Asia",       capital: "Beijing",  environment: "Great Wall of China",       person: "Confucius",     food: "Peking duck",      written_language: "你好",       landmark: "Forbidden City", jersey: "China national football team", brand: "Alibaba Group", currency: "Renminbi" },
  { cca3: "MEX", common: "Mexico",     region: "Americas",   capital: "Mexico City", environment: "Teotihuacan",            person: "Frida Kahlo",   food: "Mole sauce",       written_language: "Buenos días",  landmark: "Chichen Itza", jersey: "Mexico national football team", brand: "Pemex", currency: "Mexican peso" },
  { cca3: "ESP", common: "Spain",      region: "Europe",     capital: "Madrid",    environment: "Camino de Santiago",        person: "Pablo Picasso", food: "Paella",           written_language: "Hola",         landmark: "Sagrada Família", jersey: "Spain national football team", brand: "Zara (retailer)", currency: "Spanish euro coins" },
  { cca3: "GBR", common: "United Kingdom", region: "Europe", capital: "London",   environment: "Piccadilly Circus",         person: "William Shakespeare", food: "Fish and chips", written_language: "Hello",      landmark: "Big Ben", jersey: "England national football team", brand: "Rolls-Royce Motor Cars", currency: "Pound sterling" },
  { cca3: "USA", common: "United States", region: "Americas", capital: "Washington, D.C.", environment: "Times Square",      person: "Mark Twain",    food: "Hamburger",        written_language: "Howdy",      landmark: "Statue of Liberty", jersey: "United States men's national soccer team", brand: "Ford Motor Company", currency: "United States dollar" },
  { cca3: "RUS", common: "Russia",     region: "Europe",     capital: "Moscow",    environment: "Red Square",               person: "Leo Tolstoy",   food: "Borscht",         written_language: "Привет",     landmark: "Saint Basil's Cathedral", jersey: "Russia national football team", brand: "Gazprom", currency: "Russian ruble" },
  { cca3: "DEU", common: "Germany",    region: "Europe",     capital: "Berlin",    environment: "Berlin Wall",              person: "Johann Sebastian Bach", food: "Bratwurst", written_language: "Guten Tag",   landmark: "Brandenburg Gate", jersey: "Germany national football team", brand: "Volkswagen", currency: "German euro coins" },
  { cca3: "KOR", common: "South Korea", region: "Asia",      capital: "Seoul",     environment: "Myeongdong",               person: "Yi Sun-sin",    food: "Kimchi",           written_language: "안녕하세요",   landmark: "Gyeongbokgung Palace", jersey: "South Korea national football team", brand: "Samsung", currency: "South Korean won" },
  { cca3: "THA", common: "Thailand",   region: "Asia",       capital: "Bangkok",  environment: "Floating market",          person: "Bhumibol Adulyadej", food: "Pad thai",     written_language: "สวัสดี",     landmark: "Wat Arun", jersey: "Thailand national football team", brand: "Thai Airways", currency: "Thai baht" },
  { cca3: "GRC", common: "Greece",     region: "Europe",     capital: "Athens",   environment: "Santorini",                 person: "Socrates",       food: "Moussaka",         written_language: "Γειά σου",    landmark: "Parthenon", jersey: "Greece national football team", brand: "Olympic Air", currency: "Greek euro coins" },
  { cca3: "TUR", common: "Turkey",    region: "Asia",        capital: "Ankara",   environment: "Grand Bazaar",             person: "Mustafa Kemal Atatürk", food: "Kebab",       written_language: "Merhaba",     landmark: "Hagia Sophia", jersey: "Turkey national football team", brand: "Turkish Airlines", currency: "Turkish lira" },
  { cca3: "PRT", common: "Portugal",   region: "Europe",     capital: "Lisbon",    environment: "Alfama",                    person: "Luís de Camões", food: "Pastel de nata",   written_language: "Bom dia",    landmark: "Belém Tower", jersey: "Portugal national football team", brand: "Galp Energia", currency: "Portuguese euro coins" },
  { cca3: "NLD", common: "Netherlands", region: "Europe",     capital: "Amsterdam", environment: "Canals of Amsterdam",       person: "Rembrandt",     food: "Stroopwafel",      written_language: "Goedemorgen", landmark: "Rijksmuseum", jersey: "Netherlands national football team", brand: "Heineken International", currency: "Dutch euro coins" },
  { cca3: "SWE", common: "Sweden",     region: "Europe",     capital: "Stockholm", environment: "Gamla stan",                person: "Astrid Lindgren", food: "Köttbullar",     written_language: "Hej",        landmark: "Stockholm Palace", jersey: "Sweden national football team", brand: "IKEA", currency: "Swedish krona" },
  { cca3: "NOR", common: "Norway",    region: "Europe",      capital: "Oslo",     environment: "Geirangerfjord",            person: "Edvard Grieg",   food: "Rakfisk",          written_language: "Hei",        landmark: "Bryggen", jersey: "Norway national football team", brand: "Equinor", currency: "Norwegian krone" },
  { cca3: "MAR", common: "Morocco",    region: "Africa",     capital: "Rabat",    environment: "Jemaa el-Fnaa",            person: "Ibn Battuta",   food: "Tagine",           written_language: "سلام",       landmark: "Hassan II Mosque", jersey: "Morocco national football team", brand: "Royal Air Maroc", currency: "Moroccan dirham" },
  { cca3: "KEN", common: "Kenya",      region: "Africa",     capital: "Nairobi",  environment: "Maasai Mara",              person: "Wangari Maathai", food: "Ugali",           written_language: "Jambo",      landmark: "Mount Kenya", jersey: "Kenya national football team", brand: "Safaricom", currency: "Kenyan shilling" },
  { cca3: "AUS", common: "Australia",  region: "Oceania",    capital: "Canberra", environment: "Sydney Opera House",       person: "Ned Kelly",     food: "Meat pie",         written_language: "G'day",       landmark: "Uluru", jersey: "Australia national cricket team", brand: "Qantas", currency: "Australian dollar" },
  { cca3: "NZL", common: "New Zealand", region: "Oceania",   capital: "Wellington", environment: "Milford Sound",            person: "Ernest Rutherford", food: "Pavlova (food)", written_language: "Kia ora",    landmark: "Aoraki / Mount Cook", jersey: "New Zealand national rugby union team", brand: "Air New Zealand", currency: "New Zealand dollar" },
  { cca3: "IDN", common: "Indonesia",  region: "Asia",        capital: "Jakarta",  environment: "Ubud",                      person: "Sukarno",        food: "Nasi goreng",      written_language: "Selamat pagi", landmark: "Borobudur", jersey: "Indonesia national football team", brand: "Garuda Indonesia", currency: "Indonesian rupiah" },
  { cca3: "VNM", common: "Vietnam",    region: "Asia",        capital: "Hanoi",    environment: "Ha Long Bay",              person: "Ho Chi Minh",    food: "Pho",              written_language: "Xin chào",   landmark: "Imperial City, Huế", jersey: "Vietnam national football team", brand: "Vietnam Airlines", currency: "Vietnamese đồng" },
  { cca3: "IRL", common: "Ireland",    region: "Europe",     capital: "Dublin",   environment: "Cliffs of Moher",          person: "James Joyce",    food: "Irish stew",       written_language: "Dia dhuit",   landmark: "Giant's Causeway", jersey: "Ireland national rugby union team", brand: "Guinness", currency: "Irish euro coins" },
  { cca3: "CHE", common: "Switzerland", region: "Europe",    capital: "Bern",     environment: "Matterhorn",               person: "Roger Federer",  food: "Fondue",           written_language: "Grüezi",     landmark: "Chillon Castle", jersey: "Switzerland national football team", brand: "Nestlé", currency: "Swiss franc" },
  { cca3: "ARG", common: "Argentina", region: "Americas",    capital: "Buenos Aires", environment: "Iguazú Falls",          person: "Lionel Messi",   food: "Asado",            written_language: "¿Qué tal?",    landmark: "Perito Moreno Glacier", jersey: "Argentina national football team", brand: "Quilmes", currency: "Argentine peso" },
  { cca3: "ZAF", common: "South Africa", region: "Africa",   capital: "Pretoria", environment: "Table Mountain",           person: "Nelson Mandela", food: "Bobotie",         written_language: "Sawubona",    landmark: "Cape of Good Hope", jersey: "South Africa national rugby union team", brand: "Sasol", currency: "South African rand" },
  { cca3: "CAN", common: "Canada",     region: "Americas",   capital: "Ottawa",   environment: "Banff National Park",      person: "Terry Fox",      food: "Poutine",          written_language: "Bienvenue",   landmark: "CN Tower", jersey: "Canada men's national ice hockey team", brand: "Tim Hortons", currency: "Canadian dollar" },
  { cca3: "SAU", common: "Saudi Arabia", region: "Asia",     capital: "Riyadh",   environment: "Empty Quarter",            person: "Ibn Saud",       food: "Kabsa",            written_language: "أهلاً",      landmark: "Mada'in Saleh", jersey: "Saudi Arabia national football team", brand: "Saudi Aramco", currency: "Saudi riyal" },
  { cca3: "PER", common: "Peru",       region: "Americas",   capital: "Lima",     environment: "Machu Picchu",             person: "Mario Vargas Llosa", food: "Ceviche",      written_language: "Allinllachu", landmark: "Machu Picchu", jersey: "Peru national football team", brand: "Inca Kola", currency: "Peruvian sol" },
  { cca3: "JOR", common: "Jordan",     region: "Asia",        capital: "Amman",   environment: "Wadi Rum",                  person: "Queen Rania",    food: "Mansaf",           written_language: "أهلاً",      landmark: "Petra", jersey: "Jordan national football team", brand: "Royal Jordanian", currency: "Jordanian dinar" },
];

/** Stable, deduped cca3 list for seed selection. */
export const SEED_CCA3: string[] = Array.from(new Set(SEED.map((s) => s.cca3)));
