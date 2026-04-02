#!/bin/bash
# Bulk classify signals via OpenAI GPT-4.1-nano
# Usage: ./scripts/openai-bulk-classify.sh [batch_size] [total_rounds]
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"

BATCH_SIZE="${1:-20}"
MAX_ROUNDS="${2:-100}"

if [ -z "$OPENAI_KEY" ]; then
  echo "Set OPENAI_API_KEY before running."
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SKEY" ]; then
  echo "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running."
  exit 1
fi

echo "=========================================="
echo "OpenAI GPT-4.1-nano Bulk Classifier"
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

  # Build compact signal list and ID mapping via python
  SIGNAL_LIST=$(echo "$SIGNALS_JSON" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    sid = s['id'][:8]
    title = (s['title'] or '')[:120].replace('|', '-').replace('\"', '')
    src = s.get('source_id', '')
    print(f'{sid}|{title}|{src}')
")

  ID_MAP=$(echo "$SIGNALS_JSON" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    print(f'{s[\"id\"][:8]}={s[\"id\"]}')
")

  # Call OpenAI via python (avoids all bash quoting issues)
  export SIGNAL_LIST
  CONTENT=$(OPENAI_KEY="$OPENAI_KEY" python3 << 'PYEOF'
import json, os, sys, urllib.request

signal_list = os.environ.get("SIGNAL_LIST", "")
api_key = os.environ.get("OPENAI_KEY", "")

prompt = f"""Classify these Nepal public-interest signals for Nepal Republic's government commitment tracker.

RULES:
- Government/ministry/budget/policy = ALWAYS relevant (0.4+)
- Match to the closest tracked commitment IDs when there is a clear overlap
- If government-relevant but no clear match, keep relevant and return no IDs
- Health->22-23, Education->24-26, Infrastructure->12-15,17, Economy/budget->8-11
- Anti-corruption->4, Digital/tech->18-20, Agriculture->27, Tourism->32, Foreign->33, Energy->14-15
- Governance/cabinet->1-6, Election reform->30, Employment->28-29, Water/sanitation->16
- ONLY neutral for entertainment, sports, celebrity gossip, weather, accidents

SIGNALS:
{signal_list}

For EACH signal output ONE line:
id_prefix|classification|score|promise_ids|reasoning

Classifications: confirms, contradicts, neutral, budget_allocation, policy_change, statement
Output ONLY the lines. No headers, no explanations."""

payload = json.dumps({
    "model": "gpt-4.1-nano",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.2,
    "max_tokens": 2000
}).encode()

req = urllib.request.Request(
    "https://api.openai.com/v1/chat/completions",
    data=payload,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
)
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
        if "choices" in data and len(data["choices"]) > 0:
            print(data["choices"][0]["message"]["content"])
        else:
            print("OPENAI_ERROR: no choices")
except Exception as e:
    print(f"OPENAI_ERROR: {e}")
PYEOF
  )

  if [[ "$CONTENT" == OPENAI_ERROR* ]]; then
    echo "  OpenAI failed: $CONTENT"
    sleep 5
    continue
  fi

  # Parse results and write to Supabase
  echo "$CONTENT" | while IFS='|' read -r SIG_PREFIX CLASSIFICATION SCORE PROMISE_IDS REASONING; do
    [ -z "$SIG_PREFIX" ] && continue
    [[ "$SIG_PREFIX" == *"---"* ]] && continue
    [[ "$SIG_PREFIX" == *"id_"* ]] && continue
    [[ "$SIG_PREFIX" == *'```'* ]] && continue

    SIG_PREFIX=$(echo "$SIG_PREFIX" | tr -d '[:space:]')
    CLASSIFICATION=$(echo "$CLASSIFICATION" | tr -d '[:space:]')
    SCORE=$(echo "$SCORE" | tr -d '[:space:]')

    FULL_ID=$(echo "$ID_MAP" | grep "^$SIG_PREFIX=" | cut -d= -f2)
    [ -z "$FULL_ID" ] && continue

    case "$CLASSIFICATION" in
      confirms|contradicts|neutral|budget_allocation|policy_change|statement) ;;
      *) CLASSIFICATION="statement" ;;
    esac

    SCORE=$(python3 -c "
try:
    s = float('$SCORE')
    print(max(0.0, min(1.0, s)))
except:
    print(0.3)
" 2>/dev/null)

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
    else
      echo "  ✗ $SIG_PREFIX → DB write failed ($HTTP_CODE)"
    fi
  done

  echo "  Round $ROUND complete."
  sleep 3
done

echo ""
echo "=========================================="
echo "DONE"
echo "=========================================="
