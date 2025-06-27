const fs = require("fs");
const phrases = JSON.parse(fs.readFileSync("../phrases.json", "utf8"));

console.log("📊 Existing Phrases Database Analysis\n");

console.log("📁 Category:", phrases.category);
console.log("📈 Total phrases:", phrases.phrases.length);

// Sample phrases for analysis
const sample = phrases.phrases.slice(0, 15);
console.log("\n🔍 Sample phrases (first 15):");
sample.forEach((phrase, i) => {
  console.log(`${String(i+1).padStart(2)}. ${phrase}`);
});

// Analyze phrase characteristics
console.log("\n📊 Quality Analysis:");

const avgWordCount = phrases.phrases.reduce((sum, phrase) => 
  sum + phrase.split(" ").length, 0) / phrases.phrases.length;

const longPhrases = phrases.phrases.filter(p => p.split(" ").length > 4);
const shortPhrases = phrases.phrases.filter(p => p.split(" ").length <= 2);

console.log(`   • Average words per phrase: ${avgWordCount.toFixed(1)}`);
console.log(`   • Short phrases (1-2 words): ${shortPhrases.length} (${(shortPhrases.length/phrases.phrases.length*100).toFixed(1)}%)`);
console.log(`   • Long phrases (5+ words): ${longPhrases.length} (${(longPhrases.length/phrases.phrases.length*100).toFixed(1)}%)`);

// Check for problematic content
const historicalBattles = phrases.phrases.filter(p => /Battle|War|Invasion|Genocide|Massacre/i.test(p));
const specificYears = phrases.phrases.filter(p => /\b(19|20)\d{2}\b/.test(p));
const tooAcademic = phrases.phrases.filter(p => /Crisis|Summit|Withdrawal|Empire Falls/i.test(p));

console.log(`   • Historical battles/wars: ${historicalBattles.length} (${(historicalBattles.length/phrases.phrases.length*100).toFixed(1)}%)`);
console.log(`   • Specific years mentioned: ${specificYears.length} (${(specificYears.length/phrases.phrases.length*100).toFixed(1)}%)`);
console.log(`   • Academic/serious topics: ${tooAcademic.length} (${(tooAcademic.length/phrases.phrases.length*100).toFixed(1)}%)`);

// Find party game appropriate phrases
const partyGameGood = phrases.phrases.filter(p => {
  const words = p.split(" ");
  return words.length <= 3 && 
         !/Battle|War|Crisis|Genocide|Empire|Invasion/.test(p) &&
         !/\b(19|20)\d{2}\b/.test(p) &&
         p.length < 20;
});

console.log(`   • Party game appropriate: ${partyGameGood.length} (${(partyGameGood.length/phrases.phrases.length*100).toFixed(1)}%)`);

console.log("\n❌ Quality issues in current database:");
console.log("   • Too many historical battles/wars (not fun for party games)");
console.log("   • Academic topics that are hard to act out");
console.log("   • Some phrases too long or complex");
console.log("   • Missing contemporary references");

console.log("\n✅ What our new enhanced system fixes:");
console.log("   🎮 Enhanced prompts with party game context");
console.log("   📊 Quality scoring (0-100 points) filters bad phrases");
console.log("   🔍 Manual review interface for borderline cases");
console.log("   ⚡ Contemporary, recognizable phrase generation");
console.log("   🎯 Focus on actionable, fun concepts");

console.log("\n🚀 Sample improvements we'd see:");
console.log("   Before: 'Battle Of Thermopylae' (hard to act out)");
console.log("   After:  'Marvel Movie' (easy and fun!)");
console.log("\n   Before: 'Armenian Genocide' (inappropriate for party)");
console.log("   After:  'Pizza Delivery' (perfect for charades!)");
