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

// Sample phrases for each category - in a real app, this would be loaded from a JSON file
const moviePhrases = [
  'The Godfather',
  'Star Wars',
  'Breaking Bad',
  'Game of Thrones',
  'The Matrix',
  'Pulp Fiction',
  'The Lord of the Rings',
  'Harry Potter',
  'The Avengers',
  'The Dark Knight'
];

const musicPhrases = [
  'The Beatles',
  'Rolling Stones',
  'Taylor Swift',
  'Beyoncé',
  'Drake',
  'Ed Sheeran',
  'Bruno Mars',
  'Lady Gaga',
  'Justin Bieber',
  'Adele'
];

const sportsPhrases = [
  'Super Bowl',
  'World Cup',
  'Olympics',
  'Michael Jordan',
  'LeBron James',
  'Tiger Woods',
  'Serena Williams',
  'Tom Brady',
  'Cristiano Ronaldo',
  'Lionel Messi'
];

const foodPhrases = [
  'Pizza',
  'Hamburger',
  'French Fries',
  'Ice Cream',
  'Chocolate Cake',
  'Caesar Salad',
  'Sushi',
  'Tacos',
  'Pasta Carbonara',
  'Apple Pie'
];

const placesPhrases = [
  'New York City',
  'Paris',
  'London',
  'Tokyo',
  'Grand Canyon',
  'Eiffel Tower',
  'Statue of Liberty',
  'Great Wall of China',
  'Sydney Opera House',
  'Mount Everest'
];

const peoplePhrases = [
  'Albert Einstein',
  'Martin Luther King Jr.',
  'Steve Jobs',
  'Oprah Winfrey',
  'Barack Obama',
  'Queen Elizabeth',
  'Bill Gates',
  'Elon Musk',
  'Leonardo da Vinci',
  'William Shakespeare'
];

const techPhrases = [
  'Artificial Intelligence',
  'Virtual Reality',
  'Social Media',
  'Smartphone',
  'Internet',
  'Cloud Computing',
  'Electric Car',
  'Space Station',
  'DNA',
  'Solar Energy'
];

const historyPhrases = [
  'World War II',
  'American Revolution',
  'Renaissance',
  'Ancient Rome',
  'Moon Landing',
  'Berlin Wall',
  'Civil Rights Movement',
  'Industrial Revolution',
  'Cold War',
  'French Revolution'
];

const entertainmentPhrases = [
  'Academy Awards',
  'Broadway',
  'Netflix',
  'Disney World',
  'Saturday Night Live',
  'Comic-Con',
  'MTV',
  'Grammy Awards',
  'Hollywood',
  'TikTok'
];

const naturePhrases = [
  'Amazon Rainforest',
  'Great Barrier Reef',
  'African Safari',
  'Northern Lights',
  'Yellowstone',
  'Niagara Falls',
  'Mount Rushmore',
  'Polar Bears',
  'Giant Redwood',
  'Blue Whale'
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

// Generate more sample phrases to reach ~500 for development
// In production, this would be replaced with actual 7000+ phrases from a JSON file
function generateSamplePhrases(): string[] {
  const basePhrases = Object.values(allCategoryPhrases).flat();
  const phrases: string[] = [...basePhrases];
  
  // Add more sample phrases to reach ~500
  const additionalPhrases = [
    'Breaking News', 'Happy Birthday', 'Climate Change', 'Black Friday',
    'Christmas Morning', 'Valentine\'s Day', 'Halloween Costume', 'New Year\'s Eve',
    'Summer Vacation', 'Spring Break', 'Winter Olympics', 'March Madness',
    'Thanksgiving Dinner', 'Fourth of July', 'Mother\'s Day', 'Father\'s Day',
    'Graduation Day', 'Wedding Anniversary', 'Baby Shower', 'Birthday Party',
    'Coffee Shop', 'Gas Station', 'Shopping Mall', 'Movie Theater',
    'Restaurant', 'Hospital', 'Airport', 'Train Station',
    'Baseball Stadium', 'Basketball Court', 'Football Field', 'Tennis Court',
    'Swimming Pool', 'Golf Course', 'Ski Resort', 'Beach Resort',
    'National Park', 'Amusement Park', 'Water Park', 'Zoo',
    'Museum', 'Library', 'School', 'University',
    'White House', 'Capitol Building', 'Supreme Court', 'Pentagon',
    'Stock Market', 'Wall Street', 'Silicon Valley', 'Las Vegas',
    'Times Square', 'Central Park', 'Golden Gate Bridge', 'Brooklyn Bridge',
    'Empire State Building', 'Chrysler Building', 'Space Needle', 'CN Tower',
    'Big Ben', 'Tower Bridge', 'Buckingham Palace', 'Windsor Castle',
    'Louvre Museum', 'Arc de Triomphe', 'Notre Dame', 'Versailles',
    'Colosseum', 'Leaning Tower of Pisa', 'Vatican City', 'Sistine Chapel',
    'Great Pyramid', 'Sphinx', 'Taj Mahal', 'Forbidden City',
    'Opera House', 'Concert Hall', 'Jazz Club', 'Comedy Club',
    'Art Gallery', 'Sculpture Garden', 'Botanical Garden', 'Aquarium',
    'Science Center', 'Planetarium', 'Observatory', 'Natural History Museum',
    'Fire Department', 'Police Station', 'Post Office', 'City Hall',
    'Court House', 'DMV', 'Bank', 'ATM',
    'Grocery Store', 'Farmers Market', 'Food Truck', 'Drive-Through',
    'Pizza Delivery', 'Chinese Takeout', 'Fast Food', 'Fine Dining',
    'Breakfast in Bed', 'Midnight Snack', 'Picnic Lunch', 'Dinner Party',
    'Cocktail Hour', 'Wine Tasting', 'Beer Garden', 'Sports Bar',
    'Dance Club', 'Karaoke Night', 'Game Night', 'Movie Night',
    'Book Club', 'Study Group', 'Team Meeting', 'Conference Call',
    'Job Interview', 'First Date', 'Blind Date', 'Double Date',
    'Family Reunion', 'Class Reunion', 'Office Party', 'Block Party',
    'Surprise Party', 'Costume Party', 'Pool Party', 'Beach Party',
    'Road Trip', 'Camping Trip', 'Cruise Ship', 'Train Ride',
    'Helicopter Tour', 'Hot Air Balloon', 'Bungee Jump', 'Sky Diving',
    'Scuba Diving', 'Rock Climbing', 'Mountain Biking', 'Horseback Riding',
    'Ice Skating', 'Roller Skating', 'Skateboarding', 'Surfing',
    'Water Skiing', 'Jet Skiing', 'Parasailing', 'Zip Line',
    'Escape Room', 'Laser Tag', 'Paintball', 'Go-Kart Racing',
    'Mini Golf', 'Bowling Alley', 'Arcade Game', 'Board Game',
    'Card Game', 'Video Game', 'Mobile Game', 'Virtual Reality Game',
    'Social Network', 'Text Message', 'Email', 'Phone Call',
    'Video Chat', 'Voice Mail', 'Group Chat', 'Direct Message',
    'Status Update', 'Profile Picture', 'Cover Photo', 'Friend Request',
    'Like Button', 'Share Button', 'Comment Section', 'News Feed',
    'Search Engine', 'Web Browser', 'Download', 'Upload',
    'Password', 'Username', 'Login', 'Logout',
    'Home Screen', 'Lock Screen', 'Notification', 'Alert',
    'Battery Life', 'Airplane Mode', 'Wi-Fi', 'Bluetooth',
    'GPS', 'Camera', 'Microphone', 'Speaker',
    'Headphones', 'Earbuds', 'Smart Watch', 'Fitness Tracker',
    'Laptop', 'Desktop', 'Tablet', 'E-Reader',
    'Smart TV', 'Remote Control', 'Streaming Service', 'Cable TV',
    'Radio Station', 'Podcast', 'Audiobook', 'E-Book',
    'Newspaper', 'Magazine', 'Blog Post', 'Article',
    'Breaking Story', 'Headlines', 'Weather Report', 'Traffic Report',
    'Stock Report', 'Sports Score', 'Box Score', 'Highlight Reel',
    'Instant Replay', 'Slow Motion', 'Time Out', 'Overtime',
    'Penalty Shot', 'Free Throw', 'Home Run', 'Touchdown',
    'Field Goal', 'Three Pointer', 'Slam Dunk', 'Hat Trick',
    'Grand Slam', 'Hole in One', 'Perfect Game', 'Shutout',
    'Championship Game', 'Playoff Series', 'Tournament', 'Draft Pick',
    'Trade Deadline', 'Free Agent', 'Contract Extension', 'Salary Cap',
    'Team Captain', 'Head Coach', 'Assistant Coach', 'General Manager',
    'Team Owner', 'Commissioner', 'Referee', 'Umpire',
    'Starting Lineup', 'Bench Player', 'Rookie', 'Veteran',
    'All-Star', 'MVP', 'Hall of Fame', 'Jersey Number',
    'Home Team', 'Away Team', 'Rivalry Game', 'Season Opener',
    'Home Opener', 'Season Finale', 'Preseason', 'Regular Season',
    'Postseason', 'Off Season', 'Training Camp', 'Spring Training',
    'Draft Day', 'Opening Day', 'Game Day', 'Race Day',
    'Fight Night', 'Title Fight', 'Championship Belt', 'Gold Medal',
    'Silver Medal', 'Bronze Medal', 'World Record', 'Personal Best',
    'Photo Finish', 'Sudden Death', 'Tiebreaker', 'Penalty Kick',
    'Power Play', 'Fast Break', 'Full Court Press', 'Hail Mary',
    'Two Minute Warning', 'Final Four', 'Sweet Sixteen', 'Elite Eight'
  ];
  
  phrases.push(...additionalPhrases);
  
  // If we still need more, generate numbered phrases
  while (phrases.length < 500) {
    phrases.push(`Sample Phrase ${phrases.length + 1}`);
  }
  
  return phrases;
}

export const phrases: string[] = generateSamplePhrases();

// Export categorized phrases for category selection
export const categorizedPhrases = allCategoryPhrases;

// Get phrases by category
export function getPhrasesByCategory(category: PhraseCategory): string[] {
  if (category === PhraseCategory.EVERYTHING) {
    return phrases;
  }
  if (category === PhraseCategory.EVERYTHING_PLUS) {
    return phrases;
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