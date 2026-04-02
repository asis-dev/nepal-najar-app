#!/bin/bash
# Extract corruption cases from intelligence signals using GPT-4.1-nano
# Posts structured cases to the corruption API
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
SKEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
OPENAI_KEY="${OPENAI_API_KEY:-}"
SCRAPE_SECRET="${SCRAPE_SECRET:-}"

BATCH_SIZE="${1:-50}"
MAX_ROUNDS="${2:-200}"
OFFSET=0

if [ -z "$OPENAI_KEY" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SKEY" ]; then
  echo "Set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "=========================================="
echo "Corruption Case Extractor"
echo "Batch: $BATCH_SIZE | Max rounds: $MAX_ROUNDS"
echo "=========================================="

# Track cases we've already created (by slug) to avoid duplicates
CREATED_SLUGS=""
TOTAL_CASES=0
TOTAL_SKIPPED=0

for ROUND in $(seq 1 $MAX_ROUNDS); do
  echo ""
  echo "--- Round $ROUND/$MAX_ROUNDS (offset $OFFSET) ---"

  # Fetch corruption-sweep signals (Nepal-specific only)
  SIGNALS_JSON=$(curl -s "$SUPABASE_URL/rest/v1/intelligence_signals?select=id,title,content,url&source_id=eq.corruption-sweep&order=discovered_at.desc&limit=$BATCH_SIZE&offset=$OFFSET" \
    -H "apikey: $SKEY" \
    -H "Authorization: Bearer $SKEY")

  COUNT=$(echo "$SIGNALS_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")

  if [ "$COUNT" -eq 0 ]; then
    echo "No more signals. Done!"
    break
  fi

  echo "  Scanning $COUNT signals for corruption cases..."
  OFFSET=$((OFFSET + BATCH_SIZE))

  # Build signal text for AI
  SIGNAL_TEXT=$(echo "$SIGNALS_JSON" | python3 -c "
import json, sys
signals = json.load(sys.stdin)
for s in signals:
    title = (s.get('title') or '')[:200].replace('\"','')
    content = (s.get('content') or '')[:300].replace('\"','')
    url = s.get('url') or ''
    sid = s['id'][:8]
    print(f'{sid} | {title} | {content} | {url}')
")

  # Call GPT-4.1-nano to extract corruption cases
  export SIGNAL_TEXT
  RESULT=$(OPENAI_KEY="$OPENAI_KEY" python3 << 'PYEOF'
import json, os, sys, urllib.request

signal_text = os.environ.get("SIGNAL_TEXT", "")
api_key = os.environ.get("OPENAI_KEY", "")

prompt = f"""You are analyzing Nepal news signals to identify DISTINCT corruption cases.

SIGNALS:
{signal_text}

TASK: Identify corruption cases about NEPAL ONLY. Ignore India, Pakistan, other countries.
For each DISTINCT case found, output a JSON object on one line.

RULES:
- Only real, specific corruption cases with named people/organizations in NEPAL
- Group related signals into ONE case (e.g. multiple articles about same scandal = 1 case)
- corruption_type must be one of: bribery, embezzlement, nepotism, money_laundering, land_grab, procurement_fraud, tax_evasion, abuse_of_authority, kickback, other
- status must be one of: alleged, under_investigation, charged, trial, convicted, acquitted, asset_recovery, closed
- severity: minor (<10M NPR), major (10M-1B NPR), mega (>1B NPR)
- If no Nepal corruption cases found, output: NONE
- Output ONLY JSON lines, no other text

FORMAT (one JSON per line):
{{"title":"Case Title","corruption_type":"embezzlement","status":"under_investigation","severity":"major","estimated_amount_npr":50000000,"summary":"2-3 sentence summary of what happened","entities":[{{"name":"Person Name","entity_type":"politician","role":"accused","title":"Minister of X","party_affiliation":"Party"}}],"evidence_urls":["url1"],"tags":["keyword1"]}}"""

payload = json.dumps({
    "model": "gpt-4.1-nano",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.1,
    "max_tokens": 3000
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
            print("ERROR: no choices")
except Exception as e:
    print(f"ERROR: {e}")
PYEOF
  )

  if [[ "$RESULT" == ERROR* ]] || [[ "$RESULT" == "NONE" ]]; then
    echo "  No Nepal corruption cases in this batch."
    sleep 1
    continue
  fi

  # Parse each JSON line and POST to corruption API
  while IFS= read -r line; do
    # Skip empty or non-JSON lines
    [[ -z "$line" ]] && continue
    [[ "$line" != "{"* ]] && continue

    # Validate and extract slug
    SLUG=$(echo "$line" | python3 -c "
import json, sys, re
try:
    d = json.load(sys.stdin)
    slug = re.sub(r'[^a-z0-9]+', '-', d.get('title','').lower()).strip('-')[:80]
    print(slug)
except:
    print('INVALID')
" 2>/dev/null || echo "INVALID")

    if [ "$SLUG" = "INVALID" ] || [ -z "$SLUG" ]; then
      continue
    fi

    # Skip if already created this session
    if echo "$CREATED_SLUGS" | grep -q "$SLUG"; then
      TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
      continue
    fi

    # Check if case already exists in DB
    EXISTS=$(curl -s "$SUPABASE_URL/rest/v1/corruption_cases?select=id&slug=eq.$SLUG&limit=1" \
      -H "apikey: $SKEY" \
      -H "Authorization: Bearer $SKEY" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [ "$EXISTS" != "0" ]; then
      echo "  ⊘ Already exists: $SLUG"
      CREATED_SLUGS="$CREATED_SLUGS $SLUG"
      TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
      continue
    fi

    # Build POST body with entities and evidence
    POST_BODY=$(echo "$line" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', d.get('title','').lower()).strip('-')[:80]

    body = {
        'title': d['title'],
        'slug': slug,
        'corruption_type': d.get('corruption_type', 'other'),
        'status': d.get('status', 'alleged'),
        'severity': d.get('severity'),
        'summary': d.get('summary', ''),
        'estimated_amount_npr': d.get('estimated_amount_npr'),
        'tags': d.get('tags', []),
        'entities': [],
        'evidence': [],
    }

    for e in d.get('entities', []):
        body['entities'].append({
            'name': e.get('name', ''),
            'entity_type': e.get('entity_type', 'person'),
            'role': e.get('role', 'accused'),
            'title': e.get('title'),
            'party_affiliation': e.get('party_affiliation'),
        })

    for url in d.get('evidence_urls', []):
        body['evidence'].append({
            'evidence_type': 'news_article',
            'url': url,
            'source_name': 'News',
            'reliability': 'medium',
        })

    print(json.dumps(body))
except Exception as ex:
    print(json.dumps({'error': str(ex)}))
" 2>/dev/null)

    if echo "$POST_BODY" | grep -q '"error"'; then
      continue
    fi

    # POST to corruption cases API
    RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/corruption_cases" \
      -H "apikey: $SKEY" \
      -H "Authorization: Bearer $SKEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "$(echo "$POST_BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
row = {
    'slug': d['slug'],
    'title': d['title'],
    'corruption_type': d['corruption_type'],
    'status': d['status'],
    'severity': d.get('severity'),
    'summary': d.get('summary'),
    'estimated_amount_npr': d.get('estimated_amount_npr'),
    'source_quality': 'reported',
    'tags': d.get('tags', []),
}
cleaned = dict((k,v) for k,v in row.items() if v is not None)
print(json.dumps(cleaned))
")")

    # Check if insert succeeded
    CASE_ID=$(echo "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    if isinstance(d, list) and len(d) > 0:
        print(d[0].get('id',''))
    elif isinstance(d, dict) and d.get('id'):
        print(d['id'])
    else:
        print('')
except:
    print('')
" 2>/dev/null)

    if [ -n "$CASE_ID" ] && [ "$CASE_ID" != "" ]; then
      TITLE=$(echo "$line" | python3 -c "import json,sys; print(json.load(sys.stdin).get('title','')[:60])" 2>/dev/null)
      echo "  ✓ Created: $TITLE"
      TOTAL_CASES=$((TOTAL_CASES + 1))
      CREATED_SLUGS="$CREATED_SLUGS $SLUG"

      # Now insert entities
      echo "$POST_BODY" | python3 -c "
import json, sys, urllib.request, os
d = json.load(sys.stdin)
skey = os.environ.get('SKEY','')
url = os.environ.get('SUPABASE_URL','')
case_id = '$CASE_ID'

for e in d.get('entities', []):
    import re
    eslug = re.sub(r'[^a-z0-9]+', '-', e['name'].lower()).strip('-')[:80]
    if not eslug: continue

    # Check if entity exists
    check = urllib.request.urlopen(urllib.request.Request(
        f'{url}/rest/v1/corruption_entities?select=id&slug=eq.{eslug}&limit=1',
        headers={'apikey': skey, 'Authorization': f'Bearer {skey}'}
    )).read()
    existing = json.loads(check)

    if existing and len(existing) > 0:
        eid = existing[0]['id']
    else:
        ebody = json.dumps({
            'slug': eslug,
            'name': e['name'],
            'entity_type': e.get('entity_type','person'),
            'title': e.get('title'),
            'party_affiliation': e.get('party_affiliation'),
        })
        req = urllib.request.Request(
            f'{url}/rest/v1/corruption_entities',
            data=ebody.encode(),
            headers={'apikey': skey, 'Authorization': f'Bearer {skey}', 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
        )
        resp = json.loads(urllib.request.urlopen(req).read())
        if isinstance(resp, list) and len(resp) > 0:
            eid = resp[0]['id']
        else:
            continue

    # Link entity to case
    link = json.dumps({'case_id': case_id, 'entity_id': eid, 'role': e.get('role','accused')})
    urllib.request.urlopen(urllib.request.Request(
        f'{url}/rest/v1/corruption_case_entities',
        data=link.encode(),
        headers={'apikey': skey, 'Authorization': f'Bearer {skey}', 'Content-Type': 'application/json'}
    ))
" 2>/dev/null && echo "    + entities linked" || echo "    (entity linking skipped)"

      # Insert evidence
      echo "$POST_BODY" | python3 -c "
import json, sys, urllib.request, os
d = json.load(sys.stdin)
skey = os.environ.get('SKEY','')
url = os.environ.get('SUPABASE_URL','')
case_id = '$CASE_ID'

for ev in d.get('evidence', []):
    ebody = json.dumps({
        'case_id': case_id,
        'evidence_type': ev.get('evidence_type','news_article'),
        'url': ev.get('url'),
        'source_name': ev.get('source_name','News'),
        'reliability': ev.get('reliability','medium'),
    })
    urllib.request.urlopen(urllib.request.Request(
        f'{url}/rest/v1/corruption_evidence',
        data=ebody.encode(),
        headers={'apikey': skey, 'Authorization': f'Bearer {skey}', 'Content-Type': 'application/json'}
    ))
" 2>/dev/null && echo "    + evidence added" || echo "    (evidence skipped)"

    else
      DUP_CHECK=$(echo "$RESPONSE" | grep -c "duplicate" 2>/dev/null || echo "0")
      if [ "$DUP_CHECK" != "0" ]; then
        echo "  ⊘ Duplicate: $SLUG"
        TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
      else
        echo "  ✗ Failed: $SLUG"
        echo "    $RESPONSE" | head -c 200
        echo ""
      fi
    fi

  done <<< "$RESULT"

  echo "  Round $ROUND done. Cases so far: $TOTAL_CASES (skipped: $TOTAL_SKIPPED)"
  sleep 2
done

echo ""
echo "=========================================="
echo "COMPLETE"
echo "Total cases created: $TOTAL_CASES"
echo "Total skipped/duplicates: $TOTAL_SKIPPED"
echo "=========================================="
