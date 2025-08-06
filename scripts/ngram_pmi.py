#!/usr/bin/env python3
import argparse
import csv
import json
import math
from collections import defaultdict


def main():
    parser = argparse.ArgumentParser(description='Compute PMI from n-gram counts CSV')
    parser.add_argument('--input', required=True, help='Input CSV file: phrase,count')
    parser.add_argument('--output', required=True, help='Output JSON file')
    args = parser.parse_args()

    freq = defaultdict(int)
    total = 0

    # Read counts
    with open(args.input, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            if not row or len(row) < 2:
                continue
            phrase = row[0]
            try:
                count = int(row[-1])
            except ValueError:
                continue
            freq[phrase] = count
            total += count

    # Compute unigram probabilities
    unigram_p = {}
    for phrase, count in freq.items():
        words = phrase.split()
        if len(words) == 1:
            unigram_p[phrase] = count / total

    # Compute PMI for n-grams (n>1)
    result = {}
    for phrase, count in freq.items():
        words = phrase.split()
        if len(words) > 1:
            prob_phrase = count / total
            denom = 1.0
            for w in words:
                denom *= unigram_p.get(w, 1e-12)
            if denom > 0:
                pmi = math.log2(prob_phrase / denom)
            else:
                pmi = 0.0
            result[phrase] = {'count': count, 'pmi': pmi}

    # Write JSON output
    with open(args.output, 'w', encoding='utf-8') as out:
        json.dump(result, out, indent=2, ensure_ascii=False)

    print(f'Wrote {len(result)} n-grams to {args.output}')


if __name__ == '__main__':
    main()