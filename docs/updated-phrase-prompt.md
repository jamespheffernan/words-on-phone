### Deep-Research Prompt for Building a 5 000-Phrase Game Bank

````
SYSTEM  
You are PhraseDataMiner, an expert researcher tasked with building a party-game phrase bank.

USER  
# Goal  
Generate **≥ 5 400 unique English phrases** (1–6 words each), family-friendly, and easy to mime or describe in a charades / hot-potato game.

# Categories & quotas  
Meet **or exceed** the minimum count for every category below; distribute any extra phrases evenly.

| Category                       | Minimum |
|--------------------------------|---------|
| Entertainment & Pop Culture    | 350 |
| Famous People                  | 350 |
| Food & Drink                   | 350 |
| History & Events               | 350 |
| Movies & TV                    | 350 |
| Music & Artists                | 350 |
| Nature & Animals               | 350 |
| Places & Travel                | 350 |
| Sports & Athletes              | 350 |
| Technology & Science           | 350 |
| **Idioms & Sayings**           | 350 |
| **Holidays & Celebrations**    | 350 |
| **Brands & Products**          | 350 |
| **Objects & Tools**            | 350 |
| **Occupations & Skills**       | 350 |
| **Wildcard** (anything fun that doesn't fit above) | 350 |

*(Everything is simply the union of all categories.)*

# Requirements  
1. 1–6 words, Title Case.  
2. ASCII only; apostrophes/hyphens allowed inside proper names (e.g., Queen's Gambit, Spider-Man).  
3. Phrase must be in **common spoken or written use** (see Common-Phrase Test below).  
4. Must stand on its own – avoid tacking on vague suffixes ("Ride", "Show", "Contest", "Act", "Dance", "Battle", "Moment", "Walk", "Scene", "Story", "Challenge", "Movie", "Film", "Series", "Show", "Cartoon", "Classic", "Disney", "Pixar", "Netflix", "Marvel", etc.) unless the full expression is the well-known form (e.g., Bottle Cap Challenge is OK, Ferris Wheel Ride is not).  
5. Clear link to the assigned category; replace overly niche references with broader, well-known adjacent concepts.  
6. Family-friendly – no profanity, politics, or 18 + themes.  
7. No duplicates or near-duplicates (case-insensitive) across the entire bank.  
8. ≤ 2 phrases starting with the same first word per category.  
9. ≥ 10 % of each category must reference the **last five years** of culture / news.

# Common-Phrase Test (apply silently)  
A candidate passes if at least **one** of the following is true:  
• Exact phrase appears in Wikipedia article titles, Wikititles search results, or Google N-Gram frequency > 0 for 2010–2020.  
• Exact phrase returns ≥ 50 Google search results when quoted (approximate using internal knowledge).  
• It is a proper name or viral meme that trended globally (e.g., Baby Yoda, Bottle Cap Challenge).  
If none are true, discard or rewrite.

# Reference Examples  
✓ Good: "Rap Battle", "Red Carpet", "Mic Drop", "Zoom Meeting", "Bottle Cap Challenge"  
✗ Bad (too obscure or padded): "Ferris Wheel Ride", "Chewbacca Wookiee", "Godzilla Monster", "Facepalm Moment", "Open Air Concert"

# Output format  
Return **only** valid JSON each time:

```json
{
  "category": "Category Name",
  "phrases": [
    "First Phrase",
    "Second Phrase",
    "... up to 250 items max ..."
  ]
}
```

# Pagination protocol

• Deliver one category per response, **≤ 250 phrases** at a time.  
• After finishing a category, proceed to the next until all quotas are met.  
• When every quota is satisfied, reply with exactly **DONE**.

# Hidden Work (think silently)
Brainstorm → prune obscurities → run Common-Phrase Test → dedupe → length & family check → diversity check → balance recent vs classic → output JSON only.

# Silent checklist before every send
* Category quota met (running total).  
* Every phrase passed Common-Phrase Test.  
* 1–6 words, family-friendly.  
* No duplicates across **all** categories.  
* First-word limit (≤ 5 per category) enforced.  
* ≥ 10 % "last five years" references per category.

Begin with **Entertainment & Pop Culture**. 