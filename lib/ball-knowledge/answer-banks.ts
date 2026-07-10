import type { CategoryName } from "./categories";
import { normKey, type BankEntry } from "./normalize";

const RAW_BANKS: Record<CategoryName, string[]> = {
    "NBA Teams": [
      "Atlanta Hawks|Hawks","Boston Celtics|Celtics","Brooklyn Nets|Nets","Charlotte Hornets|Hornets",
      "Chicago Bulls|Bulls","Cleveland Cavaliers|Cavs|Cavaliers","Dallas Mavericks|Mavs|Mavericks",
      "Denver Nuggets|Nuggets","Detroit Pistons|Pistons","Golden State Warriors|Warriors|GSW",
      "Houston Rockets|Rockets","Indiana Pacers|Pacers","LA Clippers|Los Angeles Clippers|Clippers",
      "Los Angeles Lakers|LA Lakers|Lakers","Memphis Grizzlies|Grizzlies","Miami Heat|Heat",
      "Milwaukee Bucks|Bucks","Minnesota Timberwolves|Timberwolves|Wolves","New Orleans Pelicans|Pelicans",
      "New York Knicks|Knicks","Oklahoma City Thunder|Thunder|OKC","Orlando Magic|Magic",
      "Philadelphia 76ers|76ers|Sixers","Phoenix Suns|Suns","Portland Trail Blazers|Trail Blazers|Blazers",
      "Sacramento Kings|Kings","San Antonio Spurs|Spurs","Toronto Raptors|Raptors","Utah Jazz|Jazz",
      "Washington Wizards|Wizards"
    ],
    "NFL Teams": [
      "Arizona Cardinals|Cardinals","Atlanta Falcons|Falcons","Baltimore Ravens|Ravens","Buffalo Bills|Bills",
      "Carolina Panthers|Panthers","Chicago Bears|Bears","Cincinnati Bengals|Bengals","Cleveland Browns|Browns",
      "Dallas Cowboys|Cowboys","Denver Broncos|Broncos","Detroit Lions|Lions","Green Bay Packers|Packers",
      "Houston Texans|Texans","Indianapolis Colts|Colts","Jacksonville Jaguars|Jaguars|Jags",
      "Kansas City Chiefs|Chiefs","Las Vegas Raiders|Raiders","Los Angeles Chargers|LA Chargers|Chargers",
      "Los Angeles Rams|LA Rams|Rams","Miami Dolphins|Dolphins","Minnesota Vikings|Vikings",
      "New England Patriots|Patriots|Pats","New Orleans Saints|Saints","New York Giants|NY Giants|Giants",
      "New York Jets|NY Jets|Jets","Philadelphia Eagles|Eagles","Pittsburgh Steelers|Steelers",
      "San Francisco 49ers|49ers|Niners","Seattle Seahawks|Seahawks","Tampa Bay Buccaneers|Buccaneers|Bucs",
      "Tennessee Titans|Titans","Washington Commanders|Commanders"
    ],
    "Pizza Toppings": [
      "Pepperoni","Sausage","Mushroom|Mushrooms","Onion|Onions","Green Pepper|Bell Pepper|Green Peppers",
      "Black Olive|Black Olives|Olives","Bacon","Ham","Pineapple","Extra Cheese","Jalapeno|Jalapenos",
      "Spinach","Tomato|Tomatoes","Anchovy|Anchovies","Ground Beef","Chicken","Garlic","Basil",
      "Banana Pepper|Banana Peppers","Meatball|Meatballs","Buffalo Chicken","Artichoke|Artichokes",
      "Sun-Dried Tomato|Sun Dried Tomato","Ricotta","Prosciutto","Arugula","Roasted Red Pepper"
    ],
    "90s Cartoons": [
      "Rugrats","Doug","Hey Arnold","CatDog","Rocko's Modern Life|Rockos Modern Life",
      "The Ren and Stimpy Show|Ren and Stimpy","SpongeBob SquarePants|Spongebob","Batman: The Animated Series|Batman The Animated Series",
      "X-Men: The Animated Series|X-Men The Animated Series","Animaniacs","Tiny Toon Adventures|Tiny Toons",
      "Pinky and the Brain","Dexter's Laboratory|Dexters Laboratory","Johnny Bravo","Cow and Chicken",
      "Courage the Cowardly Dog","The Powerpuff Girls|Powerpuff Girls","Ed, Edd n Eddy|Ed Edd n Eddy",
      "Recess","Arthur","Wishbone","Captain Planet","Darkwing Duck","TaleSpin|Tailspin","Gargoyles",
      "Beavis and Butt-Head|Beavis and Butthead","South Park","Daria","Freakazoid",
      "Aaahh!!! Real Monsters|Real Monsters","KaBlam!|Kablam","Sailor Moon","Dragon Ball Z",
      "Pokemon","Digimon","Swat Kats","ReBoot|Reboot","The Wild Thornberrys|Wild Thornberrys"
    ],
    "Countries in South America": [
      "Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru",
      "Suriname","Uruguay","Venezuela"
    ],
    "Sneaker Brands": [
      "Nike","Adidas","Jordan|Air Jordan","Puma","Reebok","New Balance","Converse","Vans",
      "Under Armour","Asics","Skechers","Fila","Saucony","Brooks","Yeezy","Balenciaga","Timberland",
      "Salomon","Hoka|Hoka One One","On|On Running"
    ],
    "Breakfast Cereals": [
      "Cheerios","Frosted Flakes","Froot Loops","Corn Flakes","Rice Krispies","Lucky Charms",
      "Cinnamon Toast Crunch","Cap'n Crunch|Captain Crunch","Honey Nut Cheerios","Raisin Bran",
      "Special K","Cocoa Puffs","Trix","Fruity Pebbles","Cocoa Pebbles","Apple Jacks","Honeycomb",
      "Corn Pops","Wheaties","Chex","Golden Grahams","Reese's Puffs|Reeses Puffs","Cookie Crisp",
      "Kix","Life","Grape-Nuts|Grape Nuts","Frosted Mini-Wheats|Frosted Mini Wheats",
      "Honey Bunches of Oats","Cracklin' Oat Bran|Cracklin Oat Bran"
    ],
    "Dog Breeds": [
      "Labrador Retriever|Lab|Labrador","Golden Retriever","German Shepherd","Bulldog","Poodle",
      "Beagle","Rottweiler","Yorkshire Terrier|Yorkie","Boxer","Dachshund|Wiener Dog",
      "Siberian Husky|Husky","Great Dane","Doberman Pinscher|Doberman","Chihuahua","Shih Tzu",
      "Border Collie","Australian Shepherd|Aussie","Cocker Spaniel","Pug","Boston Terrier",
      "Corgi|Pembroke Welsh Corgi","Maltese","Pomeranian","French Bulldog|Frenchie",
      "Bernese Mountain Dog","Saint Bernard","Basset Hound","Bloodhound","Akita","Shiba Inu",
      "Pit Bull|American Pit Bull Terrier","Mastiff","Newfoundland","Weimaraner","Vizsla",
      "Collie","Papillon","Greyhound","Whippet","Dalmatian","Australian Cattle Dog|Blue Heeler"
    ],
    "Fast Food Chains": [
      "McDonald's|McDonalds","Burger King","Wendy's|Wendys","Taco Bell","KFC|Kentucky Fried Chicken",
      "Subway","Chick-fil-A|Chick fil A","Popeyes","Domino's|Dominos","Pizza Hut","Arby's|Arbys",
      "Sonic|Sonic Drive-In","Chipotle","Panera Bread|Panera","Dairy Queen","In-N-Out|In N Out",
      "Five Guys","Jack in the Box","Whataburger","Carl's Jr|Carls Jr","Hardee's|Hardees",
      "Little Caesars","Papa John's|Papa Johns","Zaxby's|Zaxbys","Culver's|Culvers","Shake Shack",
      "White Castle","Del Taco","Panda Express","Jimmy John's|Jimmy Johns"
    ],
    "Superheroes": [
      "Superman","Batman","Spider-Man|Spiderman","Iron Man","Captain America","Wonder Woman",
      "The Flash|Flash","Thor","Hulk","Black Panther","Wolverine","Green Lantern","Aquaman",
      "Black Widow","Hawkeye","Doctor Strange","Ant-Man|Antman","Captain Marvel","Daredevil",
      "Deadpool","Cyclops","Storm","Professor X","Batgirl","Supergirl","Nightwing","Green Arrow",
      "Shazam","Catwoman"
    ],
    "US State Capitals": [
      "Montgomery","Juneau","Phoenix","Little Rock","Sacramento","Denver","Hartford","Dover",
      "Tallahassee","Atlanta","Honolulu","Boise","Springfield","Indianapolis","Des Moines","Topeka",
      "Frankfort","Baton Rouge","Augusta","Annapolis","Boston","Lansing","Saint Paul|St Paul",
      "Jackson","Jefferson City","Helena","Lincoln","Carson City","Concord","Trenton","Santa Fe",
      "Albany","Raleigh","Bismarck","Columbus","Oklahoma City","Salem","Harrisburg","Providence",
      "Columbia","Pierre","Nashville","Austin","Salt Lake City","Montpelier","Richmond","Olympia",
      "Charleston","Madison","Cheyenne"
    ],
    "Card Games": [
      "Poker","Blackjack","Bridge","Rummy","Solitaire","Uno","Go Fish","Hearts","Spades","Euchre",
      "Crazy Eights","War","Gin Rummy","Canasta","Cribbage","Texas Hold'em|Texas Holdem|Hold'em",
      "Old Maid","Egyptian Ratscrew|Egyptian Rat Screw","Speed","Slapjack","Pinochle","Skat"
    ],
    "Dance Moves": [
      "The Floss|Floss","Whip","Nae Nae","Dab","Moonwalk","Running Man","Cha Cha Slide",
      "Electric Slide","Macarena","Twist","Robot","Worm","Breakdance|Breakdancing","Salsa","Tango",
      "Waltz","Cabbage Patch","Charleston","Hustle","Vogue|Voguing","Twerk|Twerking","Shuffle",
      "Dougie","Wobble","Moonwalk"
    ],
    "Video Game Consoles": [
      "Nintendo Switch|Switch","PlayStation 5|PS5","PlayStation 4|PS4","Xbox Series X",
      "Xbox One","Nintendo 64|N64","Super Nintendo|SNES","NES|Nintendo Entertainment System",
      "Game Boy|Gameboy","Sega Genesis","Sega Dreamcast|Dreamcast","PlayStation 2|PS2",
      "PlayStation 3|PS3","GameCube|Nintendo GameCube","Wii","Wii U","Xbox 360","Xbox",
      "Atari 2600|Atari","PlayStation Portable|PSP","Nintendo DS|DS","Nintendo 3DS|3DS",
      "Sega Saturn","TurboGrafx-16|TurboGrafx","Neo Geo"
    ],
    "Rappers": [
      "Jay-Z|JayZ","Eminem","Drake","Kendrick Lamar","Nas","Tupac|2Pac","The Notorious B.I.G.|Biggie|Notorious BIG",
      "Kanye West|Kanye","Lil Wayne","Snoop Dogg","50 Cent","Nicki Minaj","Cardi B","Travis Scott",
      "J. Cole|J Cole","Future","Ice Cube","Dr. Dre|Dr Dre","Missy Elliott","Ludacris","T.I.|TI",
      "Common","Rick Ross","Megan Thee Stallion","Post Malone","A$AP Rocky|ASAP Rocky","Wiz Khalifa",
      "Chance the Rapper","Kid Cudi","Big Sean","2 Chainz","Doja Cat","Lil Uzi Vert","Playboi Carti","DMX"
    ],
    "Ice Cream Flavors": [
      "Vanilla","Chocolate","Strawberry","Mint Chocolate Chip","Cookies and Cream","Rocky Road",
      "Butter Pecan","Neapolitan","Cookie Dough","Pistachio","Coffee","Cherry Garcia",
      "Chocolate Chip","Praline","Bubble Gum","Salted Caramel","Peanut Butter Cup","Birthday Cake",
      "Fudge Brownie","Coconut","Black Cherry","Green Tea|Matcha","Rum Raisin"
    ],
    "Types of Pasta": [
      "Spaghetti","Penne","Fettuccine","Linguine","Rigatoni","Fusilli","Macaroni","Ravioli",
      "Lasagna","Tortellini","Farfalle|Bowtie Pasta","Angel Hair","Ziti","Orzo","Gnocchi","Rotini",
      "Cannelloni","Bucatini","Orecchiette","Vermicelli","Manicotti","Tagliatelle","Pappardelle"
    ],
    "Broadway Musicals": [
      "Hamilton","Wicked","The Lion King","Chicago","Les Misérables|Les Miserables","The Phantom of the Opera|Phantom of the Opera",
      "Rent","Cats","West Side Story","Mamma Mia","Dear Evan Hansen","Hairspray","Hadestown","Six",
      "Waitress","Beetlejuice","Moulin Rouge!|Moulin Rouge","Aladdin","Frozen","The Book of Mormon|Book of Mormon",
      "Legally Blonde","Grease","A Chorus Line","Into the Woods","Sweeney Todd","Avenue Q","Newsies",
      "Kinky Boots","In the Heights","Come From Away"
    ],
    "Marvel Movies": [
      "Iron Man","The Incredible Hulk|Incredible Hulk","Iron Man 2","Thor","Captain America: The First Avenger|Captain America The First Avenger",
      "The Avengers|Avengers","Iron Man 3","Thor: The Dark World|Thor The Dark World",
      "Captain America: The Winter Soldier|Captain America The Winter Soldier","Guardians of the Galaxy",
      "Avengers: Age of Ultron|Avengers Age of Ultron","Ant-Man|Antman","Captain America: Civil War|Captain America Civil War",
      "Doctor Strange","Guardians of the Galaxy Vol. 2|Guardians of the Galaxy Vol 2",
      "Spider-Man: Homecoming|Spiderman Homecoming","Thor: Ragnarok|Thor Ragnarok","Black Panther",
      "Avengers: Infinity War|Avengers Infinity War","Ant-Man and the Wasp|Antman and the Wasp",
      "Captain Marvel","Avengers: Endgame|Avengers Endgame","Spider-Man: Far From Home|Spiderman Far From Home",
      "Black Widow","Shang-Chi and the Legend of the Ten Rings|Shang-Chi|Shang Chi","Eternals",
      "Spider-Man: No Way Home|Spiderman No Way Home","Doctor Strange in the Multiverse of Madness",
      "Thor: Love and Thunder|Thor Love and Thunder","Black Panther: Wakanda Forever|Black Panther Wakanda Forever",
      "Ant-Man and the Wasp: Quantumania|Antman and the Wasp Quantumania","Guardians of the Galaxy Vol. 3|Guardians of the Galaxy Vol 3",
      "The Marvels","Deadpool & Wolverine|Deadpool and Wolverine"
    ],
    "Types of Sandwiches": [
      "BLT","Club Sandwich","Grilled Cheese","Reuben","Philly Cheesesteak|Cheesesteak",
      "Turkey Club","Peanut Butter and Jelly|PB&J|PBJ","Ham and Cheese","Meatball Sub",
      "Sloppy Joe","French Dip","Cuban Sandwich|Cubano","Panini","Po' Boy|Po Boy|Poboy",
      "Monte Cristo","Muffuletta","Egg Salad","Tuna Salad","Chicken Salad","Bacon Egg and Cheese",
      "Gyro","Banh Mi"
    ],
    "Board Games": [
      "Monopoly","Scrabble","Clue|Cluedo","Risk","Sorry!|Sorry","The Game of Life|Life",
      "Candy Land|Candyland","Chutes and Ladders","Battleship","Trivial Pursuit","Chess","Checkers",
      "Connect Four","Catan|Settlers of Catan","Pictionary","Yahtzee","Operation","Guess Who?|Guess Who",
      "Backgammon","Stratego","Mouse Trap","Ticket to Ride","Codenames","Taboo","Twister","Jenga",
      "Sequence","Trouble","Parcheesi|Parchisi","Pandemic","Apples to Apples","Cranium",
      "Scattergories","Rummikub","Dominoes|Dominos","Qwirkle","Carcassonne","Azul","Risk 2210",
      "Clue Junior","Perfection","Trivial Pursuit Jr","Rack-O|Racko"
    ],
    "80s Action Movies": [
      "Die Hard","Rambo: First Blood|First Blood","Rambo","The Terminator|Terminator","Predator",
      "Lethal Weapon","RoboCop|Robocop","Rocky III","Rocky IV","Top Gun","Beverly Hills Cop",
      "Commando","Raiders of the Lost Ark","Indiana Jones and the Temple of Doom|Temple of Doom",
      "Indiana Jones and the Last Crusade|Last Crusade","Mad Max 2: The Road Warrior|The Road Warrior|Road Warrior",
      "Aliens","Red Dawn","Cobra","Bloodsport","Big Trouble in Little China","Escape from New York",
      "Conan the Barbarian"
    ],
    "Types of Cheese": [
      "Cheddar","Mozzarella","Swiss","Parmesan","Provolone","Brie","Gouda","Feta","Blue Cheese",
      "Gruyère|Gruyere","Colby","Monterey Jack","Ricotta","Cream Cheese","Camembert","Goat Cheese",
      "Pepper Jack","Havarti","Muenster","Cottage Cheese","Manchego","Asiago","Fontina","Roquefort",
      "American Cheese","Mascarpone","Burrata","Halloumi"
    ],
    "Countries That Border the Mediterranean": [
      "Spain","France","Monaco","Italy","Slovenia","Croatia","Bosnia and Herzegovina","Montenegro",
      "Albania","Greece","Turkey","Syria","Lebanon","Israel","Egypt","Libya","Tunisia","Algeria",
      "Morocco","Cyprus","Malta"
    ],
    "Sitcoms Set in New York City": [
      "Friends","Seinfeld","How I Met Your Mother","Sex and the City","The Nanny","Will & Grace|Will and Grace",
      "30 Rock","Broad City","The Odd Couple","Mad About You","Spin City","The King of Queens|King of Queens",
      "Living Single","Girls","Bored to Death","Unbreakable Kimmy Schmidt|Kimmy Schmidt","2 Broke Girls"
    ],
    "Taylor Swift Albums": [
      "Taylor Swift","Fearless","Speak Now","Red","1989","Reputation","Lover","Folklore","Evermore",
      "Midnights","The Tortured Poets Department"
    ],
    "Types of Whiskey": [
      "Bourbon","Scotch","Rye","Irish Whiskey","Tennessee Whiskey","Single Malt","Blended Whiskey",
      "Canadian Whisky","Japanese Whisky","Corn Whiskey","Moonshine","Wheat Whiskey"
    ],
    "Olympic Sports": [
      "Swimming","Athletics|Track and Field","Gymnastics","Basketball","Soccer|Football","Volleyball",
      "Tennis","Golf","Boxing","Wrestling","Judo","Taekwondo","Fencing","Archery","Shooting","Rowing",
      "Sailing","Cycling","Weightlifting","Diving","Water Polo","Table Tennis","Badminton","Handball",
      "Field Hockey","Rugby","Skateboarding","Surfing","Karate","Triathlon","Equestrian","Canoeing",
      "Ice Hockey","Figure Skating","Speed Skating","Skiing","Snowboarding","Curling","Bobsled|Bobsledding","Luge"
    ],
    "Disney Animated Movies": [
      "Snow White and the Seven Dwarfs","Pinocchio","Fantasia","Dumbo","Bambi","Cinderella",
      "Alice in Wonderland","Peter Pan","Lady and the Tramp","Sleeping Beauty","101 Dalmatians",
      "The Sword in the Stone","The Jungle Book","The Aristocats","Robin Hood","The Rescuers",
      "The Fox and the Hound","The Black Cauldron","The Great Mouse Detective","Oliver & Company|Oliver and Company",
      "The Little Mermaid","The Rescuers Down Under","Beauty and the Beast","Aladdin","The Lion King",
      "Pocahontas","The Hunchback of Notre Dame","Hercules","Mulan","Tarzan","Fantasia 2000","Dinosaur",
      "The Emperor's New Groove|Emperors New Groove","Atlantis: The Lost Empire|Atlantis The Lost Empire",
      "Lilo & Stitch|Lilo and Stitch","Treasure Planet","Brother Bear","Home on the Range",
      "Chicken Little","Meet the Robinsons","Bolt","The Princess and the Frog","Tangled",
      "Winnie the Pooh","Wreck-It Ralph|Wreck It Ralph","Frozen","Big Hero 6","Zootopia","Moana",
      "Ralph Breaks the Internet","Frozen II|Frozen 2","Raya and the Last Dragon","Encanto",
      "Strange World","Wish"
    ],
    "Wrestling Moves": [
      "Suplex","Powerbomb","DDT","Piledriver","Clothesline","Body Slam","Chokeslam","RKO",
      "Stone Cold Stunner|Stunner","Pedigree","Sharpshooter","Figure Four Leglock|Figure Four",
      "Sleeper Hold","Bulldog","Superkick","Elbow Drop","Leg Drop","Frog Splash","Moonsault",
      "Spear","Powerslam","Backbreaker","Armbar","Camel Clutch","Tombstone Piledriver","619"
    ],
    "Kitchen Appliances": [
      "Refrigerator|Fridge","Oven","Microwave","Dishwasher","Toaster","Blender","Stove",
      "Coffee Maker","Stand Mixer|Mixer","Food Processor","Slow Cooker|Crock Pot","Air Fryer",
      "Toaster Oven","Kettle","Freezer","Garbage Disposal","Rice Cooker","Waffle Maker","Juicer",
      "Instant Pot","Grill"
    ],
    "Types of Tacos": [
      "Carne Asada","Al Pastor","Carnitas","Fish Taco","Chicken Taco","Barbacoa","Birria",
      "Shrimp Taco","Veggie Taco","Lengua","Chorizo","Cabeza","Suadero","Breakfast Taco",
      "Ground Beef Taco","Steak Taco"
    ],
    "2000s Boy Bands": [
      "Backstreet Boys","NSYNC|N Sync|*NSYNC","Jonas Brothers","Big Time Rush","O-Town|O Town",
      "LFO","98 Degrees","B2K","Dream Street","Westlife","Blue"
    ],
    "Types of Sushi Rolls": [
      "California Roll","Spicy Tuna Roll","Dragon Roll","Rainbow Roll","Philadelphia Roll",
      "Tempura Roll","Eel Roll|Unagi Roll","Salmon Roll","Tuna Roll","Shrimp Tempura Roll",
      "Volcano Roll","Caterpillar Roll","Spider Roll","Alaska Roll","Boston Roll","Crunch Roll",
      "Tiger Roll","Godzilla Roll"
    ]
  };

function compileBank(lines: string[]): BankEntry[] {
  return lines.map((line) => {
    const parts = line.split("|");
    const canonical = parts[0]!;
    const aliases = new Set(parts.map((p) => normKey(p)));
    return { canonical, aliases };
  });
}

const COMPILED: Partial<Record<CategoryName, BankEntry[]>> = {};
for (const [cat, lines] of Object.entries(RAW_BANKS)) {
  COMPILED[cat as CategoryName] = compileBank(lines);
}

export function getAnswerBank(category: string): BankEntry[] | null {
  return COMPILED[category as CategoryName] ?? null;
}
