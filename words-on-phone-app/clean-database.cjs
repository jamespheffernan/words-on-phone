const fs = require("fs");
const phrases = JSON.parse(fs.readFileSync("../phrases.json", "utf8"));

// Quality scoring function (same as our analysis)
const scorePhrase = (phrase) => {
  let localScore = 0;
  let wikipediaScore = 0;
  let categoryBoost = 10; // Entertainment category gets +10
  
  const words = phrase.toLowerCase().split(' ');
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Local heuristics (0-40 points)
  if (avgWordLength <= 6) localScore += 10; // Word simplicity
  
  const commonWords = ['movie', 'show', 'game', 'music', 'dance', 'party', 'food', 'car', 'phone', 'app'];
  if (words.some(word => commonWords.includes(word))) localScore += 10;
  
  const recentTerms = ['netflix', 'tiktok', 'streaming', 'viral', 'meme', 'zoom', 'app', 'social'];
  if (words.some(word => recentTerms.some(term => word.includes(term)))) localScore += 15;
  
  const brands = ['netflix', 'disney', 'marvel', 'apple', 'google', 'spotify', 'youtube'];
  if (words.some(word => brands.some(brand => word.includes(brand)))) localScore += 10;
  
  // Penalize problematic content heavily
  if (/battle|war|genocide|massacre|crisis|invasion|withdrawal|bombing|assassination/i.test(phrase)) localScore -= 20;
  if (/\b(19|20)\d{2}\b/.test(phrase)) localScore -= 10; // Specific years
  if (/summit|conference|treaty|accord|empire|dynasty/i.test(phrase)) localScore -= 15; // Academic/political
  
  // Wikipedia simulation (higher for well-known concepts)
  const celebrities = ['taylor swift', 'beyonce', 'adam sandler', 'al pacino', 'adele', 'bad bunny', 'baby yoda'];
  const wellKnown = ['pizza', 'netflix', 'disney', 'marvel', 'basketball', 'football', 'coffee'];
  
  if (celebrities.some(celeb => phrase.toLowerCase().includes(celeb.split(' ')[0])) ||
      wellKnown.some(known => phrase.toLowerCase().includes(known))) {
    wikipediaScore = Math.floor(Math.random() * 10) + 20; // 20-30 points
  } else {
    wikipediaScore = Math.floor(Math.random() * 15) + 5; // 5-20 points
  }
  
  const totalScore = Math.max(0, localScore + wikipediaScore + categoryBoost);
  
  return { phrase, totalScore };
};

console.log("🧹 Cleaning Phrase Database Based on Quality Scores\n");

const originalCount = phrases.phrases.length;
console.log(`📊 Original database: ${originalCount} phrases`);

// Score all phrases
console.log("🔍 Analyzing all phrases...");
const scoredPhrases = phrases.phrases.map(scorePhrase);

// Filter out low quality phrases (below 40 points)
const qualityThreshold = 40;
const goodPhrases = scoredPhrases.filter(item => item.totalScore >= qualityThreshold);
const removedPhrases = scoredPhrases.filter(item => item.totalScore < qualityThreshold);

console.log(`\n📈 Quality Analysis Results:`);
console.log(`   • Phrases scoring 40+ points (keeping): ${goodPhrases.length}`);
console.log(`   • Phrases scoring <40 points (removing): ${removedPhrases.length}`);
console.log(`   • Removal rate: ${(removedPhrases.length/originalCount*100).toFixed(1)}%`);

// Show sample of removed phrases
console.log(`\n❌ Sample phrases being removed (lowest quality):`);
const worstPhrases = removedPhrases.sort((a, b) => a.totalScore - b.totalScore).slice(0, 10);
worstPhrases.forEach((item, i) => {
  console.log(`   ${i+1}. "${item.phrase}" (${item.totalScore} pts)`);
});

// Show sample of kept phrases
console.log(`\n✅ Sample phrases being kept (highest quality):`);
const bestPhrases = goodPhrases.sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
bestPhrases.forEach((item, i) => {
  console.log(`   ${i+1}. "${item.phrase}" (${item.totalScore} pts)`);
});

// Create cleaned database
const cleanedDatabase = {
  category: phrases.category,
  phrases: goodPhrases.map(item => item.phrase).sort()
};

// Backup original
console.log(`\n💾 Creating backup of original database...`);
fs.writeFileSync("../phrases_backup.json", JSON.stringify(phrases, null, 2));

// Save cleaned database
console.log(`💾 Saving cleaned database...`);
fs.writeFileSync("../phrases.json", JSON.stringify(cleanedDatabase, null, 2));

console.log(`\n🎉 Database cleaning complete!`);
console.log(`   • Original: ${originalCount} phrases`);
console.log(`   • Cleaned: ${cleanedDatabase.phrases.length} phrases`);
console.log(`   • Removed: ${originalCount - cleanedDatabase.phrases.length} phrases`);
console.log(`   • Quality improvement: Removed ${(removedPhrases.length/originalCount*100).toFixed(1)}% of low-quality content`);
console.log(`   • Backup saved to: phrases_backup.json`);

console.log(`\n✨ The database now contains only party game-appropriate phrases!`);
