#!/usr/bin/env node

/**
 * Fix JSON merge conflicts in phrase-scores.json
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/phrase-scores.json');

console.log('🔧 Fixing JSON merge conflicts...');

try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 Original file size: ${content.length} characters`);
    
    // Remove merge conflict markers and fix structure
    // Remove conflict start marker and everything before the separator
    content = content.replace(/<<<<<<< Updated upstream[\s\S]*?=======/g, '');
    
    // Remove conflict end marker
    content = content.replace(/>>>>>>> Stashed changes/g, '');
    
    // Ensure proper JSON structure - add missing closing brace if needed
    content = content.trim();
    if (!content.endsWith('}')) {
        // Find the last complete entry and ensure it ends properly
        const lastCommaIndex = content.lastIndexOf(',');
        if (lastCommaIndex > -1) {
            // Remove trailing comma and add closing brace
            content = content.substring(0, lastCommaIndex) + '\n}';
        } else {
            content += '\n}';
        }
    }
    
    // Try to parse to validate JSON
    const parsed = JSON.parse(content);
    console.log(`✅ Valid JSON with ${Object.keys(parsed).length} entries`);
    
    // Write back the fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('✅ JSON merge conflicts fixed successfully!');
    
} catch (error) {
    console.error('❌ Error fixing JSON:', error.message);
    process.exit(1);
} 