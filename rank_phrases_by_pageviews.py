#!/usr/bin/env python3
"""
Enhanced Phrase Prominence Ranking Script
Re-ranks all phrases using Wikipedia pageviews with multiple search strategies.
Attempts to find Wikipedia articles for every phrase using various techniques.
"""

import json
import pathlib
import aiohttp
import asyncio
import datetime as dt
from asyncio import Semaphore
from tqdm.asyncio import tqdm
import urllib.parse

# Configuration
PHRASES_PATH = pathlib.Path("words-on-phone-app/src/phrases.json")
SEM = Semaphore(2)  # Conservative concurrency

async def wiki_search_multiple(session, phrase):
    """Search Wikipedia for a phrase using multiple strategies"""
    strategies = [
        phrase,  # Exact phrase
        phrase.replace("'", ""),  # Remove apostrophes
        phrase.replace("&", "and"),  # Replace & with and
        phrase.split()[0] if len(phrase.split()) > 1 else phrase,  # First word only
        phrase.replace("The ", "").replace("the ", ""),  # Remove "The"
        phrase.replace(".", ""),  # Remove periods
    ]
    
    # Remove duplicates while preserving order
    unique_strategies = []
    for strategy in strategies:
        if strategy not in unique_strategies and strategy.strip():
            unique_strategies.append(strategy.strip())
    
    for search_term in unique_strategies:
        try:
            await asyncio.sleep(0.5)  # Rate limiting
            payload = {
                "action": "query", 
                "list": "search", 
                "srsearch": search_term,
                "format": "json", 
                "srlimit": 5,  # Get more results to find best match
                "srprop": "title|snippet",
            }
            
            async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as r:
                if r.status == 429:
                    await asyncio.sleep(5)
                    continue
                if r.status != 200:
                    continue
                    
                js = await r.json()
                results = js["query"]["search"]
                
                if not results:
                    continue
                
                # Look for exact or very close matches
                for result in results:
                    title = result["title"]
                    # Prefer exact matches or very close matches
                    if (title.lower() == phrase.lower() or 
                        title.lower() == search_term.lower() or
                        phrase.lower() in title.lower() or
                        any(word in title.lower() for word in phrase.lower().split() if len(word) > 3)):
                        return title.replace(" ", "_"), js["query"]["searchinfo"].get("totalhits", 0)
                
                # If no good match, return first result
                if results:
                    return results[0]["title"].replace(" ", "_"), js["query"]["searchinfo"].get("totalhits", 0)
                    
        except Exception as e:
            print(f"Error searching for '{search_term}': {e}")
            continue
    
    return None, 0

def month_range(months=3):
    """Get date range for the last N months"""
    end = (dt.date.today() - dt.timedelta(days=1)).strftime("%Y%m%d")
    start = (dt.date.today().replace(day=1) - dt.timedelta(days=30*months)).strftime("%Y%m01")
    return start, end

async def pageviews(session, title, months=3):
    """Get Wikipedia page views for the last N months"""
    start, end = month_range(months)
    # URL encode the title properly
    encoded_title = urllib.parse.quote(title, safe='')
    url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/{encoded_title}/monthly/{start}/{end}"
    
    try:
        await asyncio.sleep(0.5)  # Rate limiting
        async with session.get(url) as r:
            if r.status == 429:
                await asyncio.sleep(5)
                return 0
            if r.status != 200:
                return 0
            data = await r.json()
            return sum(p["views"] for p in data.get("items", []))
    except Exception as e:
        print(f"Error getting pageviews for '{title}': {e}")
        return 0

async def score_one(sess, obj, pbar):
    """Score a single phrase with enhanced Wikipedia search"""
    phrase = obj["phrase"]
    try:
        # Enhanced Wikipedia search with multiple strategies
        async with SEM:
            title, hits = await wiki_search_multiple(sess, phrase)
        
        # If we found a Wikipedia page, try to get page views
        if title:
            async with SEM:
                views = await pageviews(sess, title)
            
            # If we got pageviews, use them (even if 0, it's still more accurate than search hits)
            obj["prominence"] = {
                "score": views,
                "method": "wiki_pageviews",
                "article": title.replace("_", " "),
                "search_hits": hits  # Keep the search hits as additional info
            }
            pbar.update(1)
            return
        
        # If no Wikipedia article found at all, use search hits as fallback
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
    print(f"Re-ranking {len(items)} phrases using enhanced Wikipedia pageviews...")
    
    headers = {
        'User-Agent': 'PhraseRankingBot/2.0 (Educational research project for game development)'
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
    
    # Show current distribution
    current_methods = {}
    for item in items:
        method = item.get("prominence", {}).get("method", "none")
        current_methods[method] = current_methods.get(method, 0) + 1
    
    print(f"\nCurrent method distribution:")
    for method, count in current_methods.items():
        print(f"  {method}: {count} phrases")
    
    # Score all phrases with enhanced search
    asyncio.run(score_all(items))
    
    # Sort by prominence score
    items.sort(key=lambda o: o["prominence"]["score"], reverse=True)
    
    # Show new distribution
    new_methods = {}
    for item in items:
        method = item["prominence"]["method"]
        new_methods[method] = new_methods.get(method, 0) + 1
    
    print(f"\nNew method distribution:")
    for method, count in new_methods.items():
        print(f"  {method}: {count} phrases")
    
    # Show top 15 results
    print(f"\nTop 15 most prominent phrases:")
    for i, item in enumerate(items[:15], 1):
        prom = item["prominence"]
        method = prom["method"]
        score = prom["score"]
        article = prom.get("article", "")
        search_hits = prom.get("search_hits", "")
        hits_info = f"({search_hits:,} hits)" if search_hits else ""
        print(f"{i:2d}. {item['phrase']:25} | {score:8,} | {method:15} | {article} {hits_info}")
    
    # Save back to disk with backup
    backup_path = PHRASES_PATH.with_suffix('.pageviews-backup.json')
    print(f"\nCreating backup: {backup_path}")
    backup_path.write_text(PHRASES_PATH.read_text())
    
    print(f"Saving enhanced rankings to: {PHRASES_PATH}")
    PHRASES_PATH.write_text(json.dumps(items, indent=2, ensure_ascii=False))
    print("✅ Enhanced phrase ranking complete!")

if __name__ == "__main__":
    main()