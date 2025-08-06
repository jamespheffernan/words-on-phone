#!/usr/bin/env bash
set -e

# Build pipeline for PhraseMachine v2 datasets
ROOT_DIR=$(pwd)
DOWNLOAD_DIR="$ROOT_DIR/download"
SCRIPTS_DIR="$ROOT_DIR/scripts"
DIST_DIR="$ROOT_DIR/dist"

mkdir -p "$DOWNLOAD_DIR" "$DIST_DIR"

echo "Starting build at $(date)"

echo "[1/5] Streaming Wikidata dump + filtering..."
# Download and stream-filter directly from the JSON dump
curl -sL https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2 \
  | bzip2 -dc \
  | node "$SCRIPTS_DIR/extract_kdwd_jsonl.js" --output "$DIST_DIR/entities.json"

echo "[2/5] Extracted KDWD entities"

echo "[3/5] Filtering entities..."
node "$SCRIPTS_DIR/filter_entities.js" \
  --input "$ROOT_DIR/data/production/wikidata_essentials.json" \
  --output "$DIST_DIR/entities.json"


echo "[3/5] Processing N-grams..."
python3 "$SCRIPTS_DIR/ngram_pmi.py" \
  --input "$DOWNLOAD_DIR/ngram_counts.csv" \
  --output "$DIST_DIR/ngrams.json"


echo "[4/5] Processing Concreteness and WordNet..."
node scripts/build-concreteness-essentials.js \
  --test=false \
  --output "$DIST_DIR/concreteness.json"
node scripts/build-wordnet-essentials.js \
  --test=false \
  --output "$DIST_DIR/wordnet_mwe.json"


echo "[5/5] Packing all datasets..."
node "$SCRIPTS_DIR/pack_all.js" \
  --entities "$DIST_DIR/entities.json" \
  --ngrams "$DIST_DIR/ngrams.json" \
  --concreteness "$DIST_DIR/concreteness.json" \
  --wordnet "$DIST_DIR/wordnet_mwe.json" \
  --output "$DIST_DIR/combined_datasets.json"


echo "Gzipping bundle..."
gzip -c "$DIST_DIR/combined_datasets.json" > "$DIST_DIR/combined_datasets.json.gz"

echo "Build complete:"
ls -lh "$DIST_DIR/combined_datasets.json.gz"