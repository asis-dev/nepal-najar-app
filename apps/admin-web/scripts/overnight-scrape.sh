#!/bin/bash
# =============================================================
# Nepal Najar — Overnight Data Engine
# Run this while LM Studio (Qwen 3.5) is running locally.
# It will: 1) Harvest all sources, 2) AI-analyze every article.
# =============================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
SECRET="${SCRAPE_SECRET:-nepal-najar-scrape-2024}"
BATCH_SIZE="${BATCH_SIZE:-5}"

echo "🏔️  Nepal Najar — Overnight Data Engine"
echo "============================================"
echo "Base URL: $BASE_URL"
echo "Batch size: $BATCH_SIZE"
echo "Started: $(date)"
echo ""

# Step 1: Harvest all sources
echo "📡 Step 1: Harvesting all sources..."
HARVEST=$(curl -s -X POST "$BASE_URL/api/scrape/bulk" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d '{}')

TOTAL_FOUND=$(echo "$HARVEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalArticlesFound',0))" 2>/dev/null || echo "?")
TOTAL_NEW=$(echo "$HARVEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalArticlesNew',0))" 2>/dev/null || echo "?")
TOTAL_MATCHED=$(echo "$HARVEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalArticlesMatched',0))" 2>/dev/null || echo "?")
UNPROCESSED=$(echo "$HARVEST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('unprocessedRemaining',0))" 2>/dev/null || echo "0")

echo "  Found: $TOTAL_FOUND articles across all sources"
echo "  New: $TOTAL_NEW articles (not seen before)"
echo "  Keyword matched: $TOTAL_MATCHED"
echo "  Unprocessed (need AI): $UNPROCESSED"
echo ""

# Step 2: Process articles through AI in batches
echo "🧠 Step 2: AI Analysis (Qwen via LM Studio)..."
echo "  Processing in batches of $BATCH_SIZE..."
echo ""

BATCH=0
TOTAL_ANALYZED=0
TOTAL_PROMISES=0

while true; do
  BATCH=$((BATCH + 1))
  echo "  --- Batch $BATCH ---"

  RESULT=$(curl -s -X POST "$BASE_URL/api/scrape/analyze" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json" \
    -d "{\"batchSize\": $BATCH_SIZE}")

  PROCESSED=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('processed',0))" 2>/dev/null || echo "0")
  AI_DONE=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('aiAnalyzed',0))" 2>/dev/null || echo "0")
  PROMISES=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('promisesUpdated',0))" 2>/dev/null || echo "0")
  REMAINING=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('remaining',0))" 2>/dev/null || echo "0")
  DURATION=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d.get('durationMs',0)/1000,1))" 2>/dev/null || echo "?")

  TOTAL_ANALYZED=$((TOTAL_ANALYZED + AI_DONE))
  TOTAL_PROMISES=$((TOTAL_PROMISES + PROMISES))

  echo "  Processed: $PROCESSED | AI analyzed: $AI_DONE | Promises updated: $PROMISES | Time: ${DURATION}s"
  echo "  Remaining: $REMAINING articles"

  # Show analysis details
  echo "$RESULT" | python3 -c "
import sys, json
try:
  d = json.load(sys.stdin)
  for a in d.get('analyses', []):
    pids = ','.join(a.get('promiseIds', []))
    conf = a.get('confidence', 0)
    headline = a.get('headline', '')[:60]
    print(f'    ✅ {headline}... → promises:[{pids}] conf:{conf:.2f}')
    facts = a.get('keyFacts', [])
    if facts:
      print(f'       Facts: {', '.join(facts[:3])}')
except: pass
" 2>/dev/null

  echo ""

  if [ "$REMAINING" = "0" ] || [ "$PROCESSED" = "0" ]; then
    echo "✅ All articles processed!"
    break
  fi

  # Brief pause between batches
  sleep 3
done

echo ""
echo "============================================"
echo "🏔️  Overnight scrape complete!"
echo "  Total AI analyzed: $TOTAL_ANALYZED"
echo "  Total promise updates: $TOTAL_PROMISES"
echo "  Finished: $(date)"
echo "============================================"
