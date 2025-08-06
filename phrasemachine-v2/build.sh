#!/usr/bin/env bash
set -e

echo "🚀 PhraseMachine v2 - Phrase Generation Pipeline"
echo "=============================================="

# Build pipeline for PhraseMachine v2 datasets and phrase generation
ROOT_DIR=$(pwd)
DOWNLOAD_DIR="$ROOT_DIR/download"
SCRIPTS_DIR="$ROOT_DIR/scripts"
DIST_DIR="$ROOT_DIR/dist"
OUTPUT_DIR="$ROOT_DIR/output"

mkdir -p "$DOWNLOAD_DIR" "$DIST_DIR" "$OUTPUT_DIR"

echo "Starting build at $(date)"

echo "[1/5] Building Wikidata from curated + external datasets..."
node "$SCRIPTS_DIR/build-wikidata-from-curated.js" \
  --curated "data/curated/wikidata-entities-expanded.json" \
  --output "$DIST_DIR/entities.json"

echo "[2/5] Processing N-grams..."
node "$SCRIPTS_DIR/build-ngrams-minimal.js" \
  --output "$DIST_DIR/ngrams.json"

echo "[3/5] Processing Concreteness..."
node scripts/build-concreteness-essentials.js \
  --test=false \
  --output "$DIST_DIR/concreteness.json"

echo "[4/5] Processing WordNet..."  
node scripts/build-wordnet-essentials.js \
  --test=false \
  --output "$DIST_DIR/wordnet_mwe.json"


# --- Phrase Generation (NEW) ---
echo "[5/8] Generating phrases..."
node generate-phrases.js

echo "[6/8] Validating generated phrases..."
node validators/quality-check.js --input output/phrases.json

# --- Dataset Packing (Updated) ---
echo "[7/8] Packing all datasets..."
node "$SCRIPTS_DIR/pack_all.js" \
  --entities "$DIST_DIR/entities.json" \
  --ngrams "$DIST_DIR/ngrams.json" \
  --concreteness "$DIST_DIR/concreteness.json" \
  --wordnet "$DIST_DIR/wordnet_mwe.json" \
  --output "$DIST_DIR/combined_datasets.json"

echo "[8/8] Gzipping bundle..."
gzip -c "$DIST_DIR/combined_datasets.json" > "$DIST_DIR/combined_datasets.json.gz"

# Compress phrase output too
gzip -c "$OUTPUT_DIR/phrases.json" > "$OUTPUT_DIR/phrases.json.gz"

echo "Build complete at $(date). Output:"
echo "📦 Combined datasets:"
ls -lh "$DIST_DIR/combined_datasets.json.gz"
echo "🎮 Generated phrases:"
ls -lh "$OUTPUT_DIR/phrases.json.gz"
