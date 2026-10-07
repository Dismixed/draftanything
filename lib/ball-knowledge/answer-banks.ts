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
    ],
    "NHL Teams": [
      "Anaheim Ducks|Ducks","Boston Bruins|Bruins","Buffalo Sabres|Sabres","Calgary Flames|Flames",
      "Carolina Hurricanes|Hurricanes|Canes","Chicago Blackhawks|Blackhawks|Hawks",
      "Colorado Avalanche|Avalanche|Avs","Columbus Blue Jackets|Blue Jackets","Dallas Stars|Stars",
      "Detroit Red Wings|Red Wings","Edmonton Oilers|Oilers","Florida Panthers|Panthers",
      "Los Angeles Kings|Kings","Minnesota Wild|Wild","Montreal Canadiens|Canadiens|Habs",
      "Nashville Predators|Predators|Preds","New Jersey Devils|Devils","New York Islanders|Islanders|Isles",
      "New York Rangers|Rangers","Ottawa Senators|Senators|Sens","Philadelphia Flyers|Flyers",
      "Pittsburgh Penguins|Penguins|Pens","San Jose Sharks|Sharks","Seattle Kraken|Kraken",
      "St. Louis Blues|Blues","Tampa Bay Lightning|Lightning|Bolts",
      "Toronto Maple Leafs|Maple Leafs|Leafs","Utah Hockey Club","Vancouver Canucks|Canucks",
      "Vegas Golden Knights|Golden Knights|Knights","Washington Capitals|Capitals|Caps",
      "Winnipeg Jets|Jets"
    ],
    "MLB Teams": [
      "Arizona Diamondbacks|Diamondbacks|D-backs","Atlanta Braves|Braves","Baltimore Orioles|Orioles",
      "Boston Red Sox|Red Sox","Chicago Cubs|Cubs","Chicago White Sox|White Sox",
      "Cincinnati Reds|Reds","Cleveland Guardians|Guardians|Indians","Colorado Rockies|Rockies",
      "Detroit Tigers|Tigers","Houston Astros|Astros","Kansas City Royals|Royals",
      "Los Angeles Angels|Angels","Los Angeles Dodgers|Dodgers","Miami Marlins|Marlins",
      "Milwaukee Brewers|Brewers","Minnesota Twins|Twins","New York Mets|Mets",
      "New York Yankees|Yankees","Oakland Athletics|Athletics|A's","Philadelphia Phillies|Phillies",
      "Pittsburgh Pirates|Pirates","San Diego Padres|Padres","San Francisco Giants|Giants",
      "Seattle Mariners|Mariners","St. Louis Cardinals|Cardinals","Tampa Bay Rays|Rays",
      "Texas Rangers|Rangers","Toronto Blue Jays|Blue Jays","Washington Nationals|Nationals|Nats"
    ],
    "Chess Openings": [
      "Sicilian Defense","Ruy Lopez","Italian Game","French Defense",
      "Caro-Kann Defense|Caro Kann Defense","King's Gambit|Kings Gambit",
      "Queen's Gambit|Queens Gambit","English Opening","London System","Scandinavian Defense",
      "Pirc Defense","Alekhine's Defense|Alekhines Defense","Grünfeld Defense|Grunfeld Defense",
      "King's Indian Defense|Kings Indian Defense","Queen's Indian Defense|Queens Indian Defense",
      "Nimzo-Indian Defense|Nimzo Indian Defense","Dutch Defense","Slav Defense",
      "Semi-Slav Defense|Semi Slav Defense","Benoni Defense","Reti Opening",
      "King's Indian Attack|Kings Indian Attack","Catalan Opening","Scotch Game","Vienna Game",
      "Bird's Opening|Birds Opening","Evans Gambit","Budapest Gambit","Danish Gambit",
      "Elephant Gambit","Fried Liver Attack","Scholar's Mate|Scholars Mate","Giuoco Piano",
      "Petrov Defense","Philidor Defense","Modern Defense"
    ],
    "Poker Hands": [
      "Royal Flush","Straight Flush","Four of a Kind|Quads","Full House|Full Boat|Boat",
      "Flush","Straight","Three of a Kind|Trips|Set","Two Pair","One Pair|Pair","High Card"
    ],
    "Yoga Poses": [
      "Downward Dog|Downward-Facing Dog","Warrior I|Warrior 1","Warrior II|Warrior 2",
      "Warrior III|Warrior 3","Child's Pose|Childs Pose","Cobra Pose|Cobra","Mountain Pose",
      "Tree Pose","Triangle Pose","Lotus Pose|Lotus","Corpse Pose|Savasana","Bridge Pose",
      "Cat Pose","Cow Pose","Plank Pose|Plank","Upward Dog|Upward-Facing Dog","Crow Pose|Crow",
      "Pigeon Pose|Pigeon","Eagle Pose|Eagle","Boat Pose|Boat","Chair Pose|Chair",
      "Half Moon Pose","Happy Baby Pose","Dolphin Pose","Sphinx Pose","Locust Pose","Bow Pose",
      "Camel Pose","Garland Pose|Malasana","Headstand","Shoulder Stand","Sun Salutation"
    ],
    "Martial Arts": [
      "Karate","Judo","Taekwondo|Tae Kwon Do","Kung Fu","Boxing","Kickboxing","Muay Thai",
      "Brazilian Jiu-Jitsu|BJJ","Jiu-Jitsu|Jujitsu","Aikido","Krav Maga","Wrestling","Sambo",
      "Capoeira","Hapkido","Wing Chun","Jeet Kune Do","Kendo","Sumo","Mixed Martial Arts|MMA",
      "Tang Soo Do","Savate","Eskrima|Arnis|Kali","Silat","Tai Chi|Taichi"
    ],
    "Track and Field Events": [
      "100 Meters|100m","200 Meters|200m","400 Meters|400m","800 Meters|800m",
      "1500 Meters|1500m","5000 Meters|5000m","10000 Meters|10000m","Marathon","Hurdles",
      "110 Meter Hurdles","400 Meter Hurdles","Steeplechase","Long Jump","High Jump",
      "Triple Jump","Pole Vault","Shot Put","Discus Throw|Discus","Javelin Throw|Javelin",
      "Hammer Throw","Decathlon","Heptathlon","Race Walking|Racewalking","Relay",
      "4x100 Relay|4x100"
    ],
    "Pokemon": [
      "Pikachu","Charizard","Bulbasaur","Squirtle","Charmander","Venusaur","Blastoise",
      "Mewtwo","Mew","Eevee","Vaporeon","Jolteon","Flareon","Snorlax","Gengar","Gyarados",
      "Dragonite","Lucario","Greninja","Blaziken","Rayquaza","Articuno","Zapdos","Moltres",
      "Jigglypuff","Psyduck","Machamp","Alakazam","Golem","Garchomp","Tyranitar","Sceptile",
      "Swampert","Salamence","Metagross","Lugia","Ho-Oh|Ho Oh","Celebi","Darkrai","Arceus",
      "Gardevoir","Scizor","Togepi","Mimikyu","Umbreon","Espeon","Leafeon","Glaceon","Sylveon"
    ],
    "Super Mario Characters": [
      "Mario","Luigi","Princess Peach|Peach","Bowser","Yoshi","Toad","Donkey Kong","Wario",
      "Waluigi","Princess Daisy|Daisy","Toadette","Bowser Jr.","Rosalina","Koopa Troopa",
      "Goomba","Boo","Shy Guy","Birdo","Dry Bones","King Boo","Nabbit","Pauline","Lakitu",
      "Bullet Bill","Kamek|Magikoopa","Baby Mario","Baby Luigi","Wart","Spike","Luma"
    ],
    "Olympic Host Cities": [
      "Athens","Paris","London","Los Angeles","Tokyo","Beijing","Sydney","Atlanta","Barcelona",
      "Seoul","Moscow","Montreal","Munich","Mexico City","Rome","Helsinki","Berlin","Amsterdam",
      "Antwerp","Stockholm","Rio de Janeiro|Rio","Sochi","Vancouver","Turin|Torino",
      "Salt Lake City","Nagano","Lillehammer","Albertville","Calgary","Sarajevo","Lake Placid",
      "Sapporo","Innsbruck","Chamonix","St. Moritz|St Moritz","Oslo","Cortina","Grenoble",
      "Squaw Valley","Garmisch-Partenkirchen|Garmisch Partenkirchen","St. Louis|St Louis",
      "Pyeongchang"
    ],
    "Cocktails": [
      "Margarita","Martini","Old Fashioned","Mojito","Manhattan","Negroni","Daiquiri",
      "Cosmopolitan|Cosmo","Moscow Mule","Whiskey Sour","Pina Colada|Piña Colada","Mai Tai",
      "Bloody Mary","Mimosa","Espresso Martini","Aperol Spritz|Spritz","Long Island Iced Tea",
      "Tom Collins","White Russian","Black Russian","Sidecar","French 75","Sazerac",
      "Boulevardier","Caipirinha","Paloma","Dark and Stormy","Gin and Tonic","Screwdriver",
      "Tequila Sunrise","Sex on the Beach","Pisco Sour","Amaretto Sour","Mudslide",
      "Irish Coffee","Zombie","Penicillin","Aviation"
    ],
    "Types of Wine": [
      "Cabernet Sauvignon|Cabernet","Merlot","Pinot Noir","Chardonnay","Sauvignon Blanc",
      "Riesling","Zinfandel","Syrah|Shiraz","Malbec","Pinot Grigio","Moscato","Prosecco",
      "Champagne","Rosé|Rose","Tempranillo","Sangiovese","Chianti","Beaujolais","Bordeaux",
      "Burgundy","Port","Sherry","Vermouth","Marsala","Chenin Blanc",
      "Gewürztraminer|Gewurztraminer","Viognier","Grenache","Nebbiolo","Lambrusco",
      "Sémillon|Semillon","Barolo","Brunello","Valpolicella"
    ],
    "Fruits": [
      "Apple|Apples","Banana|Bananas","Orange|Oranges","Grape|Grapes",
      "Strawberry|Strawberries","Blueberry|Blueberries","Raspberry|Raspberries",
      "Blackberry|Blackberries","Watermelon","Cantaloupe","Honeydew|Honeydew Melon","Pineapple",
      "Mango|Mangoes","Peach|Peaches","Plum|Plums","Cherry|Cherries","Pear|Pears","Kiwi",
      "Lemon|Lemons","Lime|Limes","Grapefruit","Avocado","Papaya","Pomegranate","Fig|Figs",
      "Apricot|Apricots","Nectarine","Tangerine","Clementine","Coconut","Cranberry|Cranberries",
      "Guava","Passion Fruit","Dragon Fruit","Lychee","Star Fruit|Starfruit","Persimmon",
      "Date|Dates","Currant","Gooseberry","Kumquat","Boysenberry"
    ],
    "Vegetables": [
      "Broccoli","Carrot|Carrots","Spinach","Lettuce","Kale","Cabbage","Cauliflower",
      "Brussels Sprouts|Brussel Sprouts","Asparagus","Celery","Cucumber","Zucchini","Eggplant",
      "Bell Pepper","Potato|Potatoes","Sweet Potato","Onion|Onions","Garlic","Tomato|Tomatoes",
      "Corn","Green Beans","Peas","Radish|Radishes","Beet|Beets","Turnip|Turnips","Pumpkin",
      "Squash","Artichoke","Leek|Leeks","Mushroom|Mushrooms","Okra","Bok Choy","Arugula",
      "Swiss Chard","Collard Greens","Mustard Greens","Watercress","Parsnip|Parsnips",
      "Rutabaga","Jicama"
    ],
    "Herbs and Spices": [
      "Basil","Oregano","Thyme","Rosemary","Sage","Parsley","Cilantro|Coriander","Dill","Mint",
      "Chives","Tarragon","Bay Leaf","Cinnamon","Nutmeg","Clove|Cloves","Ginger","Turmeric",
      "Cumin","Paprika","Chili Powder|Chilli Powder","Cayenne","Black Pepper","White Pepper",
      "Saffron","Cardamom","Coriander Seed","Fennel","Star Anise","Allspice","Mustard Seed",
      "Fenugreek","Garlic Powder","Onion Powder","Curry Powder","Garam Masala","Vanilla",
      "Marjoram"
    ],
    "Types of Beer": [
      "IPA","Lager","Stout","Porter","Pilsner","Wheat Beer|Hefeweizen","Pale Ale","Amber Ale",
      "Brown Ale","Sour|Sour Beer","Belgian Ale","Dubbel","Tripel","Quadrupel|Quad","Saison",
      "Bock","Doppelbock","Kölsch|Kolsch","Dunkel","Gose","Lambic","Märzen|Marzen|Oktoberfest",
      "Cream Ale","Golden Ale","Blonde Ale","Red Ale","Barleywine","Scotch Ale","Weissbier",
      "Witbier","Fruit Beer","Session IPA","Double IPA|DIPA",
      "New England IPA|NEIPA|Hazy IPA"
    ],
    "Coffee Drinks": [
      "Espresso","Latte","Cappuccino","Americano","Mocha","Macchiato","Flat White","Cortado",
      "Affogato","Ristretto","Doppio","Lungo","Cold Brew","Iced Coffee","Frappuccino",
      "Irish Coffee","Turkish Coffee","Vietnamese Coffee","Nitro Cold Brew",
      "Café au Lait|Cafe au Lait","Red Eye","Breve","Dalgona Coffee","Caramel Macchiato"
    ],
    "Types of Bread": [
      "Sourdough|Sourdough Bread","Baguette","Brioche","Ciabatta","Rye Bread|Rye","Pumpernickel",
      "Focaccia","Naan","Pita","Challah","Soda Bread","Banana Bread","Cornbread","Multigrain",
      "Whole Wheat","White Bread","Potato Bread","French Bread","Italian Bread","Croissant",
      "Bagel","English Muffin","Tortilla","Lavash","Matzo|Matzah"
    ],
    "Types of Soup": [
      "Chicken Noodle Soup|Chicken Noodle","Tomato Soup","Minestrone","Clam Chowder",
      "French Onion Soup|French Onion","Butternut Squash Soup","Broccoli Cheddar Soup","Gazpacho",
      "Miso Soup|Miso","Pho","Ramen","Wonton Soup","Egg Drop Soup",
      "Hot and Sour Soup|Hot and Sour","Lentil Soup|Lentil","Split Pea Soup|Split Pea",
      "Potato Leek Soup","Cream of Mushroom","Tortilla Soup","Chili","Gumbo","Bisque","Chowder",
      "Mulligatawny","Borscht","Matzo Ball Soup","Wedding Soup","Posole|Pozole","Udon","Tom Yum",
      "Bouillabaisse"
    ],
    "Types of Nuts": [
      "Almond|Almonds","Walnut|Walnuts","Pecan|Pecans","Cashew|Cashews","Peanut|Peanuts",
      "Pistachio|Pistachios","Hazelnut|Hazelnuts|Filbert","Macadamia|Macadamia Nut",
      "Brazil Nut","Chestnut|Chestnuts","Pine Nut|Pine Nuts","Acorn|Acorns","Hickory Nut",
      "Kola Nut|Cola Nut","Ginkgo Nut","Pili Nut","Marcona Almond","Beech Nut"
    ],
    "Condiments": [
      "Ketchup","Mustard","Mayonnaise|Mayo","Relish","Hot Sauce","Barbecue Sauce|BBQ Sauce",
      "Soy Sauce","Sriracha","Salsa","Guacamole","Hummus","Ranch Dressing|Ranch",
      "Honey Mustard","Worcestershire Sauce","Aioli","Pesto","Horseradish","Tartar Sauce",
      "Vinaigrette","Olive Oil","Vinegar","Buffalo Sauce","Teriyaki Sauce","Fish Sauce",
      "Oyster Sauce","Chimichurri","Tahini","Sour Cream","Taco Sauce","Marinara",
      "Sweet and Sour Sauce"
    ],
    "Countries in Africa": [
      "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cape Verde|Cabo Verde",
      "Cameroon","Central African Republic","Chad","Comoros",
      "Democratic Republic of the Congo|DR Congo","Republic of the Congo|Congo","Djibouti",
      "Egypt","Equatorial Guinea","Eritrea","Eswatini|Swaziland","Ethiopia","Gabon",
      "Gambia|The Gambia","Ghana","Guinea","Guinea-Bissau","Ivory Coast|Cote d'Ivoire","Kenya",
      "Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius",
      "Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe",
      "Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan",
      "Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe"
    ],
    "Countries in Europe": [
      "Albania","Andorra","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria",
      "Croatia","Cyprus","Czech Republic|Czechia","Denmark","Estonia","Finland","France",
      "Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia",
      "Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco","Montenegro",
      "Netherlands","North Macedonia","Norway","Poland","Portugal","Romania","Russia",
      "San Marino","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine",
      "United Kingdom|UK|Great Britain","Vatican City|Vatican"
    ],
    "Countries in Asia": [
      "Afghanistan","Armenia","Azerbaijan","Bahrain","Bangladesh","Bhutan","Brunei","Cambodia",
      "China","Cyprus","Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan",
      "Kazakhstan","Kuwait","Kyrgyzstan","Laos","Lebanon","Malaysia","Maldives","Mongolia",
      "Myanmar|Burma","Nepal","North Korea","Oman","Pakistan","Palestine","Philippines",
      "Qatar","Russia","Saudi Arabia","Singapore","South Korea","Sri Lanka","Syria","Taiwan",
      "Tajikistan","Thailand","Timor-Leste|East Timor","Turkey","Turkmenistan",
      "United Arab Emirates|UAE","Uzbekistan","Vietnam","Yemen"
    ],
    "Oscar Best Picture Winners": [
      "Gone with the Wind","Casablanca","The Godfather|Godfather",
      "The Godfather Part II|Godfather Part II|Godfather Part 2",
      "One Flew Over the Cuckoo's Nest|One Flew Over the Cuckoos Nest","Rocky","Annie Hall",
      "The Deer Hunter|Deer Hunter","Kramer vs. Kramer|Kramer vs Kramer","Ordinary People",
      "Chariots of Fire","Gandhi","Terms of Endearment","Amadeus","Out of Africa","Platoon",
      "Rain Man","Driving Miss Daisy","Dances with Wolves",
      "The Silence of the Lambs|Silence of the Lambs","Unforgiven",
      "Schindler's List|Schindlers List","Forrest Gump","Braveheart","Titanic",
      "American Beauty","Gladiator","A Beautiful Mind","Chicago",
      "The Lord of the Rings: The Return of the King|Return of the King","Million Dollar Baby",
      "Crash","The Departed|Departed","No Country for Old Men","Slumdog Millionaire",
      "The Hurt Locker|Hurt Locker","The King's Speech|Kings Speech","The Artist|Artist",
      "Argo","12 Years a Slave|Twelve Years a Slave","Birdman","Spotlight","Moonlight",
      "The Shape of Water|Shape of Water","Green Book","Parasite","Nomadland","CODA",
      "Everything Everywhere All at Once|EEAAO","Oppenheimer","Anora"
    ],
    "Greek Gods": [
      "Zeus","Hera","Poseidon","Demeter","Athena","Apollo","Artemis","Ares","Aphrodite",
      "Hephaestus|Hephaistos","Hermes","Dionysus","Hades","Persephone","Hestia","Eros","Nike",
      "Helios","Selene","Eos","Cronus|Kronos","Rhea","Gaia|Gaea","Uranus","Atlas","Prometheus",
      "Epimetheus","Pan","Nemesis","Tyche","Hecate","Hypnos","Thanatos","Iris","Aeolus",
      "Themis"
    ],
    "Shakespeare Plays": [
      "Hamlet","Macbeth","Romeo and Juliet","Othello","King Lear","Julius Caesar",
      "A Midsummer Night's Dream|Midsummer Nights Dream","The Tempest|Tempest","Twelfth Night",
      "Much Ado About Nothing","As You Like It","The Merchant of Venice|Merchant of Venice",
      "Richard III|Richard 3","Henry V|Henry 5","Henry IV|Henry 4","Richard II|Richard 2",
      "The Taming of the Shrew|Taming of the Shrew","The Comedy of Errors|Comedy of Errors",
      "The Two Gentlemen of Verona|Two Gentlemen of Verona",
      "Love's Labour's Lost|Loves Labours Lost","All's Well That Ends Well|Alls Well That Ends Well",
      "Measure for Measure","Cymbeline","The Winter's Tale|Winters Tale","Pericles",
      "Antony and Cleopatra","Coriolanus","Timon of Athens","Titus Andronicus",
      "The Merry Wives of Windsor|Merry Wives of Windsor","Henry VIII|Henry 8","King John",
      "Troilus and Cressida","Henry VI|Henry 6"
    ],
    "US Presidents": [
      "George Washington|Washington","John Adams|Adams","Thomas Jefferson|Jefferson",
      "James Madison|Madison","James Monroe|Monroe","John Quincy Adams|Quincy Adams",
      "Andrew Jackson|Jackson","Martin Van Buren|Van Buren","William Henry Harrison",
      "John Tyler|Tyler","James K. Polk|James K Polk|Polk","Zachary Taylor|Taylor",
      "Millard Fillmore|Fillmore","Franklin Pierce|Pierce","James Buchanan|Buchanan",
      "Abraham Lincoln|Lincoln","Andrew Johnson","Ulysses S. Grant|Ulysses Grant|Grant",
      "Rutherford B. Hayes|Rutherford Hayes|Hayes","James A. Garfield|James Garfield|Garfield",
      "Chester A. Arthur|Chester Arthur|Arthur","Grover Cleveland|Cleveland",
      "Benjamin Harrison|Harrison","William McKinley|McKinley",
      "Theodore Roosevelt|Teddy Roosevelt|Teddy","William Howard Taft|Taft",
      "Woodrow Wilson|Wilson","Warren G. Harding|Warren Harding|Harding",
      "Calvin Coolidge|Coolidge","Herbert Hoover|Hoover",
      "Franklin D. Roosevelt|Franklin Roosevelt|FDR|Roosevelt",
      "Harry S. Truman|Harry Truman|Truman","Dwight D. Eisenhower|Dwight Eisenhower|Eisenhower",
      "John F. Kennedy|John Kennedy|Kennedy|JFK","Lyndon B. Johnson|Lyndon Johnson|Johnson|LBJ",
      "Richard Nixon|Nixon","Gerald Ford|Ford","Jimmy Carter|Carter","Ronald Reagan|Reagan",
      "George H. W. Bush|George HW Bush|Bush Sr","Bill Clinton|Clinton",
      "George W. Bush|George Bush|Bush|Dubya","Barack Obama|Obama","Donald Trump|Trump",
      "Joe Biden|Biden"
    ],
    "Zodiac Signs": [
      "Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius",
      "Capricorn","Aquarius","Pisces"
    ],
    "Chemical Elements": [
      "Hydrogen","Helium","Lithium","Beryllium","Boron","Carbon","Nitrogen","Oxygen",
      "Fluorine","Neon","Sodium","Magnesium","Aluminum|Aluminium","Silicon","Phosphorus",
      "Sulfur|Sulphur","Chlorine","Argon","Potassium","Calcium","Scandium","Titanium",
      "Vanadium","Chromium","Manganese","Iron","Cobalt","Nickel","Copper","Zinc","Gallium",
      "Germanium","Arsenic","Selenium","Bromine","Krypton","Rubidium","Strontium","Yttrium",
      "Zirconium","Niobium","Molybdenum","Technetium","Ruthenium","Rhodium","Palladium",
      "Silver","Cadmium","Indium","Tin","Antimony","Tellurium","Iodine","Xenon",
      "Cesium|Caesium","Barium","Lanthanum","Cerium","Praseodymium","Neodymium","Promethium",
      "Samarium","Europium","Gadolinium","Terbium","Dysprosium","Holmium","Erbium","Thulium",
      "Ytterbium","Lutetium","Hafnium","Tantalum","Tungsten","Rhenium","Osmium","Iridium",
      "Platinum","Gold","Mercury","Thallium","Lead","Bismuth","Polonium","Astatine","Radon",
      "Francium","Radium","Actinium","Thorium","Protactinium","Uranium","Neptunium",
      "Plutonium","Americium","Curium","Berkelium","Californium","Einsteinium","Fermium",
      "Mendelevium","Nobelium","Lawrencium","Rutherfordium","Dubnium","Seaborgium","Bohrium",
      "Hassium","Meitnerium","Darmstadtium","Roentgenium","Copernicium","Nihonium",
      "Flerovium","Moscovium","Livermorium","Tennessine","Oganesson"
    ],
    "Musical Instruments": [
      "Piano","Guitar","Violin","Drums","Flute","Trumpet","Saxophone","Clarinet","Cello",
      "Viola","Bass Guitar|Bass","Double Bass","Harp","Organ","Accordion","Banjo","Ukulele",
      "Mandolin","Trombone","Tuba","French Horn","Oboe","Bassoon","Piccolo","Recorder",
      "Harmonica","Bagpipes","Xylophone","Tambourine","Cymbals","Timpani|Kettledrum",
      "Synthesizer|Synth","Keyboard","Electric Guitar","Acoustic Guitar","Dulcimer","Sitar"
    ],
    "Pixar Movies": [
      "Toy Story","A Bug's Life|A Bugs Life","Toy Story 2","Monsters Inc|Monsters, Inc.",
      "Finding Nemo","The Incredibles|Incredibles","Cars","Ratatouille","WALL-E|WALL E|Wall-E",
      "Up","Toy Story 3","Cars 2","Brave","Monsters University","Inside Out",
      "The Good Dinosaur|Good Dinosaur","Finding Dory","Cars 3","Coco","Incredibles 2",
      "Toy Story 4","Onward","Soul","Luca","Turning Red","Lightyear","Elemental",
      "Inside Out 2"
    ],
    "Harry Potter Spells": [
      "Expelliarmus","Expecto Patronum","Avada Kedavra","Wingardium Leviosa","Lumos","Nox",
      "Alohomora","Accio","Stupefy","Crucio","Imperio","Obliviate","Petrificus Totalus",
      "Sectumsempra","Protego","Incendio","Aguamenti","Riddikulus","Diffindo","Confringo",
      "Reducto","Bombarda","Muffliato","Silencio","Finite Incantatem","Episkey","Reparo",
      "Legilimens","Occlumency","Apparate"
    ],
    "Star Wars Characters": [
      "Luke Skywalker","Darth Vader","Han Solo","Princess Leia|Leia|Leia Organa",
      "Obi-Wan Kenobi|Obi Wan Kenobi","Yoda","Chewbacca|Chewie","C-3PO|C3PO","R2-D2|R2D2",
      "Anakin Skywalker","Emperor Palpatine|Palpatine","Boba Fett","Lando Calrissian|Lando",
      "Mace Windu","Qui-Gon Jinn|Qui Gon Jinn","Padmé Amidala|Padme Amidala|Padme","Rey",
      "Kylo Ren","Finn","Poe Dameron|Poe","BB-8|BB8","Ahsoka Tano|Ahsoka",
      "Din Djarin|Mando|The Mandalorian","Grogu|Baby Yoda","Jabba the Hutt","Darth Maul",
      "Count Dooku","General Grievous","Jango Fett","Grand Moff Tarkin","Admiral Ackbar",
      "Wedge Antilles","Bo-Katan|Bo Katan","Captain Rex","Moff Gideon"
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
