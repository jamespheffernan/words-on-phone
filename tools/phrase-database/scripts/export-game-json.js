#!/usr/bin/env node

/**
 * Export Game JSON - Database to Game Format Export
 * 
 * Exports phrases from database to game-compatible JSON format
 * Supports filtering, validation, and multiple export formats
 */

const PhraseDatabase = require('../src/database');
const GameExporter = require('../src/gameExporter');
const config = require('../config');
const fs = require('fs').promises;
const path = require('path');

class GameJSONExporter {
  constructor(options = {}) {
    this.database = new PhraseDatabase();
    this.gameExporter = new GameExporter(this.database);
    this.debug = options.debug || false;
    
    this.stats = {
      totalExported: 0,
      categoriesExported: 0,
      validationErrors: 0,
      validationWarnings: 0
    };
  }

  /**
   * Export single category to game JSON format
   * @param {string} category - Category to export
   * @param {Object} options - Export options
   */
  async exportCategory(category, options = {}) {
    if (!config.isValidCategory(category)) {
      throw new Error(`Invalid category: ${category}. Valid categories: ${config.getCategoryList().join(', ')}`);
    }

    console.log(`📤 Exporting "${category}" to game JSON format`);
    console.log('=' .repeat(60));

    await this.database.initialize();
    
    // Set export options with defaults
    const exportOptions = {
      categories: [category],
      category: category,
      minScore: options.minScore || config.QUALITY_THRESHOLDS.export,
      recentOnly: options.recentOnly || false,
      shuffle: options.shuffle !== false, // Default to true
      limit: options.limit || null
    };

    console.log(`📊 Export criteria:`);
    console.log(`   Category: ${category}`);
    console.log(`   Min score: ${exportOptions.minScore}`);
    console.log(`   Recent only: ${exportOptions.recentOnly}`);
    console.log(`   Shuffle: ${exportOptions.shuffle}`);
    console.log(`   Limit: ${exportOptions.limit || 'none'}`);

    // Export to game format
    const gameFormat = await this.gameExporter.exportGameFormat(exportOptions);
    
    // Validate the export
    const validation = this.gameExporter.validateGameFormat(gameFormat);
    
    console.log(`\n📋 Export Results:`);
    console.log(`   Phrases exported: ${gameFormat.phrases.length}`);
    console.log(`   Validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (validation.errors.length > 0) {
      console.log(`   Errors: ${validation.errors.length}`);
      validation.errors.forEach(error => console.log(`     - ${error}`));
      this.stats.validationErrors += validation.errors.length;
    }
    
    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.length}`);
      validation.warnings.forEach(warning => console.log(`     - ${warning}`));
      this.stats.validationWarnings += validation.warnings.length;
    }

    // Save to file if specified
    if (options.output) {
      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, JSON.stringify(gameFormat, null, 2));
      console.log(`💾 Exported to: ${outputPath}`);
    }

    this.stats.totalExported += gameFormat.phrases.length;
    this.stats.categoriesExported++;

    await this.database.close();
    return gameFormat;
  }

  /**
   * Export all categories to separate JSON files
   * @param {Object} options - Export options
   */
  async exportAllCategories(options = {}) {
    console.log(`📤 Exporting all categories to game JSON format`);
    console.log('=' .repeat(60));

    await this.database.initialize();
    
    // Get all categories with phrases
    const allPhrases = await this.database.getAllPhrases();
    const categoriesWithPhrases = [...new Set(allPhrases.map(p => p.category))];
    
    console.log(`📋 Found ${categoriesWithPhrases.length} categories with phrases`);

    const exportOptions = {
      minScore: options.minScore || config.QUALITY_THRESHOLDS.export,
      recentOnly: options.recentOnly || false,
      shuffle: options.shuffle !== false,
      limitPerCategory: options.limitPerCategory || null
    };

    console.log(`📊 Export criteria:`);
    console.log(`   Min score: ${exportOptions.minScore}`);
    console.log(`   Recent only: ${exportOptions.recentOnly}`);
    console.log(`   Shuffle: ${exportOptions.shuffle}`);
    console.log(`   Limit per category: ${exportOptions.limitPerCategory || 'none'}`);

    // Export multiple categories
    const gameFormats = await this.gameExporter.exportMultipleCategories(exportOptions);
    
    console.log(`\n📋 Export Results:`);
    console.log(`   Categories exported: ${gameFormats.length}`);
    
    let totalPhrases = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    // Validate each category export
    for (const gameFormat of gameFormats) {
      const validation = this.gameExporter.validateGameFormat(gameFormat);
      totalPhrases += gameFormat.phrases.length;
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
      
      console.log(`   ${gameFormat.category}: ${gameFormat.phrases.length} phrases ${validation.valid ? '✅' : '❌'}`);
      
      if (this.debug && validation.errors.length > 0) {
        validation.errors.forEach(error => console.log(`     Error: ${error}`));
      }
    }

    console.log(`   Total phrases: ${totalPhrases}`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Total warnings: ${totalWarnings}`);

    // Save to files if output directory specified
    if (options.outputDir) {
      const outputDir = path.resolve(options.outputDir);
      await fs.mkdir(outputDir, { recursive: true });
      
      for (const gameFormat of gameFormats) {
        const filename = `${gameFormat.category.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
        const filepath = path.join(outputDir, filename);
        await fs.writeFile(filepath, JSON.stringify(gameFormat, null, 2));
        console.log(`💾 Saved: ${filepath}`);
      }
      
      // Create combined export
      const combinedFilename = path.join(outputDir, 'all-categories.json');
      await fs.writeFile(combinedFilename, JSON.stringify(gameFormats, null, 2));
      console.log(`💾 Combined export: ${combinedFilename}`);
    }

    this.stats.totalExported = totalPhrases;
    this.stats.categoriesExported = gameFormats.length;
    this.stats.validationErrors = totalErrors;
    this.stats.validationWarnings = totalWarnings;

    await this.database.close();
    return gameFormats;
  }

  /**
   * Export production-ready phrases for game deployment
   * @param {Object} options - Export options
   */
  async exportProduction(options = {}) {
    console.log(`🚀 Exporting production-ready phrases`);
    console.log('=' .repeat(60));

    const productionOptions = {
      minScore: config.QUALITY_THRESHOLDS.autoAccept, // Only high-quality phrases
      recentOnly: false,
      shuffle: true,
      limitPerCategory: null,
      outputDir: options.outputDir || './exports/production',
      ...options
    };

    console.log(`📊 Production criteria:`);
    console.log(`   Min score: ${productionOptions.minScore} (auto-accept threshold)`);
    console.log(`   Quality grade: ${config.getQualityGrade(productionOptions.minScore)} or better`);

    const gameFormats = await this.exportAllCategories(productionOptions);
    
    // Additional production validation
    const productionStats = {
      totalPhrases: gameFormats.reduce((sum, gf) => sum + gf.phrases.length, 0),
      avgPhrasesPerCategory: Math.round(gameFormats.reduce((sum, gf) => sum + gf.phrases.length, 0) / gameFormats.length),
      categoriesWithMinimum: gameFormats.filter(gf => gf.phrases.length >= 50).length,
      categoriesUnderMinimum: gameFormats.filter(gf => gf.phrases.length < 50).length
    };

    console.log(`\n🎯 Production Readiness:`);
    console.log(`   Total phrases: ${productionStats.totalPhrases}`);
    console.log(`   Average per category: ${productionStats.avgPhrasesPerCategory}`);
    console.log(`   Categories with ≥50 phrases: ${productionStats.categoriesWithMinimum}/${gameFormats.length}`);
    console.log(`   Categories under minimum: ${productionStats.categoriesUnderMinimum}`);

    if (productionStats.categoriesUnderMinimum > 0) {
      console.log(`\n⚠️  Categories needing more phrases:`);
      gameFormats
        .filter(gf => gf.phrases.length < 50)
        .forEach(gf => console.log(`   - ${gf.category}: ${gf.phrases.length} phrases (need ${50 - gf.phrases.length} more)`));
    }

    return gameFormats;
  }

  /**
   * Show export statistics for all categories
   */
  async showExportStats() {
    await this.database.initialize();
    
    const allPhrases = await this.database.getAllPhrases();
    const stats = await this.gameExporter.getExportStats();
    
    console.log(`\n📊 Export Statistics:`);
    console.log(`   Total phrases in database: ${allPhrases.length}`);
    console.log(`   Categories: ${stats.totalCategories}`);
    console.log(`   Average score: ${stats.averageScore}/100`);
    console.log(`   Score distribution:`);
    console.log(`     A (80-100): ${stats.scoreDistribution.A} phrases`);
    console.log(`     B (70-79): ${stats.scoreDistribution.B} phrases`);
    console.log(`     C (60-69): ${stats.scoreDistribution.C} phrases`);
    console.log(`     D (50-59): ${stats.scoreDistribution.D} phrases`);
    console.log(`     F (0-49): ${stats.scoreDistribution.F} phrases`);
    
    console.log(`\n📈 Export readiness by threshold:`);
    console.log(`   Export threshold (≥${config.QUALITY_THRESHOLDS.export}): ${stats.exportReady} phrases`);
    console.log(`   Auto-accept threshold (≥${config.QUALITY_THRESHOLDS.autoAccept}): ${stats.autoAcceptReady} phrases`);
    console.log(`   High quality threshold (≥${config.QUALITY_THRESHOLDS.highQuality}): ${stats.highQualityReady} phrases`);

    await this.database.close();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const category = args[1];
  
  const debug = args.includes('--debug');
  const recentOnly = args.includes('--recent');
  const noShuffle = args.includes('--no-shuffle');
  
  const minScoreArg = args.find(arg => arg.startsWith('--min-score='));
  const minScore = minScoreArg ? parseInt(minScoreArg.split('=')[1]) : null;
  
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const output = outputArg ? outputArg.split('=')[1] : null;
  
  const outputDirArg = args.find(arg => arg.startsWith('--output-dir='));
  const outputDir = outputDirArg ? outputDirArg.split('=')[1] : null;

  if (!command) {
    console.log(`
Game JSON Exporter

Usage:
  node scripts/export-game-json.js <command> [options]

Commands:
  category <name>     Export single category
  all                 Export all categories
  production          Export production-ready phrases
  stats               Show export statistics

Options:
  --min-score=N       Minimum score threshold (default: ${config.QUALITY_THRESHOLDS.export})
  --limit=N           Maximum phrases per category
  --recent            Export only recent phrases
  --no-shuffle        Don't shuffle phrases
  --output=file       Output file for single category
  --output-dir=dir    Output directory for multiple categories
  --debug             Enable debug output

Examples:
  node scripts/export-game-json.js category "Movies & TV" --output=movies.json
  node scripts/export-game-json.js all --min-score=60 --output-dir=./exports
  node scripts/export-game-json.js production --output-dir=./production
  node scripts/export-game-json.js stats

Available Categories:
${config.getCategoryList().map(cat => `  - ${cat}`).join('\n')}
    `);
    process.exit(1);
  }

  const exporter = new GameJSONExporter({ debug });
  const options = { 
    minScore, 
    limit, 
    recentOnly, 
    shuffle: !noShuffle, 
    output, 
    outputDir 
  };

  if (command === 'category') {
    if (!category) {
      console.error('❌ Category name required for category export');
      process.exit(1);
    }
    
    exporter.exportCategory(category, options)
      .then(gameFormat => {
        console.log(`\n✅ Successfully exported ${gameFormat.phrases.length} phrases from "${category}"`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Export failed:', error.message);
        process.exit(1);
      });
      
  } else if (command === 'all') {
    exporter.exportAllCategories(options)
      .then(gameFormats => {
        const totalPhrases = gameFormats.reduce((sum, gf) => sum + gf.phrases.length, 0);
        console.log(`\n✅ Successfully exported ${totalPhrases} phrases from ${gameFormats.length} categories`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Export failed:', error.message);
        process.exit(1);
      });
      
  } else if (command === 'production') {
    exporter.exportProduction(options)
      .then(gameFormats => {
        const totalPhrases = gameFormats.reduce((sum, gf) => sum + gf.phrases.length, 0);
        console.log(`\n🚀 Production export complete: ${totalPhrases} phrases ready for deployment`);
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Production export failed:', error.message);
        process.exit(1);
      });
      
  } else if (command === 'stats') {
    exporter.showExportStats()
      .catch(error => {
        console.error('❌ Stats failed:', error.message);
        process.exit(1);
      });
      
  } else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
  }
}

module.exports = GameJSONExporter; 