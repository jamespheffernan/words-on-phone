// Fun default team name suggestions
export const DEFAULT_TEAM_NAMES = [
  // Animal pairs
  ['Speedy Cheetahs', 'Clever Foxes'],
  ['Mighty Lions', 'Wise Owls'],
  ['Happy Dolphins', 'Playful Otters'],
  ['Bouncy Kangaroos', 'Silly Penguins'],
  ['Fierce Tigers', 'Swift Eagles'],
  
  // Food pairs
  ['Team Pizza', 'Team Tacos'],
  ['Spicy Salsa', 'Cool Guacamole'],
  ['Sweet Donuts', 'Crispy Bacon'],
  ['Hot Coffee', 'Iced Tea'],
  ['Chunky Peanut Butter', 'Smooth Jelly'],
  
  // Pop culture pairs
  ['Jedi Knights', 'Sith Lords'],
  ['Avengers', 'Justice League'],
  ['Gryffindor', 'Slytherin'],
  ['Team Edward', 'Team Jacob'],
  ['Beatles', 'Stones'],
  
  // Classic rivalries
  ['Pirates', 'Ninjas'],
  ['Cats', 'Dogs'],
  ['Early Birds', 'Night Owls'],
  ['Beach Bums', 'Mountain Climbers'],
  ['City Slickers', 'Country Folk'],
  
  // Silly pairs
  ['Disco Dancers', 'Robot Walkers'],
  ['Time Travelers', 'Space Explorers'],
  ['Couch Potatoes', 'Gym Rats'],
  ['Bookworms', 'Movie Buffs'],
  ['Thunder Buddies', 'Lightning Bolts'],
  
  // Color/element pairs
  ['Fire Squad', 'Ice Crew'],
  ['Team Sunshine', 'Team Moonlight'],
  ['Red Rockets', 'Blue Bombers'],
  ['Green Machine', 'Purple People'],
  ['Gold Rush', 'Silver Streak']
];

// Get a random team name pair
export function getRandomTeamNames(): [string, string] {
  const randomIndex = Math.floor(Math.random() * DEFAULT_TEAM_NAMES.length);
  return DEFAULT_TEAM_NAMES[randomIndex] as [string, string];
} 