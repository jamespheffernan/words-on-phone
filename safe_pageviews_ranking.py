#!/usr/bin/env python3
"""
Safe Phrase Pageviews Ranking Script
Processes phrases in small batches with timeouts and error handling to prevent runaway execution.
"""

import json
import pathlib
import aiohttp
import asyncio
import datetime as dt
from asyncio import Semaphore
import urllib.parse
import time

# Configuration
PHRASES_PATH = pathlib.Path("words-on-phone-app/src/phrases.json")
BATCH_SIZE = 100  # Process in small batches
MAX_RETRIES = 2
REQUEST_TIMEOUT = 10  # 10 second timeout per request
BATCH_TIMEOUT = 300  # 5 minute timeout per batch

async def test_wikipedia_connection():
    """Test if we can reach Wikipedia APIs"""
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get("https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=test&srlimit=1") as response:
                if response.status == 200:
                    print("✅ Wikipedia API connection successful")
                    return True
                else:
                    print(f"❌ Wikipedia API returned status {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Cannot reach Wikipedia API: {e}")
        return False

async def get_pageviews_safe(session, title, phrase):
    """Safely get pageviews with timeout and error handling"""
    try:
        start = (dt.date.today().replace(day=1) - dt.timedelta(days=90)).strftime("%Y%m01")
        end = (dt.date.today() - dt.timedelta(days=1)).strftime("%Y%m%d")
        
        encoded_title = urllib.parse.quote(title.replace(" ", "_"), safe='')
        url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/{encoded_title}/monthly/{start}/{end}"
        
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                views = sum(p["views"] for p in data.get("items", []))
                return views, "wiki_pageviews", title
            elif response.status == 404:
                return 0, "wiki_pageviews_notfound", title
            else:
                return 0, "api_error", f"HTTP {response.status}"
                
    except asyncio.TimeoutError:
        print(f"⚠️  Timeout getting pageviews for '{phrase}'")
        return 0, "timeout", title
    except Exception as e:
        print(f"⚠️  Error getting pageviews for '{phrase}': {e}")
        return 0, "error", str(e)

async def find_wikipedia_article(session, phrase):
    """Find the best Wikipedia article for a phrase"""
    try:
        # Try exact search first
        payload = {
            "action": "query", 
            "list": "search", 
            "srsearch": f'"{phrase}"',  # Exact phrase search
            "format": "json", 
            "srlimit": 3,
        }
        
        async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as response:
            if response.status == 200:
                data = await response.json()
                results = data["query"]["search"]
                
                if results:
                    # Look for exact title match first
                    for result in results:
                        if result["title"].lower() == phrase.lower():
                            return result["title"]
                    
                    # If no exact match, return first result
                    return results[0]["title"]
                    
        # If exact search failed, try broader search
        payload["srsearch"] = phrase
        async with session.get("https://en.wikipedia.org/w/api.php", params=payload) as response:
            if response.status == 200:
                data = await response.json()
                results = data["query"]["search"]
                if results:
                    return results[0]["title"]
                    
    except Exception as e:
        print(f"⚠️  Error searching for '{phrase}': {e}")
        
    return None

async def process_batch(phrases_batch, batch_num, total_batches):
    """Process a small batch of phrases with timeout"""
    print(f"\n📦 Processing batch {batch_num}/{total_batches} ({len(phrases_batch)} phrases)")
    
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    headers = {'User-Agent': 'PhraseRankingBot/3.0 (Educational research)'}
    
    try:
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            # Add batch timeout
            results = await asyncio.wait_for(
                process_batch_items(session, phrases_batch), 
                timeout=BATCH_TIMEOUT
            )
            return results
            
    except asyncio.TimeoutError:
        print(f"⚠️  Batch {batch_num} timed out after {BATCH_TIMEOUT} seconds")
        # Return original phrases with error status
        for phrase_obj in phrases_batch:
            phrase_obj["prominence"] = {"score": 0, "method": "batch_timeout"}
        return phrases_batch
    except Exception as e:
        print(f"⚠️  Batch {batch_num} failed: {e}")
        for phrase_obj in phrases_batch:
            phrase_obj["prominence"] = {"score": 0, "method": "batch_error"}
        return phrases_batch

async def process_batch_items(session, phrases_batch):
    """Process individual items in a batch"""
    sem = Semaphore(2)  # Limit concurrent requests
    
    async def process_one(phrase_obj):
        phrase = phrase_obj["phrase"]
        
        async with sem:
            # Add small delay between requests
            await asyncio.sleep(0.3)
            
            # Find Wikipedia article
            article_title = await find_wikipedia_article(session, phrase)
            
            if article_title:
                # Get pageviews
                await asyncio.sleep(0.3)  # Another small delay
                score, method, info = await get_pageviews_safe(session, article_title, phrase)
                phrase_obj["prominence"] = {
                    "score": score,
                    "method": method,
                    "article": article_title
                }
            else:
                phrase_obj["prominence"] = {
                    "score": 0,
                    "method": "no_wikipedia_article"
                }
        
        return phrase_obj
    
    # Process all phrases in this batch
    return await asyncio.gather(*(process_one(obj) for obj in phrases_batch))

def main():
    print("🔍 Safe Wikipedia Pageviews Ranking")
    print("=" * 50)
    
    # Test connection first
    if not asyncio.run(test_wikipedia_connection()):
        print("❌ Cannot connect to Wikipedia. Exiting.")
        return
    
    # Load phrases
    if not PHRASES_PATH.exists():
        print(f"❌ {PHRASES_PATH} not found!")
        return
    
    items = json.loads(PHRASES_PATH.read_text())
    print(f"📊 Loaded {len(items)} phrases")
    
    # Show current status
    current_pageviews = sum(1 for item in items if item.get("prominence", {}).get("method") == "wiki_pageviews")
    print(f"📈 Currently {current_pageviews} phrases have pageviews data")
    
    # Process only phrases that don't have pageviews yet
    needs_processing = [item for item in items if item.get("prominence", {}).get("method") != "wiki_pageviews"]
    print(f"🔄 Need to process {len(needs_processing)} phrases")
    
    if len(needs_processing) == 0:
        print("✅ All phrases already have pageviews data!")
        return
    
    # Ask for confirmation
    estimated_time = (len(needs_processing) // BATCH_SIZE + 1) * 6  # ~6 minutes per batch
    print(f"⏱️  Estimated time: ~{estimated_time} minutes")
    
    response = input("Continue? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled by user")
        return
    
    # Process in batches
    start_time = time.time()
    total_batches = (len(needs_processing) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in range(0, len(needs_processing), BATCH_SIZE):
        batch = needs_processing[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        
        print(f"⏳ Processing batch {batch_num}/{total_batches}...")
        processed_batch = asyncio.run(process_batch(batch, batch_num, total_batches))
        
        # Update the main items list
        for j, processed_item in enumerate(processed_batch):
            original_index = items.index(batch[j])
            items[original_index] = processed_item
        
        # Show progress
        elapsed = time.time() - start_time
        print(f"✅ Batch {batch_num} complete ({elapsed:.1f}s elapsed)")
        
        # Save progress every few batches
        if batch_num % 5 == 0 or batch_num == total_batches:
            backup_path = PHRASES_PATH.with_suffix(f'.progress-batch-{batch_num}.json')
            backup_path.write_text(json.dumps(items, indent=2))
            print(f"💾 Progress saved to {backup_path}")
    
    # Final sort and save
    items.sort(key=lambda o: o.get("prominence", {}).get("score", 0), reverse=True)
    
    # Show final stats
    final_methods = {}
    for item in items:
        method = item.get("prominence", {}).get("method", "unknown")
        final_methods[method] = final_methods.get(method, 0) + 1
    
    print(f"\n📊 Final distribution:")
    for method, count in final_methods.items():
        print(f"  {method}: {count}")
    
    # Save final result
    backup_path = PHRASES_PATH.with_suffix('.final-backup.json')
    backup_path.write_text(PHRASES_PATH.read_text())
    PHRASES_PATH.write_text(json.dumps(items, indent=2))
    
    total_time = time.time() - start_time
    print(f"\n✅ Complete! Total time: {total_time:.1f} seconds")
    print(f"💾 Backup saved to: {backup_path}")

if __name__ == "__main__":
    main()