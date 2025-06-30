# Words on Phone - Project Cleanup Recommendations

Based on the comprehensive file index analysis, here are the recommended cleanup actions:

## Immediate Actions (High Priority)

### 1. Files to Delete
These files serve no current purpose and should be removed:

```bash
# System files
rm .DS_Store

# Outdated/temporary files
rm "Phrase Review June 25 2025 (1).json"

# Duplicate files (keep .cjs version as it's CommonJS)
rm analyze-db.js
```

### 2. Root README.md
The current root README only contains "Environment variable fix deployed" and should be replaced with proper project documentation:

```bash
# Move the comprehensive app README to root
cp words-on-phone-app/README.md README.md
# Then update it to include project-wide information
```

### 3. Organize Test Scripts
Move root-level test scripts to appropriate directories:

```bash
# Create a test scripts directory
mkdir test-scripts
mv test-*.js test-scripts/
mv batch-phrase-generator.js test-scripts/
```

## Medium Priority Actions

### 4. Consolidate Phrase Data
- Keep `phrases.json` as the main production file
- Archive `phrases_backup.json` or move to a backups directory
- Consider version control for phrase data changes

### 5. Clean Build Artifacts
Add to .gitignore and remove from tracking:
- `tsconfig.cypress.tsbuildinfo`
- `lighthouse-report.*` (move to a reports directory if needed)

### 6. Documentation Structure
Consider reorganizing docs for better navigation:
```
docs/
├── architecture/      # System design docs
├── guides/           # User and developer guides
├── implementation/   # Current implementation-plan directory
└── archive/         # Completed plans for reference
```

## Low Priority / Future Improvements

### 7. Tool Consolidation
The phrase database tool has many generated files that could be organized:
- Create `generated/` directory for output files
- Move all `.txt` phrase files there
- Keep only source code in `src/`

### 8. iOS Build Files
Consider if iOS build artifacts need to be in version control or can be generated

### 9. Configuration Files
Review if all TypeScript config variants are necessary:
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `tsconfig.cypress.json`

## Summary

The project is well-organized overall, but has accumulated some cruft over time. The main issues are:
1. Missing proper root documentation
2. System files that shouldn't be tracked
3. Test scripts scattered at root level
4. Some duplicate and outdated files

Implementing these cleanup actions will improve project maintainability and make it easier for new contributors to understand the codebase structure.