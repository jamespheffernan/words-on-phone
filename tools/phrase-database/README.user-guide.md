# Words on Phone Phrase Generation & Quality User Guide

This guide explains how to use the phrase generation, quality scoring, and review process for the Words on Phone game. It covers adding new phrases, improving existing ones, understanding the quality pipeline, and exporting for the main app. Both non-developers and developers can follow these steps.

---

## 1. Overview: What is the Phrase Generation & Quality Process?

- **Goal:** Build a high-quality, fun, and fair phrase set for the Words on Phone party game.
- **Tools:** Automated AI phrase generation, quality scoring, manual review, and export scripts.
- **Quality:** Every phrase is checked for recognizability, party suitability, and category fit (see [Quality Guidelines](../phrase-quality-guidelines.md)).

---

## 2. Adding New Phrases

### Option A: Add Phrases Manually (One by One)

1. Open a terminal and go to the phrase database tool:
   ```bash
   cd tools/phrase-database
   ```
2. Add a phrase to a category:
   ```bash
   npm start add "The Lion King" "Movies & TV"
   # or, using the CLI directly:
   node src/cli.js add -c "Movies & TV" --interactive
   ```
3. The tool will check for duplicates, normalize the phrase, and score it for quality.
4. If the phrase is accepted, it is added to the database. If not, you'll see a warning or rejection reason.

### Option B: Add Phrases in Bulk (From a File)

1. Prepare a text file (one phrase per line):
   ```
   The Lion King
   Pizza Delivery
   Taylor Swift
   ```
2. Import the file to a category:
   ```bash
   npm start batch-add --file my-phrases.txt --category "Movies & TV"
   ```
3. The tool will process, score, and add all valid phrases.

### 2A. Automating Phrase Generation (AI-Powered)

You can automatically generate, score, and add new phrases for any category using the built-in automation script. This is the fastest way to build up a high-quality phrase set.

### How It Works
- The script uses AI (Gemini or OpenAI) to generate phrases for your chosen category.
- Each phrase is automatically scored and filtered for quality.
- Only accepted phrases are stored in the database (duplicates and low-quality phrases are skipped).
- The process repeats in batches until your target count is reached or the API limit is hit.

### Step-by-Step Example
1. Open a terminal and go to the phrase database tool:
   ```bash
   cd tools/phrase-database
   ```
2. Run the generator for your desired category and target phrase count:
   ```bash
   node scripts/generate-category.js "Movies & TV" 100
   # This will generate up to 100 high-quality phrases for the 'Movies & TV' category
   ```
   - You can replace "Movies & TV" with any supported category (see below).
   - The script will show progress, quality stats, and sample phrases at the end.
3. To see all available categories and usage examples, just run:
   ```bash
   node scripts/generate-category.js
   ```

### Supported Categories (examples)
- "Movies & TV"
- "Music & Artists"
- "Sports & Athletes"
- "Food & Drink"
- "Places & Travel"
- "Famous People"
- "Entertainment & Pop Culture"
- "Technology & Science"
- "History & Events"
- "Nature & Animals"
- "Everything"
- "Everything+"

### Tips
- Use the `--debug` flag for detailed logs:
  ```bash
  node scripts/generate-category.js "Movies & TV" 100 --debug
  ```
- The script will avoid duplicates and only add phrases that meet the quality threshold.
- You can run the script multiple times to keep improving your phrase set.

### 2B. Bulk Automation: Generating Multiple Categories at Once

If you want to quickly build up high-quality phrases for several categories at once, you can use the bulk automation script. This script will automatically generate 100 phrases each for 6 non-entertainment categories:

- Food & Drink
- Sports & Athletes
- Places & Travel
- Famous People
- Technology & Science
- History & Events

### How It Works
- The script runs the AI-powered generator for each category in sequence.
- After each category, it prints a live status table showing how many phrases have been stored, accepted, and the average score for each category so far.
- At the end, you'll see a summary table with results for all categories.

### Step-by-Step Example
1. Open a terminal and go to the phrase database tool:
   ```bash
   cd tools/phrase-database
   ```
2. Run the bulk generator script:
   ```bash
   node scripts/generate-multi-categories.js
   ```
3. Watch the progress table update as each category completes. The table columns are:
   - **Category:** The name of the category being generated
   - **Stored:** Number of phrases successfully stored in the database
   - **Accepted:** Number of phrases that passed the quality filter
   - **Avg Score:** The average quality score for accepted phrases

### Tips
- You can re-run the script to further increase the phrase count or improve quality.
- The script avoids duplicates and only stores phrases that meet the quality threshold.
- For more details on the process, see section 2A above.

---

## 3. Improving Existing Phrases

- **Review low-scoring or borderline phrases** using the manual review interface (planned) or by exporting and editing the phrase list.
- **To rescore or reprocess phrases:**
  ```bash
  npm start batch-score --category "Movies & TV"
  ```
- **To remove or update a phrase:**
  ```bash
  npm start remove "Old Phrase"
  npm start add "Improved Phrase" "Movies & TV"
  ```
- **Tip:** Always check the score and review the [Quality Guidelines](../phrase-quality-guidelines.md) before making changes.

---

## 4. Automated Quality Process: How It Works

### Step 1: Generation
- Phrases are generated by AI (Gemini or OpenAI) using category-specific prompts.
- Use the script to generate a batch for a category:
  ```bash
  node scripts/generate-category.js "Movies & TV" 100
  ```

### Step 2: Scoring & Filtering
- Each phrase is scored (0-100) using heuristics, Wikipedia/Reddit checks, and category modifiers.
- **Score thresholds:**
  - 80-100: Auto-accept
  - 60-79: Accept
  - 40-59: Manual review
  - 20-39: Warning
  - 0-19: Auto-reject

### Step 3: Manual Review
- Borderline phrases (score 40-59) are flagged for human review.
- Reviewers check for recognizability, party suitability, and category fit.
- See [Manual Review Guidelines](../phrase-quality-guidelines.md#manual-review-guidelines).

### Step 4: Export
- Export the final, high-quality phrase set for the main app:
  ```bash
  npm start export --output ../../words-on-phone-app/src/data/phrases.json --min-per-category 50
  ```

---

## 5. Using the CLI & Scripts

- **Initialize the database:**
  ```bash
  npm start init
  ```
- **Check status:**
  ```bash
  npm start status
  ```
- **List phrases:**
  ```bash
  npm start list --category "Movies & TV"
  ```
- **Check quotas:**
  ```bash
  npm start quota-status
  ```
- **Run the full integration test:**
  ```bash
  node scripts/test-integration.js
  ```
- **See all commands:**
  ```bash
  npm start help
  # or
  node src/cli.js --help
  ```

---

## 6. Troubleshooting & Tips

- **Database locked?**
  - Make sure no other process is using the database. Run:
    ```bash
    pkill -f "phrase-database"
    ```
- **Missing dependencies?**
  - Run:
    ```bash
    npm ci
    ```
- **Test failures?**
  - Check file permissions:
    ```bash
    chmod 755 data/
    ```
- **Low scores?**
  - Review the [Quality Guidelines](../phrase-quality-guidelines.md) and adjust your phrases.
- **Need to see sample phrases?**
  - Use:
    ```bash
    node scripts/generate-category.js "Movies & TV" --show-sample
    ```

---

## 7. Quality Guidelines (Summary)

- **Recognizability:** Widely known, not niche or technical
- **Party Suitability:** Easy to act out or describe
- **Appropriate Complexity:** Not too generic, not too technical
- **Currency:** Prefer recent, relevant content
- **Category Fit:** Matches the intended category

See the full [Phrase Quality Guidelines](../phrase-quality-guidelines.md) for details and examples.

---

## 8. Exporting for the Main App

- Export the final phrase set in the correct format:
  ```bash
  npm start export --output ../../words-on-phone-app/src/data/phrases.json --min-per-category 50
  ```
- The main app will automatically use this file for gameplay.

---

## 9. Continuous Improvement

- Regularly review phrase quality and update the database.
- Use feedback from players to refine the phrase set.
- Update the [Quality Guidelines](../phrase-quality-guidelines.md) as needed.

---

## 10. Need Help?

- Check the [README](./README.md) for technical details.
- Review the [Phrase Quality Guidelines](../phrase-quality-guidelines.md).
- If you get stuck, ask a developer or open an issue. 