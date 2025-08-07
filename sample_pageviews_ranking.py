#!/usr/bin/env python3
"""
Sample Pageviews Ranking Script
Processes a manageable sample of phrases to demonstrate the approach.
"""

import json
import pathlib
import aiohttp
import asyncio
import datetime as dt
import urllib.parse
import time

# Configuration
PHRASES_PATH = pathlib.Path("words-on-phone-app/src/phrases.json")
SAMPLE_SIZE = 200  # Process only 200 phrases as a demonstration
REQUEST_TIMEOUT = 5

async def get_pageviews_safe(session, title):
    """Get pageviews with error handling"""
    try:
        start = (dt.date.today().replace(day=1) - dt.timedelta(days=90)).strftime("%Y%m01")
        end = (dt.date.today() - dt.timedelta(days=1)).strftime("%Y%m%d")
        
        encoded_title = urllib.parse.quote(title.replace(" ", "_"), safe='')
        url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/{encoded_title}/monthly/{start}/{end}"
        
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return sum(p["views"] for p in data.get("items", []))
            else:
                return 0
    except:
        return 0

async def find_wikipedia_article(session, phrase):
    """Find Wikipedia article for phrase"""
    try:
        payload = {
            "action": "query", 
            "list": "search", 
            "srsearch": phrase,
            "format": "json", 
            "srlimit": 1,
        }
        
        async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as response:
            if response.status == 200:
                data = await response.json()
                results = data["query"]["search"]
                if results:
                    return results[0]["title"]
    except:
        pass
    return None

async def process_phrase(session, phrase_obj, semaphore):
    """Process a single phrase"""
    async with semaphore:
        phrase = phrase_obj["phrase"]
        
        # Small delay between requests
        await asyncio.sleep(0.5)
        
        try:
            # Find Wikipedia article
            article_title = await find_wikipedia_article(session, phrase)
            
            if article_title:
                await asyncio.sleep(0.3)
                views = await get_pageviews_safe(session, article_title)
                phrase_obj["prominence"] = {
                    "score": views,
                    "method": "wiki_pageviews",
                    "article": article_title
                }
            else:
                phrase_obj["prominence"] = {
                    "score": 0,
                    "method": "no_article_found"
                }
                
        except Exception as e:
            phrase_obj["prominence"] = {
                "score": 0,
                "method": "error"
            }
        
        return phrase_obj

async def main_async():
    """Main async function"""
    print("🔍 Sample Wikipedia Pageviews Ranking")
    print("=" * 50)
    
    # Load phrases
    items = json.loads(PHRASES_PATH.read_text())
    print(f"📊 Total phrases: {len(items)}")
    
    # Find phrases that need processing (currently using totalhits)
    needs_processing = [
        item for item in items 
        if item.get("prominence", {}).get("method") == "wiki_totalhits"
    ]
    
    print(f"🔄 Phrases needing pageviews: {len(needs_processing)}")
    
    # Take a sample
    sample = needs_processing[:SAMPLE_SIZE]
    print(f"📝 Processing sample of {len(sample)} phrases")
    
    # Set up session
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    headers = {'User-Agent': 'PhraseRankingBot/Sample (Educational research)'}
    semaphore = asyncio.Semaphore(2)  # Limit concurrent requests
    
    start_time = time.time()
    
    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        # Process all phrases in the sample
        tasks = [process_phrase(session, item, semaphore) for item in sample]
        
        print("⏳ Processing phrases...")
        completed = 0
        for task in asyncio.as_completed(tasks):
            await task
            completed += 1
            if completed % 20 == 0:
                elapsed = time.time() - start_time
                print(f"✅ {completed}/{len(sample)} complete ({elapsed:.1f}s)")
    
    # Update the original items
    sample_phrases = {item["phrase"]: item for item in sample}
    for i, item in enumerate(items):
        if item["phrase"] in sample_phrases:
            items[i] = sample_phrases[item["phrase"]]
    
    # Sort by score
    items.sort(key=lambda o: o.get("prominence", {}).get("score", 0), reverse=True)
    
    # Show results
    print(f"\n📊 Sample Results:")
    pageviews_found = sum(1 for item in sample if item.get("prominence", {}).get("method") == "wiki_pageviews")
    print(f"  Found pageviews for {pageviews_found}/{len(sample)} phrases")
    
    # Show top 10 from sample
    sample_with_pageviews = [item for item in sample if item.get("prominence", {}).get("method") == "wiki_pageviews"]
    sample_with_pageviews.sort(key=lambda o: o["prominence"]["score"], reverse=True)
    
    print(f"\nTop 10 from sample:")
    for i, item in enumerate(sample_with_pageviews[:10], 1):
        prom = item["prominence"]
        print(f"{i:2d}. {item['phrase']:25} | {prom['score']:8,} | {prom.get('article', '')}")
    
    # Save updated data
    backup_path = PHRASES_PATH.with_suffix('.sample-backup.json')
    backup_path.write_text(PHRASES_PATH.read_text())
    PHRASES_PATH.write_text(json.dumps(items, indent=2))
    
    total_time = time.time() - start_time
    print(f"\n✅ Complete! Time: {total_time:.1f} seconds")
    print(f"💾 Backup: {backup_path}")

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()