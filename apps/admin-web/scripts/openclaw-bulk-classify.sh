#!/bin/bash
# Bulk classify signals via OpenClaw GPT 5.3
# Usage: ./scripts/openclaw-bulk-classify.sh [batch_size] [total_rounds]
set -euo pipefail

OPENCLAW="${OPENCLAW_PATH:-$HOME/.openclaw/bin/openclaw}"
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

BATCH_SIZE="${1:-20}"
MAX_ROUNDS="${2:-25}"

TOTAL_PROCESSED=0
TOTAL_RELEVANT=0

if [ ! -x "$OPENCLAW" ]; then
  echo "OpenClaw binary not found at $OPENCLAW"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SKEY" ]; then
  echo "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running."
  exit 1
fi

echo "=========================================="
echo "OpenClaw Bulk Classifier"
echo "Batch size: $BATCH_SIZE | Max rounds: $MAX_ROUNDS"
echo "=========================================="

for ROUND in $(seq 1 $MAX_ROUNDS); do
  echo ""
  echo "--- Round $ROUND/$MAX_ROUNDS ---"

  # Fetch unclassified signals
  SIGNALS_JSON=$(curl -s "$SUPABASE_URL/rest/v1/intelligence_signals?select=id,title,source_id&tier1_processed=eq.false&order=discovered_at.desc&limit=$BATCH_SIZE" \
    -H "apikey: $SKEY" \
    -H "Authorization: Bearer $SKEY")

  COUNT=$(echo "$SIGNALS_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

  if [ "$COUNT" -eq 0 ] || [ "$COUNT" = "0" ]; then
    echo "No more signals to classify. Done!"
    break
  fi

  echo "Processing $COUNT signals..."

  # Build compact signal list for OpenClaw
  SIGNAL_LIST=$(echo "$SIGNALS_JSON" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    sid = s['id'][:8]
    title = s['title'][:120].replace('|', '-')
    src = s.get('source_id', '')
    print(f'{sid}|{title}|{src}')
")

  # Build ID mapping (short → full)
  ID_MAP=$(echo "$SIGNALS_JSON" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    print(f'{s[\"id\"][:8]}={s[\"id\"]}')
")

  PROMPT="Classify these Nepal public-interest signals for Nepal Najar's dynamic government commitment tracker.

RULES:
- Government/ministry/budget/policy = ALWAYS relevant (0.4+)
- Match to the closest tracked commitment IDs when there is a clear overlap
- If a signal is government-relevant but does not clearly match an existing commitment, keep it relevant and return no IDs rather than forcing a bad match
- Health→22-23, Education→24-26, Infrastructure→12-15,17, Economy/budget→8-11
- Anti-corruption→4, Digital/tech→18-20, Agriculture→27, Tourism→32, Foreign→33, Energy→14-15
- Governance/cabinet→1-6, Election reform→30, Employment→28-29, Water/sanitation→16
- ONLY 'neutral' for entertainment, sports, celebrity gossip, weather, accidents
- Do not rely on stale political assumptions or officeholder names.

SIGNALS:
$SIGNAL_LIST

For EACH signal output ONE line:
id_prefix|classification|score|promise_ids|reasoning

Classifications: confirms, contradicts, neutral, budget_allocation, policy_change, statement
Output ONLY the lines. No headers, no explanations."

  # Call OpenClaw
  RESULT=$($OPENCLAW agent --agent main --local --timeout 120 --message "$PROMPT" 2>/dev/null || echo "OPENCLAW_ERROR")

  if [ "$RESULT" = "OPENCLAW_ERROR" ]; then
    echo "  OpenClaw failed on this batch, skipping..."
    continue
  fi

  # Parse results and write to Supabase
  echo "$RESULT" | while IFS='|' read -r SIG_PREFIX CLASSIFICATION SCORE PROMISE_IDS REASONING; do
    # Skip empty lines or headers
    [ -z "$SIG_PREFIX" ] && continue
    [[ "$SIG_PREFIX" == *"---"* ]] && continue
    [[ "$SIG_PREFIX" == *"id_"* ]] && continue

    # Clean up fields
    SIG_PREFIX=$(echo "$SIG_PREFIX" | tr -d '[:space:]')
    CLASSIFICATION=$(echo "$CLASSIFICATION" | tr -d '[:space:]')
    SCORE=$(echo "$SCORE" | tr -d '[:space:]')

    # Get full ID
    FULL_ID=$(echo "$ID_MAP" | grep "^$SIG_PREFIX=" | cut -d= -f2)
    [ -z "$FULL_ID" ] && continue

    # Validate classification
    case "$CLASSIFICATION" in
      confirms|contradicts|neutral|budget_allocation|policy_change|statement) ;;
      *) CLASSIFICATION="statement" ;;
    esac

    # Validate score
    SCORE=$(python3 -c "
try:
    s = float('$SCORE')
    print(max(0.0, min(1.0, s)))
except:
    print(0.3)
" 2>/dev/null)

    # Build promise IDs array
    PROMISE_ARRAY=$(python3 -c "
ids = '$PROMISE_IDS'.strip()
if not ids:
    print('[]')
else:
    import json
    try:
        nums = [int(x.strip()) for x in ids.split(',') if x.strip().isdigit()]
        print(json.dumps(nums))
    except:
        print('[]')
" 2>/dev/null)

    # Determine if relevant
    IS_RELEVANT=$(python3 -c "print('true' if float('$SCORE') >= 0.3 else 'false')" 2>/dev/null)

    # Write to Supabase
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      "$SUPABASE_URL/rest/v1/intelligence_signals?id=eq.$FULL_ID" \
      -X PATCH \
      -H "apikey: $SKEY" \
      -H "Authorization: Bearer $SKEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"tier1_processed\":true,\"classification\":\"$CLASSIFICATION\",\"relevance_score\":$SCORE,\"matched_promise_ids\":$PROMISE_ARRAY,\"confidence\":$SCORE}")

    if [ "$HTTP_CODE" = "204" ]; then
      echo "  ✓ $SIG_PREFIX → $CLASSIFICATION ($SCORE)"
      TOTAL_PROCESSED=$((TOTAL_PROCESSED + 1))
      if [ "$IS_RELEVANT" = "true" ]; then
        TOTAL_RELEVANT=$((TOTAL_RELEVANT + 1))
      fi
    else
      echo "  ✗ $SIG_PREFIX → DB write failed ($HTTP_CODE)"
    fi
  done

  echo "  Round $ROUND complete."
  sleep 2  # Brief pause between rounds
done

echo ""
echo "=========================================="
echo "DONE"
echo "Total processed: $TOTAL_PROCESSED"
echo "Total relevant: $TOTAL_RELEVANT"
echo "=========================================="
