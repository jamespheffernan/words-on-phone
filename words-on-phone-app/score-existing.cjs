const fs = require("fs");
const phrases = JSON.parse(fs.readFileSync("../phrases.json", "utf8"));

// Simulate our quality scoring system on existing phrases
const scorePhrase = (phrase) => {
  let localScore = 0;
  let wikipediaScore = 0;
  let categoryBoost = 10; // Entertainment category gets +10
  
  const words = phrase.toLowerCase().split(' ');
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  
  // Local heuristics (0-40 points)
  if (avgWordLength <= 6) localScore += 10; // Word simplicity
  
  const commonWords = ['movie', 'show', 'game', 'music', 'dance', 'party', 'food', 'car', 'phone'];
  if (words.some(word => commonWords.includes(word))) localScore += 10;
  
  const recentTerms = ['netflix', 'tiktok', 'app', 'streaming', 'viral', 'meme', 'zoom'];
  if (words.some(word => recentTerms.some(term => word.includes(term)))) localScore += 15;
  
  const brands = ['netflix', 'disney', 'marvel', 'apple', 'google', 'spotify'];
  if (words.some(word => brands.some(brand => word.includes(brand)))) localScore += 10;
  
  // Penalize problematic content
  if (/battle|war|genocide|massacre|crisis|invasion/i.test(phrase)) localScore -= 15;
  if (/\b(19|20)\d{2}\b/.test(phrase)) localScore -= 10; // Specific years
  
  // Wikipedia simulation (higher for well-known concepts)
  const celebrities = ['adam sandler', 'al pacino', 'adele', 'bad bunny', 'baby yoda'];
  const wellKnown = ['pizza', 'netflix', 'disney', 'marvel', 'basketball'];
  
  if (celebrities.some(celeb => phrase.toLowerCase().includes(celeb)) ||
      wellKnown.some(known => phrase.toLowerCase().includes(known))) {
    wikipediaScore = Math.floor(Math.random() * 10) + 20; // 20-30 points
  } else {
    wikipediaScore = Math.floor(Math.random() * 15); // 0-15 points
  }
  
  const totalScore = Math.max(0, localScore + wikipediaScore + categoryBoost);
  
  let verdict = '';
  if (totalScore >= 80) verdict = '🟢 Excellent';
  else if (totalScore >= 60) verdict = '🟡 Good';
  else if (totalScore >= 40) verdict = '🟠 Review';
  else if (totalScore >= 20) verdict = '🔴 Poor';
  else verdict = '⚫ Reject';
  
  return { phrase, totalScore, verdict, localScore, wikipediaScore, categoryBoost };
};

console.log("🔍 Quality Scoring Analysis of Existing Database\n");

// Score first 20 phrases
const sample = phrases.phrases.slice(0, 20);
const scored = sample.map(scorePhrase).sort((a, b) => b.totalScore - a.totalScore);

console.log("📊 Top 10 scoring existing phrases:");
scored.slice(0, 10).forEach((item, i) => {
  console.log(`${String(i+1).padStart(2)}. ${item.verdict} ${item.phrase} (${item.totalScore} pts)`);
});

console.log("\n📊 Bottom 10 scoring existing phrases:");
scored.slice(-10).forEach((item, i) => {
  console.log(`${String(i+1).padStart(2)}. ${item.verdict} ${item.phrase} (${item.totalScore} pts)`);
});

// Calculate overall statistics
const avgScore = scored.reduce((sum, item) => sum + item.totalScore, 0) / scored.length;
const excellent = scored.filter(item => item.totalScore >= 80).length;
const good = scored.filter(item => item.totalScore >= 60 && item.totalScore < 80).length;
const needsReview = scored.filter(item => item.totalScore >= 40 && item.totalScore < 60).length;
const poor = scored.filter(item => item.totalScore < 40).length;

console.log(`\n📈 Quality Statistics (sample of ${scored.length} phrases):`);
console.log(`   • Average Score: ${avgScore.toFixed(1)} points`);
console.log(`   • 🟢 Excellent (80+): ${excellent} (${(excellent/scored.length*100).toFixed(1)}%)`);
console.log(`   • 🟡 Good (60-79): ${good} (${(good/scored.length*100).toFixed(1)}%)`);
console.log(`   • 🟠 Needs Review (40-59): ${needsReview} (${(needsReview/scored.length*100).toFixed(1)}%)`);
console.log(`   • 🔴 Poor/Reject (<40): ${poor} (${(poor/scored.length*100).toFixed(1)}%)`);

console.log("\n�� What the new system would do:");
console.log("   ✅ Auto-approve excellent phrases (80+)");
console.log("   ✅ Accept good phrases (60-79)");
console.log("   🔍 Manual review for borderline phrases (40-59)");
console.log("   ❌ Flag or reject poor phrases (<40)");

console.log("\n🚀 With enhanced prompts, we'd generate:");
console.log("   • Higher quality scores overall");
console.log("   • More party game appropriate content");
console.log("   • Better contemporary references");
console.log("   • Fewer problematic historical topics");
