import type { CategoryId, Question } from "./types";

export const ALL_QUESTIONS: Record<Exclude<CategoryId, "random">, Question[]> = {
  "general": [
    {
      "q": "What is the largest ocean on Earth?",
      "a": [
        "Atlantic",
        "Pacific",
        "Indian",
        "Arctic"
      ],
      "c": 1,
      "d": 1
    },
    {
      "q": "How many sides does a hexagon have?",
      "a": [
        "5",
        "6",
        "7",
        "8"
      ],
      "c": 1,
      "d": 1
    },
    {
      "q": "What is the chemical symbol for gold?",
      "a": [
        "Gd",
        "Gl",
        "Go",
        "Au"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "How many bones are in the adult human body?",
      "a": [
        "186",
        "196",
        "206",
        "216"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What is the most spoken language in the world by total speakers?",
      "a": [
        "Mandarin",
        "Spanish",
        "Hindi",
        "English"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the smallest country in the world by land area?",
      "a": [
        "Monaco",
        "San Marino",
        "Liechtenstein",
        "Vatican City"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the only mammal capable of true flight?",
      "a": [
        "Flying squirrel",
        "Bat",
        "Sugar glider",
        "Flying lemur"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "Which element has the highest melting point?",
      "a": [
        "Iron",
        "Tungsten",
        "Carbon",
        "Osmium"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the Fibonacci sequence's 10th number?",
      "a": [
        "34",
        "44",
        "55",
        "89"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "In what year was the Magna Carta signed?",
      "a": [
        "1205",
        "1215",
        "1225",
        "1235"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the term for a word that reads the same forwards and backwards?",
      "a": [
        "Anagram",
        "Palindrome",
        "Homophone",
        "Oxymoron"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "How many times does the letter 'e' appear in 'independent'?",
      "a": [
        "2",
        "3",
        "4",
        "5"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which philosopher wrote 'Critique of Pure Reason'?",
      "a": [
        "Hegel",
        "Nietzsche",
        "Kant",
        "Schopenhauer"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "What is the only number that is twice the sum of its digits?",
      "a": [
        "12",
        "18",
        "24",
        "36"
      ],
      "c": 1,
      "d": 4
    },
    {
      "q": "The word 'salary' derives from the Latin word for what?",
      "a": [
        "Gold",
        "Silver",
        "Salt",
        "Silk"
      ],
      "c": 2,
      "d": 4
    }
  ],
  "sports": [
    {
      "q": "How many players are on a soccer team on the field?",
      "a": [
        "9",
        "10",
        "11",
        "12"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "How many rings are on the Olympic flag?",
      "a": [
        "4",
        "5",
        "6",
        "7"
      ],
      "c": 1,
      "d": 1
    },
    {
      "q": "How many points is a touchdown worth in American football?",
      "a": [
        "3",
        "4",
        "6",
        "7"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Which country has won the most FIFA World Cups?",
      "a": [
        "Germany",
        "Italy",
        "Argentina",
        "Brazil"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "In tennis, what is the term for a score of 40-40?",
      "a": [
        "Tie",
        "Even",
        "Deuce",
        "Set"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "How many dimples does a standard golf ball have?",
      "a": [
        "276",
        "336",
        "492",
        "500"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the maximum break in snooker?",
      "a": [
        "145",
        "147",
        "150",
        "155"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Which country has won the most Olympic gold medals in total?",
      "a": [
        "Russia",
        "China",
        "Germany",
        "USA"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "How long is a standard marathon in miles (to two decimal places)?",
      "a": [
        "26.20",
        "26.22",
        "26.24",
        "26.28"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "In which year were women first allowed to compete in the Olympic marathon?",
      "a": [
        "1972",
        "1976",
        "1980",
        "1984"
      ],
      "c": 3,
      "d": 4
    },
    {
      "q": "What is the diameter of a basketball hoop in inches?",
      "a": [
        "16",
        "18",
        "20",
        "22"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Which Formula 1 driver has the most world championships?",
      "a": [
        "Ayrton Senna",
        "Michael Schumacher",
        "Lewis Hamilton",
        "Sebastian Vettel"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "The Fosbury Flop is a technique used in which event?",
      "a": [
        "Long jump",
        "Pole vault",
        "High jump",
        "Triple jump"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "How many players are on a water polo team in the water?",
      "a": [
        "5",
        "6",
        "7",
        "8"
      ],
      "c": 2,
      "d": 4
    },
    {
      "q": "What year did the first Super Bowl take place?",
      "a": [
        "1965",
        "1967",
        "1969",
        "1971"
      ],
      "c": 1,
      "d": 3
    }
  ],
  "movies": [
    {
      "q": "Who directed 'The Dark Knight' (2008)?",
      "a": [
        "Zack Snyder",
        "J.J. Abrams",
        "Christopher Nolan",
        "Tim Burton"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "What 1994 film features the line 'Life is like a box of chocolates'?",
      "a": [
        "Cast Away",
        "Philadelphia",
        "Forrest Gump",
        "The Green Mile"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Who played Iron Man in the MCU?",
      "a": [
        "Chris Evans",
        "Mark Ruffalo",
        "Chris Hemsworth",
        "Robert Downey Jr."
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "Which film won the most Academy Awards in history (tied)?",
      "a": [
        "Gone with the Wind",
        "Ben-Hur",
        "Titanic",
        "The Lord of the Rings: The Return of the King"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "Who directed 'Pulp Fiction'?",
      "a": [
        "Martin Scorsese",
        "David Lynch",
        "Quentin Tarantino",
        "Joel Coen"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What Kubrick film is based on a Stephen King novel?",
      "a": [
        "Eyes Wide Shut",
        "Full Metal Jacket",
        "A Clockwork Orange",
        "The Shining"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "In 'Inception', what is the name of the top used to test reality?",
      "a": [
        "Anchor",
        "Totem",
        "Token",
        "Teller"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Which actor has been nominated for the most Academy Awards without winning?",
      "a": [
        "Glenn Close",
        "Peter O'Toole",
        "Amy Adams",
        "Richard Burton"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What was the first Pixar film not to be directed by John Lasseter?",
      "a": [
        "Monsters Inc.",
        "Finding Nemo",
        "The Incredibles",
        "WALL-E"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "'Oldboy' (2003), considered one of the greatest films ever made, is from which country?",
      "a": [
        "Japan",
        "China",
        "South Korea",
        "Hong Kong"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "What 1927 film is widely credited as the first feature-length sound film?",
      "a": [
        "Metropolis",
        "Sunrise",
        "The Jazz Singer",
        "Wings"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which director has the most films in the AFI Top 100 list?",
      "a": [
        "Orson Welles",
        "Alfred Hitchcock",
        "Stanley Kubrick",
        "Billy Wilder"
      ],
      "c": 1,
      "d": 4
    },
    {
      "q": "Tarkovsky's 'Solaris' is based on a novel by which author?",
      "a": [
        "Isaac Asimov",
        "Philip K. Dick",
        "Stanisław Lem",
        "Arthur C. Clarke"
      ],
      "c": 2,
      "d": 4
    },
    {
      "q": "In 'Mulholland Drive', what is the name of the mysterious blue box?",
      "a": [
        "The Cube",
        "The Silencio Box",
        "The Diane Box",
        "It has no name"
      ],
      "c": 3,
      "d": 4
    },
    {
      "q": "Which cinematographer shot both 'No Country for Old Men' and 'Skyfall'?",
      "a": [
        "Emmanuel Lubezki",
        "Robert Elswit",
        "Roger Deakins",
        "Janusz Kamiński"
      ],
      "c": 2,
      "d": 4
    }
  ],
  "music": [
    {
      "q": "Which band released 'Bohemian Rhapsody'?",
      "a": [
        "The Rolling Stones",
        "Led Zeppelin",
        "Queen",
        "The Beatles"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "How many strings does a standard guitar have?",
      "a": [
        "4",
        "5",
        "6",
        "7"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Who is known as the 'King of Pop'?",
      "a": [
        "Prince",
        "Elvis Presley",
        "James Brown",
        "Michael Jackson"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "Which country does the band U2 originate from?",
      "a": [
        "UK",
        "USA",
        "Australia",
        "Ireland"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "How many keys does a standard piano have?",
      "a": [
        "72",
        "80",
        "88",
        "96"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What time signature is a waltz played in?",
      "a": [
        "2/4",
        "3/4",
        "4/4",
        "6/8"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "Which composer wrote 'The Four Seasons'?",
      "a": [
        "Bach",
        "Handel",
        "Vivaldi",
        "Mozart"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What genre did Robert Johnson pioneer?",
      "a": [
        "Jazz",
        "Country",
        "Delta Blues",
        "Ragtime"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "How many symphonies did Beethoven compose?",
      "a": [
        "7",
        "8",
        "9",
        "10"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What is the name of the guitar technique where you tap the fretboard with both hands?",
      "a": [
        "Hammer-on",
        "Tapping",
        "Sweep picking",
        "Legato"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Which Miles Davis album is widely considered the best-selling jazz record of all time?",
      "a": [
        "Bitches Brew",
        "A Kind of Blue",
        "In a Silent Way",
        "Birth of the Cool"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Sergei Rachmaninoff's Piano Concerto No. 2 is in which key?",
      "a": [
        "D minor",
        "F major",
        "C minor",
        "A major"
      ],
      "c": 2,
      "d": 4
    },
    {
      "q": "Which band's debut album was 'Please Please Me' (1963)?",
      "a": [
        "The Kinks",
        "The Rolling Stones",
        "The Beatles",
        "The Who"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "John Coltrane's 'A Love Supreme' was recorded in which year?",
      "a": [
        "1960",
        "1962",
        "1964",
        "1966"
      ],
      "c": 2,
      "d": 4
    },
    {
      "q": "What is the Italian musical term for gradually getting louder?",
      "a": [
        "Forte",
        "Crescendo",
        "Accelerando",
        "Sforzando"
      ],
      "c": 1,
      "d": 3
    }
  ],
  "science": [
    {
      "q": "What is the powerhouse of the cell?",
      "a": [
        "Nucleus",
        "Ribosome",
        "Golgi apparatus",
        "Mitochondria"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What is the chemical formula for water?",
      "a": [
        "HO",
        "H3O",
        "OH",
        "H2O"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What gas do plants absorb during photosynthesis?",
      "a": [
        "Oxygen",
        "Nitrogen",
        "Hydrogen",
        "Carbon dioxide"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What is the speed of light in a vacuum (km/s, rounded)?",
      "a": [
        "200,000",
        "300,000",
        "400,000",
        "500,000"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "What is the atomic number of carbon?",
      "a": [
        "4",
        "5",
        "6",
        "8"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "Which planet has the most moons in our solar system?",
      "a": [
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "What is the half-life of Carbon-14 (in years)?",
      "a": [
        "1,430",
        "5,730",
        "14,300",
        "57,300"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the name of the quantum effect where particles pass through barriers they classically couldn't?",
      "a": [
        "Superposition",
        "Entanglement",
        "Tunneling",
        "Diffraction"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "What is the SI unit of electric capacitance?",
      "a": [
        "Henry",
        "Tesla",
        "Farad",
        "Weber"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "What is the most abundant gas in Earth's atmosphere?",
      "a": [
        "Oxygen",
        "Argon",
        "Carbon dioxide",
        "Nitrogen"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "Which subatomic particle has no electric charge?",
      "a": [
        "Proton",
        "Electron",
        "Neutron",
        "Muon"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What does E=mc² solve for in Einstein's equation?",
      "a": [
        "Momentum",
        "Energy",
        "Mass-velocity",
        "Force"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "What is the Chandrasekhar limit?",
      "a": [
        "Max mass of a neutron star",
        "Max mass of a white dwarf",
        "Min mass for nuclear fusion",
        "Speed of a black hole's event horizon"
      ],
      "c": 1,
      "d": 4
    },
    {
      "q": "Which force is described by quantum chromodynamics?",
      "a": [
        "Electromagnetism",
        "Weak nuclear force",
        "Strong nuclear force",
        "Gravity"
      ],
      "c": 2,
      "d": 4
    },
    {
      "q": "What is the approximate age of the universe in billions of years?",
      "a": [
        "9.8",
        "11.4",
        "13.8",
        "15.2"
      ],
      "c": 2,
      "d": 3
    }
  ],
  "history": [
    {
      "q": "In what year did World War II end?",
      "a": [
        "1943",
        "1944",
        "1945",
        "1946"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Who was the first President of the United States?",
      "a": [
        "John Adams",
        "Benjamin Franklin",
        "Thomas Jefferson",
        "George Washington"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What ship sank on its maiden voyage in 1912?",
      "a": [
        "SS Lusitania",
        "SS Britannic",
        "SS Olympic",
        "RMS Titanic"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What year did the Berlin Wall fall?",
      "a": [
        "1987",
        "1988",
        "1989",
        "1991"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "Who painted the Sistine Chapel ceiling?",
      "a": [
        "Raphael",
        "Leonardo da Vinci",
        "Donatello",
        "Michelangelo"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "The Peloponnesian War was fought between which two city-states?",
      "a": [
        "Athens and Corinth",
        "Sparta and Thebes",
        "Athens and Sparta",
        "Corinth and Thebes"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "In what year did the first human land on the Moon?",
      "a": [
        "1967",
        "1968",
        "1969",
        "1970"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "Which Roman emperor converted to Christianity?",
      "a": [
        "Nero",
        "Augustus",
        "Caligula",
        "Constantine"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "The Treaty of Westphalia (1648) ended which war?",
      "a": [
        "The Hundred Years' War",
        "The Thirty Years' War",
        "The War of Spanish Succession",
        "The Seven Years' War"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "Who was the last Tsar of Russia?",
      "a": [
        "Alexander III",
        "Nicholas I",
        "Alexander II",
        "Nicholas II"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "The Meiji Restoration occurred in which country?",
      "a": [
        "China",
        "Korea",
        "Japan",
        "Vietnam"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "Which Carthaginian general famously crossed the Alps with war elephants?",
      "a": [
        "Hasdrubal",
        "Hannibal",
        "Hamilcar",
        "Hanno"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "The assassination of which archduke triggered World War I?",
      "a": [
        "Franz Joseph",
        "Karl I",
        "Franz Ferdinand",
        "Maximilian I"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "The Code of Hammurabi was written in which ancient script?",
      "a": [
        "Hieroglyphics",
        "Cuneiform",
        "Linear B",
        "Phoenician"
      ],
      "c": 1,
      "d": 4
    },
    {
      "q": "Who was the Byzantine Emperor during the fall of Constantinople in 1453?",
      "a": [
        "Constantine X",
        "John VIII",
        "Manuel II",
        "Constantine XI"
      ],
      "c": 3,
      "d": 4
    }
  ],
  "food": [
    {
      "q": "Which country invented pizza?",
      "a": [
        "France",
        "Greece",
        "Spain",
        "Italy"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What is the main ingredient in guacamole?",
      "a": [
        "Tomato",
        "Lime",
        "Mango",
        "Avocado"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What nut is used to make marzipan?",
      "a": [
        "Walnut",
        "Cashew",
        "Hazelnut",
        "Almond"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "Gouda is a cheese from which country?",
      "a": [
        "France",
        "Belgium",
        "Switzerland",
        "Netherlands"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the spice that gives turmeric its yellow color?",
      "a": [
        "Saffron",
        "Annatto",
        "Paprika",
        "Curcumin"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "Which country does Pad Thai originate from?",
      "a": [
        "Vietnam",
        "Cambodia",
        "Laos",
        "Thailand"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the Scoville scale used to measure?",
      "a": [
        "Saltiness",
        "Acidity",
        "Spiciness",
        "Bitterness"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "From which country does the dish 'Bibimbap' originate?",
      "a": [
        "Japan",
        "China",
        "Vietnam",
        "South Korea"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "What enzyme in pineapple breaks down protein?",
      "a": [
        "Papain",
        "Bromelain",
        "Amylase",
        "Lipase"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is 'Ibérico' in Spanish cuisine?",
      "a": [
        "A cheese from Castile",
        "A saffron-based stew",
        "A type of cured ham",
        "An olive oil variety"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which French sauce is made from egg yolks and clarified butter?",
      "a": [
        "Béchamel",
        "Velouté",
        "Hollandaise",
        "Espagnole"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "The Maillard reaction describes what process in cooking?",
      "a": [
        "Caramelization of sugars",
        "Browning of proteins and sugars",
        "Emulsification of fats",
        "Gelatinization of starch"
      ],
      "c": 1,
      "d": 4
    },
    {
      "q": "What Japanese fermented soybean paste is used in miso soup?",
      "a": [
        "Natto",
        "Shiro",
        "Miso",
        "Koji"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which spice comes from the dried stigma of Crocus sativus?",
      "a": [
        "Cardamom",
        "Turmeric",
        "Vanilla",
        "Saffron"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "In molecular gastronomy, what process creates 'caviar' spheres from liquid?",
      "a": [
        "Emulsification",
        "Spherification",
        "Gelification",
        "Cryogenics"
      ],
      "c": 1,
      "d": 4
    }
  ],
  "tech": [
    {
      "q": "What does 'CPU' stand for?",
      "a": [
        "Central Power Unit",
        "Core Processing Unit",
        "Computer Processing Unit",
        "Central Processing Unit"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What does 'HTTP' stand for?",
      "a": [
        "High Transfer Text Protocol",
        "HyperText Transfer Process",
        "HyperText Transfer Protocol",
        "Hyper Transfer Technical Protocol"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Which company created the iPhone?",
      "a": [
        "Samsung",
        "Google",
        "Microsoft",
        "Apple"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "What programming language is primarily used for web styling?",
      "a": [
        "HTML",
        "JavaScript",
        "Python",
        "CSS"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "In what year was Google founded?",
      "a": [
        "1996",
        "1997",
        "1998",
        "2000"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What does 'SQL' stand for?",
      "a": [
        "Simple Query Language",
        "Structured Query Language",
        "Sequential Query Logic",
        "Standard Query Language"
      ],
      "c": 1,
      "d": 2
    },
    {
      "q": "What does 'API' stand for?",
      "a": [
        "Application Processing Interface",
        "Automated Protocol Integration",
        "Application Programming Interface",
        "Advanced Protocol Interface"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What is the time complexity of binary search?",
      "a": [
        "O(1)",
        "O(n)",
        "O(log n)",
        "O(n²)"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which sorting algorithm has the best average-case time complexity?",
      "a": [
        "Bubble sort",
        "Insertion sort",
        "Quick sort",
        "Merge sort"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "What does 'DNS' stand for?",
      "a": [
        "Domain Name System",
        "Digital Network Service",
        "Data Naming Standard",
        "Dynamic Node Server"
      ],
      "c": 0,
      "d": 2
    },
    {
      "q": "In networking, what does 'TCP' stand for?",
      "a": [
        "Transfer Control Protocol",
        "Transmission Control Protocol",
        "Transmission Communication Packet",
        "Transfer Communication Protocol"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the purpose of a hash function in cryptography?",
      "a": [
        "Encrypting messages",
        "Generating random numbers",
        "Mapping data to fixed-size values",
        "Compressing files"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which design pattern ensures a class has only one instance?",
      "a": [
        "Factory",
        "Observer",
        "Singleton",
        "Decorator"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "What is the CAP theorem in distributed systems?",
      "a": [
        "You can have at most 2 of: Consistency, Availability, Partition tolerance",
        "All three: Compute, Access, Persistence must be satisfied",
        "Caching Always Prevents slowdowns",
        "Consistency and Performance are inversely related"
      ],
      "c": 0,
      "d": 4
    },
    {
      "q": "What year was the first version of Linux released?",
      "a": [
        "1989",
        "1990",
        "1991",
        "1992"
      ],
      "c": 2,
      "d": 4
    }
  ],
  "geography": [
    {
      "q": "What is the capital of Australia?",
      "a": [
        "Sydney",
        "Melbourne",
        "Brisbane",
        "Canberra"
      ],
      "c": 3,
      "d": 1
    },
    {
      "q": "Which is the longest river in the world?",
      "a": [
        "Amazon",
        "Nile",
        "Yangtze",
        "Mississippi"
      ],
      "c": 1,
      "d": 1
    },
    {
      "q": "What country has the most natural lakes?",
      "a": [
        "Russia",
        "USA",
        "Brazil",
        "Canada"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "The Atacama Desert is located in which continent?",
      "a": [
        "Africa",
        "Australia",
        "South America",
        "North America"
      ],
      "c": 2,
      "d": 2
    },
    {
      "q": "What is the smallest country in the world?",
      "a": [
        "Monaco",
        "Liechtenstein",
        "Nauru",
        "Vatican City"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "Which country has the most time zones?",
      "a": [
        "Russia",
        "USA",
        "China",
        "France"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "The Strait of Malacca separates which two bodies of land?",
      "a": [
        "Australia and Papua New Guinea",
        "Malaysia and Sumatra",
        "India and Sri Lanka",
        "Singapore and Borneo"
      ],
      "c": 1,
      "d": 3
    },
    {
      "q": "What is the only country that is also a continent?",
      "a": [
        "Greenland",
        "Iceland",
        "Australia",
        "Antarctica"
      ],
      "c": 2,
      "d": 1
    },
    {
      "q": "Which mountain range separates Europe from Asia?",
      "a": [
        "Caucasus",
        "Carpathians",
        "Alps",
        "Ural"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the world's largest hot desert?",
      "a": [
        "Gobi",
        "Kalahari",
        "Arabian",
        "Sahara"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "The Danube river flows into which sea?",
      "a": [
        "Adriatic Sea",
        "Mediterranean Sea",
        "Black Sea",
        "Caspian Sea"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which country contains the most of the Amazon rainforest?",
      "a": [
        "Colombia",
        "Peru",
        "Venezuela",
        "Brazil"
      ],
      "c": 3,
      "d": 2
    },
    {
      "q": "What is the deepest lake in the world?",
      "a": [
        "Caspian Sea",
        "Lake Superior",
        "Lake Titicaca",
        "Lake Baikal"
      ],
      "c": 3,
      "d": 3
    },
    {
      "q": "The Khyber Pass connects which two countries?",
      "a": [
        "India and China",
        "Iran and Iraq",
        "Pakistan and Afghanistan",
        "Tajikistan and Uzbekistan"
      ],
      "c": 2,
      "d": 3
    },
    {
      "q": "Which island country is located at the southernmost tip of the Arabian Peninsula?",
      "a": [
        "Bahrain",
        "Sri Lanka",
        "Maldives",
        "Socotra (Yemen)"
      ],
      "c": 3,
      "d": 4
    }
  ]
};
