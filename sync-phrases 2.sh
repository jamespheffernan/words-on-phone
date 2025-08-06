#!/bin/bash

# Phrase Database Sync Script
# Syncs the master phrases.json to all required locations

echo "🔄 Syncing phrases.json from master file..."

# Master file (source of truth)
MASTER_FILE="phrases.json"

# Target locations
TARGETS=(
    "words-on-phone-app/public/phrases.json"
    "tools/phrase-review/public/phrases.json"
)

# Check if master file exists
if [ ! -f "$MASTER_FILE" ]; then
    echo "❌ Master file $MASTER_FILE not found!"
    exit 1
fi

echo "📄 Master file: $MASTER_FILE"
echo "📊 Size: $(wc -l < "$MASTER_FILE") lines"

# Sync to each target
for target in "${TARGETS[@]}"; do
    if [ -f "$target" ]; then
        echo "🔄 Updating: $target"
    else
        echo "✨ Creating: $target"
        # Create directory if it doesn't exist
        mkdir -p "$(dirname "$target")"
    fi
    
    cp "$MASTER_FILE" "$target"
    if [ $? -eq 0 ]; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed"
    fi
done

# Remove redundant copies
REDUNDANT=(
    "words-on-phone-app/phrases.json"
    "words-on-phone-app/src/phrases.json"
)

echo ""
echo "🗑️ Cleaning up redundant copies..."
for redundant in "${REDUNDANT[@]}"; do
    if [ -f "$redundant" ]; then
        echo "🗑️ Removing: $redundant"
        rm "$redundant"
        echo "   ✅ Removed"
    fi
done

echo ""
echo "🎉 Phrase sync complete!"
echo "📋 Active locations:"
echo "   • $MASTER_FILE (master)"
for target in "${TARGETS[@]}"; do
    echo "   • $target"
done

echo ""
echo "💡 Usage: Run './sync-phrases.sh' after editing $MASTER_FILE"