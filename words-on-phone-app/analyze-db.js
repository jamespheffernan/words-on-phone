const fs = require("fs");
const phrases = JSON.parse(fs.readFileSync("../phrases.json", "utf8"));

console.log("📊 Existing Phrases Database Analysis\n");

console.log("📁 Category:", phrases.category);
console.log("📈 Total phrases:", phrases.phrases.length);

// Sample 10 phrases for quality analysis
const sample = phrases.phrases.slice(0, 10);
console.log("\n🔍 Sample phrases (first 10):");
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

// Check for quality indicators
const problematicPhrases = phrases.phrases.filter(p => 
  /Crisis|War|Battle|Invasion|Genocide|Massacre/.test(p)
);

const partyGameAppropriate = phrases.phrases.filter(p => 
  p.length < 25 && // Not too long
  !/[0-9]{4}/.test(p) && // Avoid specific years
  !/Crisis|War|Battle|Invasion|Genocide/.test(p) // Avoid heavy topics
);

console.log(`   • Problematic phrases (wars/crises): ${problematicPhrases.length} (${(problematicPhrases.length/phrases.phrases.length*100).toFixed(1)}%)`);
console.log(`   • Party game appropriate: ~${partyGameAppropriate.length} (${(partyGameAppropriate.length/phrases.phrases.length*100).toFixed(1)}%)`);

console.log("\n🎯 Quality issues found:");
console.log("   ❌ Historical battles/wars not suitable for party games");
console.log("   ❌ Some phrases too academic/serious");
console.log("   ❌ Mixed quality levels");

console.log("\n✅ Improvements with new enhanced system:");
console.log("   🎮 Party game context in prompts");
console.log("   📊 0-100 point quality scoring");
console.log("   🔍 Manual review for borderline phrases");
console.log("   ⚡ Better phrase generation with examples");

