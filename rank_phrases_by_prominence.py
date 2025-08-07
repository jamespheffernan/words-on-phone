#!/usr/bin/env python3
"""
Phrase Prominence Ranking Script
Ranks all phrases by Wikipedia prominence using search results and page views.
Based on the instructions in src/components/instructions for ranking phrases.txt
"""

import json
import pathlib
import aiohttp
import asyncio
import datetime as dt
from asyncio import Semaphore
from tqdm.asyncio import tqdm

# Configuration
PHRASES_PATH = pathlib.Path("words-on-phone-app/src/phrases.json")
SEM = Semaphore(2)  # Very conservative - only 2 concurrent requests

async def wiki_search(session, phrase):
    """Search Wikipedia for a phrase and get totalhits count"""
    payload = {
        "action": "query", 
        "list": "search", 
        "srsearch": phrase,
        "format": "json", 
        "srlimit": 1,
        "srprop": "",
    }
    try:
        # Add longer delay to be very respectful to Wikipedia
        await asyncio.sleep(0.5)
        async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as r:
            if r.status == 429:  # Rate limited
                await asyncio.sleep(5)  # Wait much longer on rate limit
                async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as r2:
                    if r2.status != 200:
                        return None, 0
                    js = await r2.json()
            else:
                js = await r.json()
            hits = js["query"]["searchinfo"].get("totalhits", 0)
            results = js["query"]["search"]
            title = results[0]["title"].replace(" ", "_") if results else None
            return title, hits
    except Exception as e:
        print(f"Error searching for '{phrase}': {e}")
        return None, 0

def month_range(months=3):
    """Get date range for the last N months"""
    end = (dt.date.today() - dt.timedelta(days=1)).strftime("%Y%m%d")
    start = (dt.date.today().replace(day=1) - dt.timedelta(days=30*months)).strftime("%Y%m01")
    return start, end

async def pageviews(session, title, months=3):
    """Get Wikipedia page views for the last N months"""
    start, end = month_range(months)
    url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/{title}/monthly/{start}/{end}"
    try:
        await asyncio.sleep(0.5)  # Conservative rate limiting
        async with session.get(url) as r:
            if r.status == 429:  # Rate limited
                await asyncio.sleep(5)
                return 0  # Skip if rate limited on pageviews
            if r.status != 200:
                return 0
            data = await r.json()
            return sum(p["views"] for p in data.get("items", []))
    except Exception as e:
        print(f"Error getting pageviews for '{title}': {e}")
        return 0

async def score_one(sess, obj, pbar):
    """Score a single phrase"""
    phrase = obj["phrase"]
    try:
        # Get Wikipedia search results
        async with SEM:
            title, hits = await wiki_search(sess, phrase)
        
        # If we found a Wikipedia page, try to get page views
        if title:
            async with SEM:
                views = await pageviews(sess, title)
            if views:
                obj["prominence"] = {
                    "score": views,
                    "method": "wiki_pageviews",
                    "article": title,
                }
                pbar.update(1)
                return
        
        # Fallback to search result count
        obj["prominence"] = {
            "score": hits, 
            "method": "wiki_totalhits"
        }
        pbar.update(1)
        
    except Exception as e:
        print(f"Error scoring phrase '{phrase}': {e}")
        obj["prominence"] = {
            "score": 0, 
            "method": "error"
        }
        pbar.update(1)

async def score_all(items):
    """Score all phrases with progress bar"""
    print(f"Ranking {len(items)} phrases by Wikipedia prominence...")
    
    headers = {
        'User-Agent': 'PhraseRankingBot/1.0 (https://github.com/your-repo; your-email@example.com)'
    }
    async with aiohttp.ClientSession(headers=headers) as sess:
        with tqdm(total=len(items), desc="Processing phrases") as pbar:
            await asyncio.gather(*(score_one(sess, o, pbar) for o in items))

def main():
    # Load phrases
    print("Loading phrases from JSON file...")
    if not PHRASES_PATH.exists():
        print(f"Error: {PHRASES_PATH} not found!")
        return
    
    items = json.loads(PHRASES_PATH.read_text())
    print(f"Loaded {len(items)} phrases")
    
    # Score all phrases
    asyncio.run(score_all(items))
    
    # Sort by prominence score
    items.sort(key=lambda o: o["prominence"]["score"], reverse=True)
    
    # Show top 10 results
    print("\nTop 10 most prominent phrases:")
    for i, item in enumerate(items[:10], 1):
        prom = item["prominence"]
        method = prom["method"]
        score = prom["score"]
        article = prom.get("article", "")
        print(f"{i:2d}. {item['phrase']:30} | {score:8,} | {method} | {article}")
    
    # Show method distribution
    methods = {}
    for item in items:
        method = item["prominence"]["method"]
        methods[method] = methods.get(method, 0) + 1
    
    print(f"\nMethod distribution:")
    for method, count in methods.items():
        print(f"  {method}: {count} phrases")
    
    # Save back to disk
    backup_path = PHRASES_PATH.with_suffix('.backup.json')
    print(f"\nCreating backup: {backup_path}")
    backup_path.write_text(PHRASES_PATH.read_text())
    
    print(f"Saving ranked phrases to: {PHRASES_PATH}")
    PHRASES_PATH.write_text(json.dumps(items, indent=2, ensure_ascii=False))
    print("✅ Phrase ranking complete!")

if __name__ == "__main__":
    main()