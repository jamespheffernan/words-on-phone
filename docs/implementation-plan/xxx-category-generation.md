# XXX Category Phrase Generation Implementation Plan

## Background and Motivation

- **Goal:** Add a new "XXX" (adult/illicit) category to the phrase database, containing fun, risqué, and sexy phrases suitable for rowdy adult parties.
- **Motivation:** Expand the game's appeal to adult audiences by providing an opt-in, high-quality set of naughty phrases, leveraging the existing AI-powered generation and review pipeline.

## Key Challenges and Analysis

- **Prompt Engineering:** The default prompts and filters are family-friendly. Custom prompts are needed to elicit sexy, risqué, but not hateful or illegal content.
- **Category Setup:** A new "XXX" category must be created with an appropriate quota (e.g., 200-500 phrases).
- **Quality Review:** The automated scoring pipeline may flag or reject phrases for "appropriateness." Manual review will be used for this category.
- **Ethical/Legal Boundaries:** All content must be fun, consensual, and non-hateful. No illegal, hateful, or non-consensual content.
- **Export/Integration:** Ensure the new category is included in exports and is opt-in for gameplay.

## High-level Task Breakdown

1. **Create the "XXX" Category**
   - Add a new "XXX" category to the phrase database with a quota of 200-500 phrases.
   - _Success Criteria:_ Category appears in the database and is selectable for generation.

2. **Engineer Custom AI Prompts**
   - Design prompts for OpenAI/Gemini to generate fun, sexy, and risqué phrases for the "XXX" category.
   - _Success Criteria:_ Prompts are documented and tested to produce the desired tone/content.

3. **Run AI-Powered Generation Script**
   - Use `generate-category.js` with the new category and custom prompt.
   - Target 100-200 phrases in the first batch.
   - Use `--debug` to monitor output.
   - _Success Criteria:_ At least 100 phrases are generated and stored in the "XXX" category.

4. **Manual Review and Curation**
   - Review all generated phrases for fun, safety, and appropriateness.
   - Remove any that are illegal, hateful, or otherwise problematic.
   - _Success Criteria:_ All stored phrases are safe, fun, and suitable for adult party play.

5. **Export and Integrate**
   - Export the updated phrase set, ensuring the new category is included.
   - Test in the main app (opt-in mode).
   - _Success Criteria:_ "XXX" category is available in the exported file and can be enabled in the app.

6. **Document Lessons Learned**
   - Note any issues with prompt effectiveness, filtering, or review for future reference.
   - _Success Criteria:_ Lessons are added to the scratchpad.

## Project Status Board

- [x] Create "XXX" category in database (complete)
- [x] Engineer and document custom AI prompts (in progress)
- [x] Run AI-powered generation for "XXX" category (103 phrases generated, avg score 80/100, partial batch)
- [ ] Manual review and curation of generated phrases
- [ ] Export and test integration in main app
- [ ] Document lessons learned

## Success Criteria

- At least 100 high-quality, fun, and risqué phrases are generated and stored in the "XXX" category.
- All phrases are manually reviewed for safety and appropriateness (no hate speech, no illegal content).
- The new category is available in the exported phrase set and can be enabled in the main app (opt-in).
- All steps, prompts, and lessons are documented for future reference.

## Custom AI Prompt for XXX Category

"""
Generate a list of short, fun, and risqué phrases perfect for a rowdy adult party game (like Heads Up or Charades, but for adults only).

CATEGORY: XXX (Sexy/Illicit/Adult)

REQUIREMENTS:
- 2-4 words maximum
- Instantly recognizable to most adults
- Sexy, naughty, or suggestive (but not hateful, illegal, or non-consensual)
- Fun, playful, and suitable for a party with consenting adults
- No hate speech, violence, or non-consensual acts
- Avoid anything illegal or extremely offensive
- Be creative and diverse – include slang, innuendo, and pop culture references

EXAMPLES OF EXCELLENT PHRASES:
- "Strip Poker"
- "Booty Call"
- "Naughty Nurse"
- "Fifty Shades"
- "Sexy Selfie"
- "Body Shot"
- "Love Hotel"
- "Handcuff Escape"
- "Dirty Dancing"
- "Walk of Shame"
- "French Kiss"
- "Magic Mike"
- "Thong Song"
- "Lap Dance"
- "Morning After"
- "Role Play"
- "Secret Affair"
- "Adult Toy"
- "Midnight Rendezvous"
- "Bedroom Eyes"

Return ONLY a JSON array of phrases: ["phrase1", "phrase2", ...]"
"""

## Executor's Feedback or Assistance Requests

[2025-07-01] 'XXX' category can be created via CLI. Interactive phrase addition is possible and recognized by the tool. Proceeding to engineer custom AI prompt for adult/illicit phrases.
[2025-07-01] Custom AI prompt for XXX category drafted and documented. Ready to use in generation script.
[2025-07-01] Ran AI-powered generation for 'XXX' category. 103 phrases generated and stored (avg score 80/100). However, most phrases are not adult/risqué—they are generic party game phrases (e.g., "Sleeping Bag", "Popcorn Pop"). The current pipeline and prompt are not producing the intended sexy/adult content. Next step: review prompt delivery, consider manual curation, or adjust pipeline to allow explicit prompt injection for Gemini/OpenAI.

## Lessons Learned

_(To be appended as issues or insights arise during implementation)_ 