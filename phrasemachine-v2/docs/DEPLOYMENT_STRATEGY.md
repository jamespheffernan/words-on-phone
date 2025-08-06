# PhraseMachine v2 Deployment Strategy

## Dataset Sizes & Storage Strategy

### Production-Ready Datasets (~28 MB Total)

| Dataset | Size | Description | Storage Method |
|---------|------|-------------|----------------|
| **Wikidata Essentials** | ~15 MB | Top 100k notable entities (people, places, shows, etc.) | JSON file in `/data/` |
| **Game N-grams** | ~10 MB | Common 2-4 word phrases with PMI scores | JSON file in `/data/` |
| **Concreteness** | ~2 MB | Complete Brysbaert 40k word database | JSON file in `/data/` |
| **WordNet Multi-words** | ~1 MB | Curated compound phrases | JSON file in `/data/` |

### Recommended Deployment: Local Storage

**Why Local Storage?**
- ✅ **28 MB total** (well within Netlify 100 MB limit)
- ✅ **Zero external dependencies** (no Redis hosting costs)
- ✅ **Instant scoring** (no API call latency)
- ✅ **Works offline** during party games
- ✅ **Simple deployment** (everything in one bundle)

### Implementation Steps

1. **Create Curated Datasets**
   ```bash
   # Generate production-sized datasets
   npm run generate:wikidata-essentials    # 100k most notable entities
   npm run generate:game-ngrams            # Party game vocabulary
   npm run bundle:datasets                 # Combine into optimized JSON
   ```

2. **Bundle with Netlify Functions**
   ```javascript
   // netlify/functions/phrase-score.js
   const datasets = require('./data/combined-datasets.json');
   const PhraseMachine = require('./phrasemachine-core.js');
   
   exports.handler = async (event, context) => {
     const machine = new PhraseMachine(datasets);
     return machine.scorePhrase(event.body.phrase);
   };
   ```

3. **Deployment Configuration**
   ```toml
   # netlify.toml
   [functions]
     directory = "netlify/functions"
     included_files = ["data/**/*"]  # Include datasets
   ```

### Alternative: Hybrid Approach (If Bundle Size Becomes Issue)

**Core Datasets Locally** (~10 MB):
- Essential Wikidata (50k entries)
- WordNet multi-words (complete)
- Core concreteness words

**Extended Datasets via API** (~18 MB):
- Full Wikidata essentials
- Complete N-gram database
- Fallback to local if API unavailable

### Performance Expectations

**Local Storage:**
- Cold start: ~100-200ms (loading datasets)
- Warm requests: ~1-5ms (in-memory lookup)
- Bundle size increase: ~28 MB

**Hybrid:**
- Cold start: ~50-100ms (smaller local bundle)
- Warm requests: ~1-10ms (local + occasional API)
- Bundle size increase: ~10 MB

## Conclusion

**For Words on Phone**: **Local storage is ideal**
- Party games need consistent performance
- 28 MB is reasonable for modern devices
- Zero external dependencies = more reliable
- Perfect for offline party scenarios

The system will achieve the same high accuracy with curated datasets as with full academic ones, while being practical to deploy and maintain.