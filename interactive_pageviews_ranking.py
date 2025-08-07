#!/usr/bin/env python3
"""
Interactive Pageviews Ranking Script
Processes phrases to get Wikipedia pageviews with user confirmation and batch processing.
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
BATCH_SIZE = 50  # Process in batches of 50

async def get_pageviews(session, title):
    """Get Wikipedia pageviews for a title"""
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
    except Exception:
        return 0

async def find_article(session, phrase):
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
    except Exception:
        pass
    return None

async def process_batch(phrases_batch, batch_num, total_batches):
    """Process a batch of phrases"""
    print(f"Processing batch {batch_num}/{total_batches} ({len(phrases_batch)} phrases)...")
    
    headers = {'User-Agent': 'PhraseRankingBot (Educational research)'}
    timeout = aiohttp.ClientTimeout(total=10)
    
    async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
        for i, phrase_obj in enumerate(phrases_batch):
            phrase = phrase_obj["phrase"]
            
            try:
                # Find article
                await asyncio.sleep(0.5)  # Rate limiting
                article_title = await find_article(session, phrase)
                
                if article_title:
                    # Get pageviews
                    await asyncio.sleep(0.3)
                    views = await get_pageviews(session, article_title)
                    phrase_obj["prominence"] = {
                        "score": views,
                        "method": "wiki_pageviews",
                        "article": article_title
                    }
                    if views > 0:
                        print(f"  ✅ {phrase}: {views:,} views")
                    else:
                        print(f"  📄 {phrase}: Article found but 0 views")
                else:
                    phrase_obj["prominence"] = {
                        "score": 0,
                        "method": "no_article"
                    }
                    print(f"  ❌ {phrase}: No article found")
                    
            except Exception as e:
                phrase_obj["prominence"] = {
                    "score": 0,
                    "method": "error"
                }
                print(f"  ⚠️  {phrase}: Error - {e}")
    
    return phrases_batch

def main():
    print("🔍 Interactive Wikipedia Pageviews Ranking")
    print("=" * 60)
    
    # Load and analyze current data
    if not PHRASES_PATH.exists():
        print(f"❌ {PHRASES_PATH} not found!")
        return
    
    items = json.loads(PHRASES_PATH.read_text())
    print(f"📊 Total phrases: {len(items):,}")
    
    # Count current methods
    methods = {}
    for item in items:
        method = item.get("prominence", {}).get("method", "none")
        methods[method] = methods.get(method, 0) + 1
    
    print(f"\nCurrent ranking methods:")
    for method, count in methods.items():
        print(f"  {method}: {count:,} phrases")
    
    # Find unique phrases that need pageviews (currently using totalhits)
    needs_processing_items = [
        item for item in items 
        if item.get("prominence", {}).get("method") == "wiki_totalhits"
    ]
    
    # Get unique phrases only
    unique_phrases = {}
    for item in needs_processing_items:
        phrase = item["phrase"]
        if phrase not in unique_phrases:
            unique_phrases[phrase] = item.copy()  # Keep one copy of each unique phrase
    
    unique_needs_processing = list(unique_phrases.values())
    
    print(f"\n🔄 Total phrases needing pageviews: {len(needs_processing_items):,}")
    print(f"🎯 Unique phrases to look up: {len(unique_needs_processing):,}")
    print(f"📊 Duplicate reduction: {len(needs_processing_items) - len(unique_needs_processing):,} duplicates found")
    
    if len(unique_needs_processing) == 0:
        print("✅ All phrases already processed!")
        return
    
    # Calculate time estimate based on unique phrases
    total_batches = (len(unique_needs_processing) + BATCH_SIZE - 1) // BATCH_SIZE
    estimated_minutes = total_batches * 3  # ~3 minutes per batch
    
    print(f"📦 Will process {len(unique_needs_processing):,} unique phrases in {total_batches} batches of {BATCH_SIZE}")
    print(f"⏱️  Estimated time: ~{estimated_minutes} minutes")
    print(f"🔄 Rate limiting: 0.5s between searches, 0.3s between pageview calls")
    
    # Get user confirmation
    response = input(f"\nProcess {len(unique_needs_processing):,} unique phrases? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled")
        return
    
    # Process unique phrases in batches
    start_time = time.time()
    processed_phrases = {}  # phrase -> prominence data
    
    for i in range(0, len(unique_needs_processing), BATCH_SIZE):
        batch = unique_needs_processing[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        
        # Process this batch
        processed_batch = asyncio.run(process_batch(batch, batch_num, total_batches))
        
        # Store results by phrase text
        for processed_item in processed_batch:
            processed_phrases[processed_item["phrase"]] = processed_item["prominence"]
        
        # Apply results to all instances of these phrases in the full dataset
        for phrase_text, prominence_data in processed_phrases.items():
            for k, original_item in enumerate(items):
                if original_item["phrase"] == phrase_text:
                    items[k]["prominence"] = prominence_data
        
        # Save progress every 5 batches
        if batch_num % 5 == 0:
            progress_path = PHRASES_PATH.with_suffix(f'.progress-{batch_num}.json')
            progress_path.write_text(json.dumps(items, indent=2))
            print(f"💾 Progress saved to {progress_path}")
        
        elapsed = time.time() - start_time
        print(f"✅ Batch {batch_num} complete ({elapsed/60:.1f} min elapsed)\n")
    
    # Final application of all results to all instances
    print("📝 Applying results to all duplicate phrases...")
    for phrase_text, prominence_data in processed_phrases.items():
        for k, original_item in enumerate(items):
            if original_item["phrase"] == phrase_text:
                items[k]["prominence"] = prominence_data
    
    # Sort by score and save final result
    items.sort(key=lambda o: o.get("prominence", {}).get("score", 0), reverse=True)
    
    # Show final statistics
    final_methods = {}
    for item in items:
        method = item.get("prominence", {}).get("method", "unknown")
        final_methods[method] = final_methods.get(method, 0) + 1
    
    print(f"📊 Final ranking methods:")
    for method, count in final_methods.items():
        print(f"  {method}: {count:,} phrases")
    
    # Show top results
    pageview_phrases = [item for item in items if item.get("prominence", {}).get("method") == "wiki_pageviews"]
    print(f"\n🏆 Top 10 phrases with pageviews:")
    for i, item in enumerate(pageview_phrases[:10], 1):
        prom = item["prominence"]
        print(f"{i:2d}. {item['phrase']:30} | {prom['score']:8,} views")
    
    # Save final result
    backup_path = PHRASES_PATH.with_suffix('.pre-pageviews-backup.json')
    backup_path.write_text(PHRASES_PATH.read_text())
    PHRASES_PATH.write_text(json.dumps(items, indent=2))
    
    total_time = time.time() - start_time
    print(f"\n✅ Complete! Total time: {total_time/60:.1f} minutes")
    print(f"💾 Backup saved to: {backup_path}")

if __name__ == "__main__":
    main()