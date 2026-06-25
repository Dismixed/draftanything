/* ══════════════════════════════════
   Slippery Slope — Game Data
   ══════════════════════════════════ */

export interface Question {
  q: string;
  a: string[];
  c: number; // correct index
  d: number; // difficulty 1-4
}

export interface Player {
  name: string;
  color: string;
  pos: number;
  isHuman: boolean;
  joined?: boolean;
}

export type Category = {
  id: string;
  name: string;
  em: string;
};

export const PCOLORS = [
  "#b5f23d", "#2dd4bf", "#fb923c", "#a78bfa", "#f472b6", "#60a5fa",
];

export const LETTERS = ["A", "B", "C", "D"];

export const CATS: Category[] = [
  { id: "general", name: "General", em: "🎯" },
  { id: "sports", name: "Sports", em: "🏀" },
  { id: "movies", name: "Movies", em: "🎬" },
  { id: "music", name: "Music", em: "🎵" },
  { id: "science", name: "Science", em: "🔬" },
  { id: "history", name: "History", em: "📜" },
  { id: "food", name: "Food", em: "🍕" },
  { id: "tech", name: "Tech", em: "💻" },
  { id: "geography", name: "Geography", em: "🌍" },
];

/* Snake & Ladder map: [from, to] — if to < from it's a snake, else ladder */
export const SL_MAP: Record<number, number> = {
  4: 14,   // ladder: 4→14
  9: 29,   // ladder: 9→29
  17: 7,   // snake: 17→7
  20: 38,  // ladder: 20→38
  24: 16,  // snake: 24→16
  28: 6,   // snake: 28→6
  31: 44,  // ladder: 31→44
  33: 48,  // ladder: 33→48
  36: 22,  // snake: 36→22
  42: 13,  // snake: 42→13
  46: 27,  // snake: 46→27
  49: 11,  // snake: 49→11
};

export const DLABEL = ["", "Easy", "Medium", "Hard", "Brutal"];
export const DCLASS = ["", "ss-dp1", "ss-dp2", "ss-dp3", "ss-dp4"];
export const WCLASS = [
  "", "wsel", "wsel", "wsel", "wsel2", "wsel2",
  "wsel2", "wsel3", "wsel3", "wsel4", "wsel4",
];

export function wagerToDiff(w: number): number {
  if (w <= 3) return 1;
  if (w <= 6) return 2;
  if (w <= 8) return 3;
  return 4;
}

/* ══════════════ QUESTION DB ══════════════ */
export const QDB: Record<string, Question[]> = {
  general: [
    { q: "What is the largest ocean on Earth?", a: ["Atlantic", "Pacific", "Indian", "Arctic"], c: 1, d: 1 },
    { q: "How many days are in a leap year?", a: ["364", "365", "366", "367"], c: 2, d: 1 },
    { q: "What planet is known as the Red Planet?", a: ["Venus", "Mars", "Jupiter", "Saturn"], c: 1, d: 1 },
    { q: "What is the chemical symbol for gold?", a: ["Gd", "Gl", "Go", "Au"], c: 3, d: 2 },
    { q: "How many bones in the adult human body?", a: ["186", "196", "206", "226"], c: 2, d: 2 },
    { q: "What is the smallest country in the world?", a: ["Monaco", "Nauru", "Liechtenstein", "Vatican City"], c: 3, d: 2 },
    { q: "Which element has the highest melting point?", a: ["Iron", "Carbon", "Tungsten", "Osmium"], c: 2, d: 3 },
    { q: "In what year was the Magna Carta signed?", a: ["1205", "1215", "1225", "1235"], c: 1, d: 3 },
    { q: "What is the 10th number in the Fibonacci sequence?", a: ["34", "44", "55", "89"], c: 2, d: 3 },
    { q: "Which philosopher wrote 'Critique of Pure Reason'?", a: ["Hegel", "Nietzsche", "Kant", "Schopenhauer"], c: 2, d: 3 },
    { q: "The word 'salary' is derived from the Latin word for what?", a: ["Gold", "Silver", "Salt", "Silk"], c: 2, d: 4 },
    { q: "Which ancient Greek calculated Earth's circumference?", a: ["Pythagoras", "Archimedes", "Euclid", "Eratosthenes"], c: 3, d: 4 },
    { q: "How many moons does Saturn have (as of current count)?", a: ["83", "95", "107", "146"], c: 1, d: 4 },
    { q: "What is the only number that is twice the sum of its digits?", a: ["12", "18", "24", "36"], c: 1, d: 4 },
    { q: "What is the half-life of Carbon-14 in years?", a: ["1,430", "5,730", "14,300", "57,300"], c: 1, d: 3 },
  ],
  sports: [
    { q: "How many players on a soccer team on the field?", a: ["9", "10", "11", "12"], c: 2, d: 1 },
    { q: "How many rings on the Olympic flag?", a: ["4", "5", "6", "7"], c: 1, d: 1 },
    { q: "How many points is a touchdown?", a: ["3", "4", "6", "7"], c: 2, d: 1 },
    { q: "Which country won the most FIFA World Cups?", a: ["Germany", "Italy", "Argentina", "Brazil"], c: 3, d: 2 },
    { q: "In tennis, what is 40-40 called?", a: ["Tie", "Even", "Deuce", "Set"], c: 2, d: 2 },
    { q: "Which F1 driver has the most world championships?", a: ["Senna", "M. Schumacher", "L. Hamilton", "Vettel"], c: 2, d: 2 },
    { q: "What is the maximum break in snooker?", a: ["145", "147", "150", "155"], c: 1, d: 3 },
    { q: "How long is a marathon in miles?", a: ["26.20", "26.22", "26.24", "26.28"], c: 1, d: 3 },
    { q: "The Fosbury Flop is used in which event?", a: ["Long jump", "Pole vault", "High jump", "Triple jump"], c: 2, d: 3 },
    { q: "How many dimples on a standard golf ball?", a: ["276", "336", "492", "500"], c: 1, d: 3 },
    { q: "In which year were women first allowed in the Olympic marathon?", a: ["1972", "1976", "1980", "1984"], c: 3, d: 4 },
    { q: "How many players in water polo in the water per team?", a: ["5", "6", "7", "8"], c: 2, d: 4 },
    { q: "What year was the first Super Bowl?", a: ["1965", "1967", "1969", "1971"], c: 1, d: 3 },
    { q: "'Hat-trick' originated in which sport?", a: ["Football", "Hockey", "Cricket", "Rugby"], c: 2, d: 4 },
    { q: "What is the diameter of a basketball hoop in inches?", a: ["16", "18", "20", "22"], c: 1, d: 3 },
  ],
  movies: [
    { q: "Who directed 'The Dark Knight'?", a: ["Zack Snyder", "J.J. Abrams", "Christopher Nolan", "Tim Burton"], c: 2, d: 1 },
    { q: "Who played Iron Man in the MCU?", a: ["Chris Evans", "Mark Ruffalo", "Chris Hemsworth", "Robert Downey Jr."], c: 3, d: 1 },
    { q: "What film features 'Life is like a box of chocolates'?", a: ["Cast Away", "Philadelphia", "Forrest Gump", "The Green Mile"], c: 2, d: 1 },
    { q: "Which film won 11 Oscars (joint record)?", a: ["Gone with the Wind", "Ben-Hur", "Titanic", "LOTR: Return of the King"], c: 1, d: 2 },
    { q: "Who directed 'Pulp Fiction'?", a: ["Scorsese", "David Lynch", "Tarantino", "Joel Coen"], c: 2, d: 2 },
    { q: "Which Kubrick film is based on a Stephen King novel?", a: ["Eyes Wide Shut", "Full Metal Jacket", "A Clockwork Orange", "The Shining"], c: 3, d: 2 },
    { q: "In 'Inception', what is the top called?", a: ["Anchor", "Totem", "Token", "Teller"], c: 1, d: 3 },
    { q: "What was the first Pixar film not directed by Lasseter?", a: ["Monsters Inc.", "Finding Nemo", "The Incredibles", "WALL-E"], c: 2, d: 3 },
    { q: "'Oldboy' (2003) is from which country?", a: ["Japan", "China", "South Korea", "Hong Kong"], c: 2, d: 3 },
    { q: "What 1927 film is the first feature-length sound film?", a: ["Metropolis", "Sunrise", "The Jazz Singer", "Wings"], c: 2, d: 3 },
    { q: "Which cinematographer shot 'No Country for Old Men' and 'Skyfall'?", a: ["Lubezki", "Elswit", "Roger Deakins", "Kamiński"], c: 2, d: 4 },
    { q: "Tarkovsky's 'Solaris' is based on a novel by?", a: ["Asimov", "Philip K. Dick", "Stanisław Lem", "Clarke"], c: 2, d: 4 },
    { q: "Which director has most films in the AFI Top 100?", a: ["Orson Welles", "Hitchcock", "Kubrick", "Billy Wilder"], c: 1, d: 4 },
    { q: "What year was 'Metropolis' released?", a: ["1923", "1925", "1927", "1929"], c: 2, d: 3 },
    { q: "Who composed the score for 'Schindler's List'?", a: ["Bernard Herrmann", "Ennio Morricone", "John Williams", "Hans Zimmer"], c: 2, d: 3 },
  ],
  music: [
    { q: "Which band released 'Bohemian Rhapsody'?", a: ["Rolling Stones", "Led Zeppelin", "Queen", "The Beatles"], c: 2, d: 1 },
    { q: "How many strings on a standard guitar?", a: ["4", "5", "6", "7"], c: 2, d: 1 },
    { q: "Who is the 'King of Pop'?", a: ["Prince", "Elvis", "James Brown", "Michael Jackson"], c: 3, d: 1 },
    { q: "Which country does U2 come from?", a: ["UK", "USA", "Australia", "Ireland"], c: 3, d: 2 },
    { q: "How many keys on a standard piano?", a: ["72", "80", "88", "96"], c: 2, d: 2 },
    { q: "What time signature is a waltz?", a: ["2/4", "3/4", "4/4", "6/8"], c: 1, d: 2 },
    { q: "Who wrote 'The Four Seasons'?", a: ["Bach", "Handel", "Vivaldi", "Mozart"], c: 2, d: 2 },
    { q: "How many symphonies did Beethoven write?", a: ["7", "8", "9", "10"], c: 2, d: 2 },
    { q: "Which Miles Davis album is the best-selling jazz record ever?", a: ["Bitches Brew", "Kind of Blue", "In a Silent Way", "Birth of the Cool"], c: 1, d: 3 },
    { q: "What genre did Robert Johnson pioneer?", a: ["Jazz", "Country", "Delta Blues", "Ragtime"], c: 2, d: 3 },
    { q: "Rachmaninoff's Piano Concerto No. 2 is in which key?", a: ["D minor", "F major", "C minor", "A major"], c: 2, d: 4 },
    { q: "Coltrane's 'A Love Supreme' was recorded in what year?", a: ["1960", "1962", "1964", "1966"], c: 2, d: 4 },
    { q: "'The Rite of Spring' premiered in which year?", a: ["1908", "1911", "1913", "1917"], c: 2, d: 4 },
    { q: "What Italian term means 'gradually getting louder'?", a: ["Forte", "Sforzando", "Accelerando", "Crescendo"], c: 3, d: 3 },
    { q: "Which Beatles album features 'A Day in the Life'?", a: ["Revolver", "Abbey Road", "Rubber Soul", "Sgt. Pepper's"], c: 3, d: 3 },
  ],
  science: [
    { q: "What is the powerhouse of the cell?", a: ["Nucleus", "Ribosome", "Golgi", "Mitochondria"], c: 3, d: 1 },
    { q: "Chemical formula for water?", a: ["HO", "H3O", "OH", "H2O"], c: 3, d: 1 },
    { q: "What gas do plants absorb in photosynthesis?", a: ["Oxygen", "Nitrogen", "Hydrogen", "Carbon dioxide"], c: 3, d: 1 },
    { q: "Speed of light in a vacuum (km/s)?", a: ["200,000", "300,000", "400,000", "500,000"], c: 1, d: 2 },
    { q: "Atomic number of carbon?", a: ["4", "5", "6", "8"], c: 2, d: 2 },
    { q: "Which planet has the most moons?", a: ["Jupiter", "Saturn", "Uranus", "Neptune"], c: 1, d: 2 },
    { q: "Most abundant gas in Earth's atmosphere?", a: ["Oxygen", "Argon", "CO2", "Nitrogen"], c: 3, d: 2 },
    { q: "SI unit of electric capacitance?", a: ["Henry", "Tesla", "Farad", "Weber"], c: 2, d: 3 },
    { q: "Approximate age of the universe (billion years)?", a: ["9.8", "11.4", "13.8", "15.2"], c: 2, d: 3 },
    { q: "What does E=mc² solve for?", a: ["Momentum", "Energy", "Mass-velocity", "Force"], c: 1, d: 2 },
    { q: "What is the Chandrasekhar limit?", a: ["Max mass neutron star", "Max mass white dwarf", "Min mass for fusion", "Black hole speed"], c: 1, d: 4 },
    { q: "QCD describes which force?", a: ["Electromagnetism", "Weak nuclear", "Strong nuclear", "Gravity"], c: 2, d: 4 },
    { q: "Avogadro's number (approx)?", a: ["6.02×10²¹", "6.02×10²³", "6.02×10²⁵", "6.02×10²⁷"], c: 1, d: 3 },
    { q: "What is quantum tunneling?", a: ["Particles teleporting", "Particles passing through classically forbidden barriers", "Superposition of states", "Wave-particle duality"], c: 1, d: 3 },
    { q: "How many elements on the periodic table?", a: ["108", "118", "128", "138"], c: 1, d: 2 },
  ],
  history: [
    { q: "What year did WWII end?", a: ["1943", "1944", "1945", "1946"], c: 2, d: 1 },
    { q: "First US President?", a: ["John Adams", "Ben Franklin", "Jefferson", "George Washington"], c: 3, d: 1 },
    { q: "What ship sank on its maiden voyage in 1912?", a: ["SS Lusitania", "SS Britannic", "SS Olympic", "RMS Titanic"], c: 3, d: 1 },
    { q: "When did the Berlin Wall fall?", a: ["1987", "1988", "1989", "1991"], c: 2, d: 2 },
    { q: "Who painted the Sistine Chapel ceiling?", a: ["Raphael", "Leonardo", "Donatello", "Michelangelo"], c: 3, d: 2 },
    { q: "First human to land on the Moon?", a: ["1967", "1968", "1969", "1970"], c: 2, d: 2 },
    { q: "The Peloponnesian War: Athens vs?", a: ["Corinth", "Thebes", "Sparta", "Persia"], c: 2, d: 3 },
    { q: "Which Roman emperor converted to Christianity?", a: ["Nero", "Augustus", "Caligula", "Constantine"], c: 3, d: 3 },
    { q: "Treaty of Westphalia (1648) ended which war?", a: ["Hundred Years'", "Thirty Years'", "Seven Years'", "Spanish Succession"], c: 1, d: 3 },
    { q: "Last Tsar of Russia?", a: ["Alexander III", "Nicholas I", "Alexander II", "Nicholas II"], c: 3, d: 3 },
    { q: "Which Carthaginian general crossed the Alps with elephants?", a: ["Hasdrubal", "Hannibal", "Hamilcar", "Hanno"], c: 1, d: 3 },
    { q: "Hammurabi's Code was written in which script?", a: ["Hieroglyphics", "Cuneiform", "Linear B", "Phoenician"], c: 1, d: 4 },
    { q: "Byzantine Emperor during fall of Constantinople (1453)?", a: ["Constantine X", "John VIII", "Manuel II", "Constantine XI"], c: 3, d: 4 },
    { q: "Meiji Restoration began in which year?", a: ["1853", "1858", "1863", "1868"], c: 3, d: 4 },
    { q: "Which empire controlled India from 1526?", a: ["Ottoman", "Safavid", "Mughal", "Maratha"], c: 2, d: 3 },
  ],
  food: [
    { q: "Main ingredient in guacamole?", a: ["Tomato", "Lime", "Mango", "Avocado"], c: 3, d: 1 },
    { q: "Which nut makes marzipan?", a: ["Walnut", "Cashew", "Hazelnut", "Almond"], c: 3, d: 1 },
    { q: "Which country invented pizza?", a: ["France", "Greece", "Spain", "Italy"], c: 3, d: 1 },
    { q: "Gouda is from which country?", a: ["France", "Belgium", "Switzerland", "Netherlands"], c: 3, d: 2 },
    { q: "What does the Scoville scale measure?", a: ["Saltiness", "Acidity", "Spiciness", "Bitterness"], c: 2, d: 2 },
    { q: "Which French sauce uses egg yolks and clarified butter?", a: ["Béchamel", "Velouté", "Hollandaise", "Espagnole"], c: 2, d: 3 },
    { q: "Where does Bibimbap originate?", a: ["Japan", "China", "Vietnam", "South Korea"], c: 3, d: 3 },
    { q: "Which enzyme in pineapple breaks down protein?", a: ["Papain", "Bromelain", "Amylase", "Lipase"], c: 1, d: 3 },
    { q: "Maillard reaction describes what?", a: ["Sugar caramelization", "Protein & sugar browning", "Fat emulsification", "Starch gelatinization"], c: 1, d: 4 },
    { q: "Which spice is the stigma of Crocus sativus?", a: ["Cardamom", "Turmeric", "Vanilla", "Saffron"], c: 3, d: 3 },
    { q: "In molecular gastronomy, what makes liquid caviar spheres?", a: ["Emulsification", "Spherification", "Gelification", "Cryogenics"], c: 1, d: 4 },
    { q: "Traditional fat in French croissant dough?", a: ["Lard", "Vegetable oil", "Margarine", "Butter"], c: 3, d: 2 },
    { q: "Which country produces the most coffee?", a: ["Colombia", "Vietnam", "Ethiopia", "Brazil"], c: 3, d: 2 },
    { q: "What is 'Ibérico' in Spanish cuisine?", a: ["A cheese", "A saffron stew", "Cured ham", "Olive oil variety"], c: 2, d: 3 },
    { q: "Koji fermentation uses which organism?", a: ["Saccharomyces", "Aspergillus oryzae", "Lactobacillus", "Penicillium"], c: 1, d: 4 },
  ],
  tech: [
    { q: "What does CPU stand for?", a: ["Central Power Unit", "Core Processing Unit", "Computer Processing Unit", "Central Processing Unit"], c: 3, d: 1 },
    { q: "What does HTTP stand for?", a: ["High Transfer Text Protocol", "HyperText Transfer Process", "HyperText Transfer Protocol", "Hyper Transfer Technical Protocol"], c: 2, d: 1 },
    { q: "Which company made the iPhone?", a: ["Samsung", "Google", "Microsoft", "Apple"], c: 3, d: 1 },
    { q: "What does SQL stand for?", a: ["Simple Query Language", "Structured Query Language", "Sequential Query Logic", "Standard Query Language"], c: 1, d: 2 },
    { q: "What does API stand for?", a: ["App Processing Interface", "Automated Protocol Integration", "Application Programming Interface", "Advanced Protocol Interface"], c: 2, d: 2 },
    { q: "Time complexity of binary search?", a: ["O(1)", "O(n)", "O(log n)", "O(n²)"], c: 2, d: 3 },
    { q: "What does DNS stand for?", a: ["Domain Name System", "Digital Network Service", "Data Naming Standard", "Dynamic Node Server"], c: 0, d: 2 },
    { q: "What does TCP stand for?", a: ["Transfer Control Protocol", "Transmission Control Protocol", "Transmission Communication Packet", "Transfer Communication Protocol"], c: 1, d: 3 },
    { q: "Purpose of a hash function?", a: ["Encrypt messages", "Generate random numbers", "Map data to fixed-size values", "Compress files"], c: 2, d: 3 },
    { q: "Which pattern ensures one instance of a class?", a: ["Factory", "Observer", "Singleton", "Decorator"], c: 2, d: 3 },
    { q: "What does the CAP theorem state?", a: ["Max 2 of: Consistency, Availability, Partition tolerance", "All 3 of C, A, P must be met", "Caching Avoids Performance issues", "C and P are inversely related"], c: 0, d: 4 },
    { q: "First Linux version released in?", a: ["1989", "1990", "1991", "1992"], c: 2, d: 4 },
    { q: "Best average-case sorting algorithm?", a: ["Bubble sort", "Insertion sort", "Quick sort", "Merge sort"], c: 3, d: 3 },
    { q: "OSI layer for IP addressing?", a: ["Transport", "Data Link", "Physical", "Network"], c: 3, d: 4 },
    { q: "What is Big O notation used for?", a: ["Memory allocation", "Algorithm time/space complexity", "CPU scheduling", "Database indexing"], c: 1, d: 2 },
  ],
  geography: [
    { q: "Capital of Australia?", a: ["Sydney", "Melbourne", "Brisbane", "Canberra"], c: 3, d: 1 },
    { q: "Longest river in the world?", a: ["Amazon", "Nile", "Yangtze", "Mississippi"], c: 1, d: 1 },
    { q: "Which is both a country and continent?", a: ["Greenland", "Iceland", "Australia", "Antarctica"], c: 2, d: 1 },
    { q: "Which country has the most natural lakes?", a: ["Russia", "USA", "Brazil", "Canada"], c: 3, d: 2 },
    { q: "Mountain range separating Europe from Asia?", a: ["Caucasus", "Carpathians", "Alps", "Ural"], c: 3, d: 2 },
    { q: "World's largest hot desert?", a: ["Gobi", "Kalahari", "Arabian", "Sahara"], c: 3, d: 2 },
    { q: "Atacama Desert is on which continent?", a: ["Africa", "Australia", "South America", "North America"], c: 2, d: 2 },
    { q: "Which country has the most time zones?", a: ["Russia", "USA", "China", "France"], c: 3, d: 3 },
    { q: "Strait of Malacca separates which land masses?", a: ["Australia & Papua New Guinea", "Malaysia & Sumatra", "India & Sri Lanka", "Singapore & Borneo"], c: 1, d: 3 },
    { q: "Danube flows into which sea?", a: ["Adriatic", "Mediterranean", "Black Sea", "Caspian"], c: 2, d: 3 },
    { q: "Deepest lake in the world?", a: ["Caspian Sea", "Lake Superior", "Lake Titicaca", "Lake Baikal"], c: 3, d: 3 },
    { q: "Khyber Pass connects which two countries?", a: ["India & China", "Iran & Iraq", "Pakistan & Afghanistan", "Tajikistan & Uzbekistan"], c: 2, d: 3 },
    { q: "Which country has the most Amazon rainforest?", a: ["Colombia", "Peru", "Venezuela", "Brazil"], c: 3, d: 2 },
    { q: "Lake Titicaca borders which two countries?", a: ["Brazil & Bolivia", "Peru & Bolivia", "Chile & Peru", "Colombia & Ecuador"], c: 1, d: 3 },
    { q: "Country with the longest coastline?", a: ["Russia", "Australia", "Norway", "Canada"], c: 3, d: 4 },
  ],
};

/* Build random category from all questions */
QDB.random = Object.values(QDB).filter((q): q is Question[] => Array.isArray(q)).flat();
