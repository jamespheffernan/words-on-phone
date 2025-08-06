#!/usr/bin/env python3
import argparse
import json
import sys
from datetime import datetime

try:
    import pyarrow.parquet as pq
except ImportError:
    print('pyarrow is required. Please install via pip: pip install pyarrow', file=sys.stderr)
    sys.exit(1)

# Priority types from our plan
PRIORITY_TYPES = [
    'Q5',       # human
    'Q11424',   # film
    'Q5398426', # TV series
    'Q482994',  # album
    'Q7725634', # literary work
    'Q1107',    # anime
    'Q349',     # sport
    'Q515',     # city
    'Q6256',    # country
    'Q1047113', # specialty food
    'Q41438',   # brand
    'Q3305213'  # painting
]


def main():
    parser = argparse.ArgumentParser(description='Extract and filter KDWD Parquet shard')
    parser.add_argument('--input', required=True, help='Input Parquet file')
    parser.add_argument('--output', required=True, help='Output JSON file')
    args = parser.parse_args()

    try:
        table = pq.read_table(args.input)
    except Exception as e:
        print(f'Error reading Parquet: {e}', file=sys.stderr)
        sys.exit(1)

    df = table.to_pydict()
    ids = df.get('id') or df.get('entity')
    labels = df.get('label') or df.get('entityLabel')
    sitelinks = df.get('sitelinks') or df.get('sitelinksCount')
    types = df.get('instanceOf')
    aliases_list = df.get('aliases') or [[]] * len(ids)

    entities = {}
    processed = 0
    kept = 0

    for i, ent_id in enumerate(ids):
        processed += 1
        sl = sitelinks[i] if sitelinks else 0
        tp = types[i] if types else None
        if sl is None:
            sl = 0
        if tp in PRIORITY_TYPES and sl >= 10:
            alias = aliases_list[i] if i < len(aliases_list) else []
            entities[ent_id] = {
                'id': ent_id,
                'label': labels[i],
                'sitelinks': sl,
                'type': tp,
                'aliases': alias
            }
            kept += 1

    output = {
        'meta': {
            'processed': processed,
            'kept': kept,
            'buildDate': datetime.utcnow().isoformat() + 'Z'
        },
        'entities': entities
    }

    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f'Extracted {kept}/{processed} entities to {args.output}')
    except Exception as e:
        print(f'Error writing JSON: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()