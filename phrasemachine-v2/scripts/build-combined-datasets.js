#!/usr/bin/env node

/**
 * Combined Datasets Builder
 * 
 * Merges all individual dataset files into a single optimized bundle:
 * - Wikidata essentials
 * - N-gram essentials  
 * - Concreteness essentials
 * - WordNet multi-word entries
 * 
 * Output: combined_datasets.json + gzipped version
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { performance } = require('perf_hooks');

class CombinedDatasetsBuilder {
  constructor() {
    this.outputDir = path.join(__dirname, '../data/production');
    this.outputFile = path.join(this.outputDir, 'combined_datasets.json');
    this.outputFileGz = path.join(this.outputDir, 'combined_datasets.json.gz');
    
    this.datasets = {};
    this.stats = {
      startTime: performance.now(),
      filesProcessed: 0,
      totalSize: 0,
      compressedSize: 0
    };
  }

  async initialize() {
    console.log('🚀 Combined Datasets Builder initialized');
    console.log(`📁 Output: ${this.outputFile}`);
    console.log(`📦 Compressed: ${this.outputFileGz}`);
  }

  /**
   * Load individual dataset files
   */
  async loadDatasets() {
    console.log('📂 Loading individual datasets...');

    const datasetFiles = [
      { 
        key: 'wikidata', 
        file: 'wikidata_essentials_test.json',
        description: 'Notable entities for distinctiveness scoring'
      },
      { 
        key: 'ngrams', 
        file: 'ngrams_game_test.json',
        description: 'Game-relevant n-grams with PMI scores'
      },
      { 
        key: 'concreteness', 
        file: 'concreteness_test.json',
        description: 'Word concreteness ratings for describability'
      },
      { 
        key: 'wordnet', 
        file: 'wordnet_multi_test.json',
        description: 'Multi-word entries for compound detection'
      }
    ];

    for (const dataset of datasetFiles) {
      const filePath = path.join(this.outputDir, dataset.file);
      
      try {
        if (fs.existsSync(filePath)) {
          console.log(`📄 Loading ${dataset.key} from ${dataset.file}...`);
          
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const fileSize = Buffer.byteLength(fileContent, 'utf8');
          
          this.datasets[dataset.key] = {
            ...JSON.parse(fileContent),
            _meta: {
              ...JSON.parse(fileContent).meta,
              description: dataset.description,
              originalFile: dataset.file,
              originalSizeBytes: fileSize
            }
          };
          
          this.stats.filesProcessed++;
          this.stats.totalSize += fileSize;
          
          console.log(`  ✅ Loaded ${dataset.key}: ${(fileSize / 1024).toFixed(1)} KB`);
        } else {
          console.warn(`  ⚠️ File not found: ${dataset.file} - skipping`);
        }
      } catch (error) {
        console.error(`  ❌ Error loading ${dataset.key}:`, error.message);
      }
    }

    console.log(`✅ Loaded ${this.stats.filesProcessed} datasets (${(this.stats.totalSize / 1024).toFixed(1)} KB total)`);
  }

  /**
   * Optimize and merge datasets
   */
  optimizeDatasets() {
    console.log('⚡ Optimizing datasets...');

    // Optimize Wikidata: keep only essential fields
    if (this.datasets.wikidata) {
      const entities = this.datasets.wikidata.entities;
      const optimizedEntities = {};
      
      Object.entries(entities).forEach(([id, entity]) => {
        optimizedEntities[id] = {
          label: entity.label,
          sitelinks: entity.sitelinks,
          type: entity.type,
          aliases: entity.aliases?.length > 0 ? entity.aliases : undefined
        };
      });
      
      this.datasets.wikidata.entities = optimizedEntities;
      console.log(`  📚 Wikidata optimized: ${Object.keys(optimizedEntities).length} entities`);
    }

    // Optimize N-grams: truncate PMI to 3 decimal places
    if (this.datasets.ngrams) {
      this.datasets.ngrams.ngrams.forEach(ngram => {
        ngram.pmi = parseFloat(ngram.pmi.toFixed(3));
      });
      console.log(`  🔢 N-grams optimized: ${this.datasets.ngrams.ngrams.length} phrases`);
    }

    // Optimize Concreteness: truncate ratings to 2 decimal places
    if (this.datasets.concreteness) {
      const words = this.datasets.concreteness.words;
      Object.keys(words).forEach(word => {
        words[word].concreteness = parseFloat(words[word].concreteness.toFixed(2));
      });
      console.log(`  🧠 Concreteness optimized: ${Object.keys(words).length} words`);
    }

    // WordNet is already optimized
    if (this.datasets.wordnet) {
      console.log(`  📖 WordNet ready: ${this.datasets.wordnet.entries.length} entries`);
    }

    console.log('✅ Dataset optimization complete');
  }

  /**
   * Generate combined dataset metadata
   */
  generateCombinedMeta() {
    const now = new Date().toISOString();
    
    return {
      version: '1.0',
      buildDate: now,
      buildTimeMs: Math.round(performance.now() - this.stats.startTime),
      description: 'Combined production datasets for PhraseMachine v2',
      totalFiles: this.stats.filesProcessed,
      originalSizeBytes: this.stats.totalSize,
      datasets: Object.keys(this.datasets).reduce((acc, key) => {
        const dataset = this.datasets[key];
        acc[key] = {
          description: dataset._meta.description,
          originalFile: dataset._meta.originalFile,
          originalSizeBytes: dataset._meta.originalSizeBytes,
          recordCount: this.getRecordCount(key, dataset)
        };
        return acc;
      }, {}),
      usage: {
        wikidata: 'Load entities into Map for O(1) distinctiveness lookup',
        ngrams: 'Load n-grams into Map for O(1) PMI lookup', 
        concreteness: 'Load words into Map for O(1) concreteness lookup',
        wordnet: 'Load entries into Set for O(1) multi-word detection'
      }
    };
  }

  /**
   * Get record count for a dataset
   */
  getRecordCount(key, dataset) {
    switch (key) {
      case 'wikidata':
        return dataset.entities ? Object.keys(dataset.entities).length : 0;
      case 'ngrams':
        return dataset.ngrams ? dataset.ngrams.length : 0;
      case 'concreteness':
        return dataset.words ? Object.keys(dataset.words).length : 0;
      case 'wordnet':
        return dataset.entries ? dataset.entries.length : 0;
      default:
        return 0;
    }
  }

  /**
   * Save combined datasets
   */
  async saveCombinedDatasets() {
    console.log('💾 Saving combined datasets...');

    // Create combined structure
    const combined = {
      meta: this.generateCombinedMeta(),
      wikidata: this.datasets.wikidata?.entities || {},
      ngrams: this.datasets.ngrams?.ngrams || [],
      ngramWordCounts: this.datasets.ngrams?.wordCounts || {},
      concreteness: this.datasets.concreteness?.words || {},
      concretenessCounts: this.datasets.concreteness?.categories || {},
      wordnet: this.datasets.wordnet?.entries || [],
      wordnetByCategory: this.datasets.wordnet?.byCategory || {}
    };

    // Save uncompressed version
    const jsonData = JSON.stringify(combined, null, 2);
    fs.writeFileSync(this.outputFile, jsonData);
    
    const uncompressedSize = fs.statSync(this.outputFile).size;
    const uncompressedMB = (uncompressedSize / 1024 / 1024).toFixed(2);
    
    console.log(`✅ Saved uncompressed: ${this.outputFile} (${uncompressedMB} MB)`);

    // Save compressed version
    const compressed = zlib.gzipSync(jsonData);
    fs.writeFileSync(this.outputFileGz, compressed);
    
    const compressedSize = fs.statSync(this.outputFileGz).size;
    const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);
    const compressionRatio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
    
    console.log(`✅ Saved compressed: ${this.outputFileGz} (${compressedMB} MB, ${compressionRatio}% reduction)`);

    this.stats.compressedSize = compressedSize;

    return {
      uncompressedSizeMB: parseFloat(uncompressedMB),
      compressedSizeMB: parseFloat(compressedMB),
      compressionRatio: parseFloat(compressionRatio),
      outputFile: this.outputFile,
      outputFileGz: this.outputFileGz,
      recordCounts: combined.meta.datasets
    };
  }

  /**
   * Generate size report
   */
  generateSizeReport(result) {
    console.log('\n📊 DATASET SIZE REPORT');
    console.log('=====================');
    
    Object.entries(result.recordCounts).forEach(([dataset, info]) => {
      const sizeMB = (info.originalSizeBytes / 1024 / 1024).toFixed(3);
      console.log(`📦 ${dataset.toUpperCase()}: ${info.recordCount.toLocaleString()} records (${sizeMB} MB)`);
      console.log(`   ${info.description}`);
    });
    
    console.log('\n📈 BUNDLE SUMMARY:');
    console.log(`🗜️  Uncompressed: ${result.uncompressedSizeMB} MB`);
    console.log(`📦 Compressed: ${result.compressedSizeMB} MB (${result.compressionRatio}% smaller)`);
    console.log(`🎯 Target size: ≤30 MB ${result.uncompressedSizeMB <= 30 ? '✅' : '❌'}`);
    console.log(`🚀 Netlify compatible: ${result.compressedSizeMB <= 10 ? '✅' : result.compressedSizeMB <= 50 ? '⚠️' : '❌'}`);
  }

  /**
   * Main build process
   */
  async build() {
    try {
      await this.initialize();
      
      await this.loadDatasets();
      this.optimizeDatasets();
      const result = await this.saveCombinedDatasets();
      
      this.generateSizeReport(result);
      
      console.log('\n🎉 Combined datasets build complete!');
      console.log(`📊 Final bundle: ${result.compressedSizeMB} MB compressed`);
      
      return result;

    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const builder = new CombinedDatasetsBuilder();
  
  builder.build()
    .then(result => {
      console.log('✅ Build successful:', {
        uncompressed: `${result.uncompressedSizeMB} MB`,
        compressed: `${result.compressedSizeMB} MB`,
        compression: `${result.compressionRatio}%`
      });
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Build failed:', error);
      process.exit(1);
    });
}

module.exports = CombinedDatasetsBuilder;