// Phrase categories as mentioned in the game rules
export enum PhraseCategory {
  EVERYTHING = 'Everything',
  EVERYTHING_PLUS = 'Everything+',
  MOVIES = 'Movies & TV',
  MUSIC = 'Music & Artists',
  SPORTS = 'Sports & Athletes',
  FOOD = 'Food & Drink',
  PLACES = 'Places & Travel',
  PEOPLE = 'Famous People',
  TECHNOLOGY = 'Technology & Science',
  HISTORY = 'History & Events',
  ENTERTAINMENT = 'Entertainment & Pop Culture',
  NATURE = 'Nature & Animals'
}

// High-quality generated phrases for each category
const moviePhrases = [
  "Magic Carpet Ride",
  "Romantic Comedy",
  "The Avengers",
  "Spider-Man Swing",
  "Lightsaber Duel",
  "Oscar Ceremony",
  "Lightsaber Battle",
  "Time Travel",
  "Iron Man Suit",
  "The Office",
  "The Godfather",
  "Stranger Things",
  "Darth Vader",
  "Avatar The Movie",
  "Red Carpet Walk",
  "Frozen Sing-Along",
  "Friends Reunion",
  "Jedi Knight",
  "Netflix Binge-Watch",
  "The Matrix",
  "Paw Patrol",
  "Iron Man",
  "Hollywood Movie Set",
  "Hunger Games",
  "Mission Impossible",
  "Titanic Movie",
  "Shrek Swamp",
  "Captain Jack Sparrow",
  "Central Perk",
  "Jurassic Park",
  "Friends Sitcom",
  "The Mandalorian",
  "Batmobile Chase",
  "Captain America",
  "James Bond",
  "Fast and Furious",
  "Avengers Assemble",
  "Breaking Bad",
  "The Lion King",
  "Simpsons Family",
  "Vampire Slayer",
  "Alien Spaceship",
  "Wonder Woman",
  "The Crown",
  "Avatar Movie",
  "Game of Thrones",
  "Batman Begins",
  "Pizza Delivery",
  "Batman Returns",
  "Harry Potter",
  "Frozen Snowman",
  "Wakanda Forever",
  "The Batmobile",
  "Sherlock Holmes",
  "Friends TV Show",
  "Black Panther",
  "Lord of Rings",
  "Star Trek",
  "Superhero Landing",
  "The Simpsons",
  "Toy Story",
  "Zombie Apocalypse",
  "Sitcom Laugh Track",
  "Frozen Disney",
  "Reality Show Drama",
];

const entertainmentPhrases = [
  "Oscar Night",
  "YouTube Channel",
  "TikTok Dances",
  "TikTok Trends",
  "Video Game",
  "Disney World",
  "Binge Watching",
  "Broadway Musical",
  "Oscar Statue",
  "Squid Game",
  "Mario Kart",
  "Blockbuster Hit",
  "Marvel Comics",
  "Superhero Movie",
  "Frozen Movie",
  "Fantasy Novel",
  "Avengers Endgame",
  "Grammys Night",
  "Reality TV Show",
  "Karaoke Night",
  "Oscar Acceptance",
  "Disneyland Trip",
  "Instagram Influencer",
  "Super Bowl",
  "Netflix Series",
  "Oscar Winner",
  "Hollywood Walk",
  "Celebrity Gossip",
  "Comic Con",
  "Reality Show",
  "K-Pop Band",
  "Action Figure",
  "Beyonce Concert",
  "Marvel Avengers",
  "Pop Concert",
  "K-Pop Dance",
  "Avengers Movie",
  "Marvel Universe",
  "Disney Princess",
  "Grammy Winner",
  "Popcorn Movie",
  "Billie Eilish",
  "Hollywood Red Carpet",
  "Streaming Service",
  "Streaming Platform",
  "Super Mario",
  "Oscar Nominee",
  "Kardashian Drama",
  "Marvel Movies",
  "Red Carpet",
  "Video Game Streamer",
  "Harry Styles",
  "TikTok Dance",
  "Kardashian Family",
  "Marvel Superhero",
  "Broadway Show",
  "Netflix Binge",
  "TikTok Challenge",
  "Pop Music",
  "Reality TV",
  "The Weeknd",
  "Mickey Mouse",
  "YouTube Star",
];

const musicPhrases = [
  "Choir Singing",
  "Taylor Swift",
  "Violin Concerto",
  "Piano Concerto",
  "Violin Solo",
  "Ed Sheeran",
  "Drum Set",
  "Saxophone Player",
  "Jazz Singer",
  "Rap Battle",
  "DJ Mixer",
  "Rock Band",
  "Drake Album",
  "Violin Concert",
  "Hip Hop Dance",
  "Singing In Shower",
  "Rock Star",
  "Elvis Presley",
  "Bob Dylan",
  "Elton John",
  "Justin Bieber",
  "Beyoncé Performance",
  "Rock Festival",
  "Beatles Reunion",
  "Beyonce Knowles",
  "Pop Idol",
  "Guitar Hero",
  "Piano Solo",
  "Lady Gaga",
  "Piano Man",
  "Pop Star",
  "Adele Concert",
  "Piano Keys",
  "Country Music",
  "Adele Song",
  "Music Festival",
  "Drum Solo",
  "Michael Jackson",
  "The Beatles",
  "K-Pop Idol",
  "Playing Drums",
  "Singing in Shower",
  "Classical Symphony",
  "Guitar Solo",
  "Backstreet Boys",
  "Violin Symphony",
  "Opera Singer",
  "Beyoncé Concert",
  "Drum Kit",
  "Rock Concert",
  "Violin Strings",
  "Beyoncé Dance",
  "Jazz Festival",
  "Kanye West",
  "Jazz Band",
  "Electric Guitar",
  "Piano Lesson",
  "Saxophone Solo",
  "Piano Recital",
  "Katy Perry",
];

const placesPhrases = [
  "Train Station",
  "Tokyo Subway",
  "Paris Eiffel Tower",
  "Island Hop",
  "Safari Adventure",
  "Camping Site",
  "Sydney Opera House",
  "Mountain Hike",
  "Tropical Beach",
  "Camping Trip",
  "Venice Canals",
  "Beach Resort",
  "City Tour",
  "Hotel Check-In",
  "Beach Vacation",
  "Passport Control",
  "Roadside Motel",
  "Tokyo Disneyland",
  "Grand Canyon",
  "Rome Colosseum",
  "Backpacking Europe",
  "Hiking Trail",
  "Backpacking Trip",
  "Airport Security",
  "Desert Safari",
  "Airplane Boarding",
  "Times Square",
  "Santorini Sunset",
  "Amazon Rainforest",
  "Road Trip",
  "Hawaiian Luau",
  "Tropical Island",
  "Eiffel Tower",
  "Airport Check-In",
  "Cruise Ship",
  "Jungle Trek",
  "Travel Backpack",
  "Mount Everest",
  "Backpacking Journey",
  "Tourist Guide",
  "Alaskan Cruise",
  "Ancient Pyramids",
  "Great Wall of China",
  "Train Journey",
  "Theme Park",
  "Venice Gondola",
  "Bungee Jumping",
  "London Bridge",
  "Great Wall",
  "New York City",
  "Luxury Hotel",
  "Niagara Falls",
];

const naturePhrases = [
  "Bird Migration",
  "Snowy Owl",
  "Giraffe Neck",
  "Rainforest Canopy",
  "Polar Bear",
  "Blooming Flowers",
  "Kangaroo Jumping",
  "Beehive Buzzing",
  "Ocean Waves",
  "Desert Oasis",
  "Roaring Lion",
  "Forest Hike",
  "Eagle Soaring",
  "Climbing Trees",
  "Forest Trail",
  "Giraffe Eating",
  "Dolphin Jump",
  "Dolphin Dance",
  "Swimming Dolphins",
  "Running Cheetah",
  "Sunflower Field",
  "Elephant Trunk",
  "Desert Cactus",
  "Sunset Horizon",
  "Bear Hibernation",
  "Beaver Dam",
  "Kangaroo Jump",
  "Cherry Blossom",
  "Elephant Herd",
  "Busy Beehive",
  "Penguin Waddle",
  "Butterfly Flutter",
  "Mountain Peak",
  "Flying Squirrel",
  "Bird Watching",
  "Lion Roaring",
  "Misty Mountains",
  "Forest Fire",
  "Tropical Rainforest",
  "Whale Breaching",
  "Honey Bee",
  "Coral Reef",
  "Butterfly Garden",
  "Volcano Eruption",
  "Mountain Climb",
  "Lion Roar",
  "Tropical Rain",
  "Jungle Safari",
];

const techPhrases = [
  "Drone Camera",
  "3D Printing",
  "Solar Panels",
  "WiFi Signal",
  "Quantum Computer",
  "Bluetooth Speaker",
  "Rocket Launch",
  "Solar Panel",
  "Virtual Reality",
  "Wi-Fi Password",
  "Wireless Charger",
  "Smartphone Selfie",
  "Augmented Reality",
  "Cloud Storage",
  "Bluetooth Headphones",
  "Internet Browser",
  "Smart Watch",
  "DNA Testing",
  "Robot Vacuum",
  "Voice Assistant",
  "Space Travel",
  "Digital Camera",
  "Space Station",
  "Space Shuttle",
  "Drone Delivery",
  "Mars Rover",
  "DNA Sequencing",
  "Self-driving Car",
  "Robotic Vacuum",
  "Smartphone App",
  "Cyber Security",
  "Electric Scooter",
  "Self-Driving Car",
  "Space Telescope",
  "Smart Speaker",
  "Cloud Computing",
  "Wireless Headphones",
  "Wireless Charging",
  "DNA Test",
  "Space Rocket",
  "Electric Car",
  "Video Call",
  "3D Printer",
  "Solar Energy",
  "Smart Home",
  "Streaming Video",
  "Online Shopping",
  "Social Media",
];

const sportsPhrases = [
  "Marathon Runner",
  "Olympic Torch",
  "Soccer Penalty",
  "Running Marathon",
  "Cricket Batting",
  "Rugby Scrum",
  "Golf Swing",
  "Usain Bolt",
  "Baseball Home Run",
  "Swimming Race",
  "Serena Williams",
  "Figure Skating",
  "Hockey Puck",
  "Fencing Duel",
  "Olympic Gold Medal",
  "Football Tackle",
  "Boxing Match",
  "Swimming Lap",
  "Basketball Dunk",
  "Tom Brady",
  "Tennis Serve",
  "Penalty Kick",
  "Olympic Medal",
  "Gymnastics Routine",
  "World Cup",
  "Rafael Nadal",
  "Home Run",
  "Olympic Gold",
  "Baseball Pitch",
  "Cricket Bat",
  "Swimming Laps",
  "Swimming Relay",
  "Volleyball Spike",
  "Cycling Race",
  "Baseball Pitcher",
  "Formula One",
  "Soccer Goal",
  "Lionel Messi",
  "Tiger Woods",
  "Football Touchdown",
  "Simone Biles",
  "Rugby Tackle",
  "Ice Hockey",
  "Skateboarding Trick",
  "Gymnastics Flip",
  "Soccer Goalie",
];

const historyPhrases = [
  "Rosa Parks Bus",
  "Woodstock Festival",
  "Berlin Wall Falls",
  "Fall of Rome",
  "Great Wall Built",
  "Pearl Harbor",
  "D-Day Invasion",
  "Berlin Wall",
  "Black Plague",
  "Berlin Wall Fall",
  "Moon Landing",
  "Pearl Harbor Attack",
  "Golden Gate Opens",
  "Great Wall China",
  "Fall of Berlin Wall",
  "Stone Age",
  "Titanic Sinking",
  "Maya Civilization",
  "Olympic Games",
  "Titanic Sinks",
  "Martin Luther King",
  "Signing Declaration",
  "Fall Of Berlin Wall",
  "Gold Rush",
  "French Revolution",
  "Renaissance Period",
  "Renaissance Art",
  "Boston Tea Party",
  "Magna Carta Signing",
  "American Revolution",
  "Roswell UFO Incident",
  "Alexander the Great",
  "First Flight",
  "Gettysburg Address",
  "Women's Suffrage",
  "Ancient Egypt",
  "Mount Rushmore",
  "Mona Lisa Stolen",
  "Falling Berlin Wall",
  "Civil Rights March",
  "Sinking Lusitania",
  "Women Voting",
  "Great Depression",
];

const foodPhrases = [
  "Hamburger Feast",
  "Pancake Stack",
  "Tea Time",
  "Hot Chocolate",
  "Popcorn Bucket",
  "Margarita Pizza",
  "Ice Cream Cone",
  "Mashed Potatoes",
  "BBQ Ribs",
  "Watermelon Slice",
  "Pizza Party",
  "Taco Fiesta",
  "Caesar Salad",
  "Cappuccino Foam",
  "Spaghetti Dinner",
  "Sushi Roll",
  "Taco Tuesday",
  "Chocolate Cake",
  "Ice Cream",
  "Lemonade Stand",
  "Coffee Break",
  "Popcorn Snack",
  "Hot Dog Stand",
  "Green Tea",
  "Garlic Bread",
  "Pumpkin Spice Latte",
  "Fruit Smoothie",
  "Apple Pie",
  "Pineapple Pizza",
  "French Fries",
  "Cheese Burger",
  "Banana Split",
  "Pancake Breakfast",
  "Chicken Nuggets",
  "Milkshake Straw",
  "Spaghetti and Meatballs",
];

const peoplePhrases = [
  "Chris Hemsworth",
  "Barack Obama",
  "Emma Watson",
  "Jennifer Aniston",
  "Albert Einstein",
  "Prince Harry",
  "Ariana Grande",
  "Will Smith",
  "Tom Hanks",
  "Queen Elizabeth",
  "Marilyn Monroe",
  "Dwayne Johnson",
  "Tom Cruise",
  "Kim Kardashian",
  "Stephen King",
  "Bill Gates",
  "Mark Zuckerberg",
  "Johnny Depp",
  "Nelson Mandela",
  "Selena Gomez",
  "Donald Trump",
  "Jennifer Lopez",
  "LeBron James",
  "Steve Jobs",
  "Oprah Winfrey",
  "Stephen Hawking",
  "Leonardo DiCaprio",
  "Meryl Streep",
  "Beyoncé Knowles",
  "David Beckham",
  "William Shakespeare",
  "Angelina Jolie",
  "Michael Jordan",
  "Elon Musk",
];

// Combine all category phrases
const allCategoryPhrases = {
  [PhraseCategory.MOVIES]: moviePhrases,
  [PhraseCategory.MUSIC]: musicPhrases,
  [PhraseCategory.SPORTS]: sportsPhrases,
  [PhraseCategory.FOOD]: foodPhrases,
  [PhraseCategory.PLACES]: placesPhrases,
  [PhraseCategory.PEOPLE]: peoplePhrases,
  [PhraseCategory.TECHNOLOGY]: techPhrases,
  [PhraseCategory.HISTORY]: historyPhrases,
  [PhraseCategory.ENTERTAINMENT]: entertainmentPhrases,
  [PhraseCategory.NATURE]: naturePhrases
};

// All phrases combined for Everything categories
const allPhrases = Object.values(allCategoryPhrases).flat();

export const phrases: string[] = allPhrases;

// Export categorized phrases for category selection
export const categorizedPhrases = allCategoryPhrases;

// Get phrases by category
export function getPhrasesByCategory(category: PhraseCategory): string[] {
  if (category === PhraseCategory.EVERYTHING) {
    return allPhrases;
  }
  if (category === PhraseCategory.EVERYTHING_PLUS) {
    return allPhrases;
  }
  return categorizedPhrases[category] || [];
}

export const DEFAULT_CATEGORIES: PhraseCategory[] = [
  PhraseCategory.MOVIES,
  PhraseCategory.MUSIC,
  PhraseCategory.SPORTS,
  PhraseCategory.FOOD,
  PhraseCategory.PLACES,
  PhraseCategory.PEOPLE,
  PhraseCategory.TECHNOLOGY,
  PhraseCategory.HISTORY,
  PhraseCategory.ENTERTAINMENT,
  PhraseCategory.NATURE,
];
