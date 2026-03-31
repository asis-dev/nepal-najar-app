#!/bin/bash
# OpenClaw-powered signal classifier
# Uses GPT 5.3 via OpenClaw CLI to classify signals from Supabase
set -euo pipefail

OPENCLAW="${OPENCLAW_PATH:-$HOME/.openclaw/bin/openclaw}"
SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
BATCH_SIZE="${1:-10}"

if [ ! -x "$OPENCLAW" ]; then
  echo "OpenClaw binary not found at $OPENCLAW"
  exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SKEY" ]; then
  echo "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running."
  exit 1
fi

echo "[$(date)] Starting OpenClaw classification — batch size: $BATCH_SIZE"

# Fetch unclassified signals
SIGNALS=$(curl -s "$SUPABASE_URL/rest/v1/intelligence_signals?select=id,title,content,source_id,signal_type,published_at,author&tier1_processed=eq.false&order=discovered_at.desc&limit=$BATCH_SIZE" \
  -H "apikey: $SKEY" \
  -H "Authorization: Bearer $SKEY")

COUNT=$(echo "$SIGNALS" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")
echo "[$(date)] Found $COUNT unclassified signals"

if [ "$COUNT" -eq 0 ]; then
  echo "No signals to classify. Done."
  exit 0
fi

# Process each signal
PROCESSED=0
RELEVANT=0

echo "$SIGNALS" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    # Output one signal per line as JSON
    print(json.dumps({
        'id': s['id'],
        'title': s['title'],
        'content': (s.get('content') or '')[:1500],
        'source': s.get('source_id', ''),
        'type': s.get('signal_type', ''),
        'date': s.get('published_at', ''),
        'author': s.get('author', '')
    }))
" | while IFS= read -r SIGNAL_JSON; do
  SIG_ID=$(echo "$SIGNAL_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
  SIG_TITLE=$(echo "$SIGNAL_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['title'][:80])")

  echo -n "  Classifying: $SIG_TITLE ... "

  # Build the OpenClaw prompt
  PROMPT="You are an intelligence analyst for Nepal Republic, a dynamic government commitment tracker for Nepal.

CLASSIFICATION RULES — BE AGGRESSIVE:
- If a signal mentions ANY government activity, policy, budget, minister, ministry → relevant (score >= 0.4)
- Match to existing tracked commitment IDs only when there is a clear substantive overlap.
- If a signal is relevant to public accountability but does not clearly match a known commitment, keep it relevant and return an empty matchedPromiseIds array.
- Health/hospital → promises 22-23
- Education → promises 24-26
- Infrastructure/road/bridge/airport → promises 12-15, 17
- Economy/budget/GDP → promises 8-11
- Anti-corruption → promise 4
- Digital/tech → promises 18-20
- Agriculture → promise 27
- Tourism → promise 32
- Foreign policy → promise 33
- Election reform → promise 30
- Hydropower/energy → promises 14-15
- Governance/cabinet → promises 1-6
- DEFAULT TO RELEVANT when in doubt.
- Only use 'neutral' for entertainment, sports, celebrity gossip.
- Do not rely on stale political assumptions or officeholder names.

Analyze this signal and respond with ONLY valid JSON (no markdown, no explanation):
$SIGNAL_JSON

Reply format:
{\"isRelevant\": boolean, \"relevanceScore\": 0.0-1.0, \"matchedPromiseIds\": [numbers], \"classification\": \"confirms|contradicts|neutral|budget_allocation|policy_change|statement\", \"reasoning\": \"brief explanation\"}"

  # Call OpenClaw
  RESULT=$($OPENCLAW agent --agent main --local --json --timeout 60 --message "$PROMPT" 2>/dev/null || echo '{"error":"openclaw failed"}')

  # Extract the JSON from OpenClaw response
  CLASSIFICATION=$(echo "$RESULT" | python3 -c "
import json, sys, re

raw = sys.stdin.read().strip()

# Try to parse directly
try:
    d = json.loads(raw)
    # OpenClaw wraps in {result: ...} sometimes
    if 'result' in d:
        raw = d['result']
    elif 'message' in d:
        raw = d['message']
    elif 'isRelevant' in d:
        print(json.dumps(d))
        sys.exit(0)
except:
    pass

# Try to find JSON object in the text
match = re.search(r'\{[^{}]*\"isRelevant\"[^{}]*\}', str(raw))
if match:
    try:
        parsed = json.loads(match.group())
        print(json.dumps(parsed))
        sys.exit(0)
    except:
        pass

# Fallback
print(json.dumps({'isRelevant': False, 'relevanceScore': 0, 'matchedPromiseIds': [], 'classification': 'neutral', 'reasoning': 'Failed to parse OpenClaw response'}))
" 2>/dev/null)

  # Parse classification result
  IS_RELEVANT=$(echo "$CLASSIFICATION" | python3 -c "import json,sys; d=json.load(sys.stdin); print('true' if d.get('isRelevant') else 'false')")
  SCORE=$(echo "$CLASSIFICATION" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('relevanceScore', 0))")
  CLASS=$(echo "$CLASSIFICATION" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('classification', 'neutral'))")
  PROMISE_IDS=$(echo "$CLASSIFICATION" | python3 -c "import json,sys; d=json.load(sys.stdin); ids=d.get('matchedPromiseIds',[]); print(json.dumps(ids))")
  REASONING=$(echo "$CLASSIFICATION" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('reasoning','')[:500])")

  echo "$CLASS (score: $SCORE)"

  # Write back to Supabase
  UPDATE_BODY=$(python3 -c "
import json
print(json.dumps({
    'tier1_processed': True,
    'classification': '$CLASS',
    'relevance_score': float('$SCORE'),
    'matched_promise_ids': json.loads('$PROMISE_IDS'),
    'reasoning': '''$REASONING''',
    'confidence': float('$SCORE'),
    'review_required': float('$SCORE') >= 0.3 and float('$SCORE') < 0.7
}))
")

  curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/intelligence_signals?id=eq.$SIG_ID" \
    -X PATCH \
    -H "apikey: $SKEY" \
    -H "Authorization: Bearer $SKEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$UPDATE_BODY" > /dev/null

  PROCESSED=$((PROCESSED + 1))
  if [ "$IS_RELEVANT" = "true" ]; then
    RELEVANT=$((RELEVANT + 1))
  fi

done

echo ""
echo "[$(date)] Done. Processed: $PROCESSED, Relevant: $RELEVANT"
