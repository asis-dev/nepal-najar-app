#!/usr/bin/env python3
"""
Cleanup non-corruption cases from corruption_cases table.
Uses OpenAI GPT-4.1-nano to classify whether each case is actually corruption.
Deletes non-corruption cases (cascade handles related tables).
"""

import json
import os
import urllib.request
import urllib.parse
import ssl

# ── Config ──────────────────────────────────────────────────────────────
SUPABASE_URL = "https://kmyftbmtdabuyfampklz.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Allow unverified SSL for local dev if needed
ctx = ssl.create_default_context()

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


def supabase_get(table, params=""):
    """GET from Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url, headers=HEADERS_SB)
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


def supabase_delete(table, filter_param):
    """DELETE from Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_param}"
    req = urllib.request.Request(url, headers=HEADERS_SB, method="DELETE")
    with urllib.request.urlopen(req, context=ctx) as resp:
        return resp.status


def openai_classify(titles_with_ids, batch_size=40):
    """
    Send batches of titles to OpenAI and get YES/NO classification.
    Returns dict of {id: bool} where True = is corruption, False = not corruption.
    """
    results = {}

    for i in range(0, len(titles_with_ids), batch_size):
        batch = titles_with_ids[i : i + batch_size]

        numbered = "\n".join(
            f"{j+1}. [{item['id']}] {item['title']} (type: {item['corruption_type']})"
            for j, item in enumerate(batch)
        )

        prompt = f"""You are reviewing a database of corruption cases in Nepal. For each case below, determine if it is ACTUALLY about corruption (bribery, embezzlement, fraud, nepotism, money laundering, kickbacks, abuse of authority for personal gain, land grabs, procurement fraud, tax evasion, etc).

Cases that are NOT corruption include:
- General protests or demonstrations (unless specifically about corruption)
- Elections, voting, political campaigns
- Policy announcements or government reforms (unless they involve corrupt acts)
- Customs/trade system implementations
- General crime (murder, theft) unless involving officials abusing power
- Natural disasters, infrastructure projects (unless involving fraud/embezzlement)
- General political news, appointments, resignations (unless involving corrupt motives)
- Budget announcements, economic policy
- Labor disputes, strikes
- Diplomatic relations, foreign aid (unless involving misuse of funds)

For each case, respond with ONLY the ID and YES (is corruption) or NO (not corruption), one per line.
Format: [ID] YES or [ID] NO

Cases:
{numbered}"""

        body = json.dumps({
            "model": "gpt-4.1-nano",
            "messages": [
                {"role": "system", "content": "You classify whether news items are about corruption. Be strict - only YES for actual corruption, fraud, embezzlement, bribery, nepotism, abuse of authority for personal gain."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0,
            "max_tokens": 4000,
        })

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=body.encode(),
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
        )

        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read())

        content = data["choices"][0]["message"]["content"]
        print(f"\n--- Batch {i // batch_size + 1} OpenAI response ---")
        print(content)
        print("---")

        # Parse response
        for line in content.strip().split("\n"):
            line = line.strip()
            if not line:
                continue
            # Extract ID between brackets and YES/NO
            if "[" in line and "]" in line:
                id_part = line.split("[")[1].split("]")[0].strip()
                answer = line.split("]")[1].strip().upper()
                is_corruption = answer.startswith("YES")
                results[id_part] = is_corruption

        print(f"  Classified {len(batch)} cases in this batch")

    return results


def main():
    print("=" * 60)
    print("CORRUPTION CASES CLEANUP")
    print("=" * 60)

    # 1. Fetch all cases
    print("\nFetching all corruption_cases...")
    cases = supabase_get("corruption_cases", "select=id,title,corruption_type,summary&order=created_at.asc&limit=1000")
    print(f"Total cases: {len(cases)}")

    # Show breakdown by type
    type_counts = {}
    for c in cases:
        t = c.get("corruption_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    print("\nBreakdown by type:")
    for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

    # 2. Classify all cases with OpenAI
    print("\nClassifying cases with GPT-4.1-nano...")
    titles_with_ids = [
        {"id": c["id"], "title": c["title"], "corruption_type": c.get("corruption_type", "")}
        for c in cases
    ]
    classifications = openai_classify(titles_with_ids)

    # 3. Identify non-corruption cases
    to_delete = []
    to_keep = []
    unclassified = []

    for c in cases:
        cid = c["id"]
        if cid in classifications:
            if classifications[cid]:
                to_keep.append(c)
            else:
                to_delete.append(c)
        else:
            unclassified.append(c)
            to_keep.append(c)  # Keep if unclassified (safe default)

    print(f"\n{'=' * 60}")
    print(f"CLASSIFICATION RESULTS")
    print(f"{'=' * 60}")
    print(f"  KEEP (is corruption):     {len(to_keep)}")
    print(f"  DELETE (not corruption):   {len(to_delete)}")
    print(f"  Unclassified (keeping):    {len(unclassified)}")

    if to_delete:
        print(f"\n--- Cases to DELETE ---")
        for c in to_delete:
            print(f"  [{c['corruption_type']}] {c['title']}")

    if not to_delete:
        print("\nNo cases to delete. Done!")
        return

    # 4. Delete non-corruption cases
    # Foreign keys have ON DELETE CASCADE, so deleting from corruption_cases
    # will automatically clean up corruption_case_entities, corruption_evidence,
    # corruption_money_flows, and corruption_timeline_events.
    print(f"\nDeleting {len(to_delete)} non-corruption cases (cascade will handle related rows)...")

    deleted_count = 0
    for c in to_delete:
        cid = c["id"]
        try:
            # URL-encode the filter
            filter_param = f"id=eq.{cid}"
            status = supabase_delete("corruption_cases", filter_param)
            deleted_count += 1
            print(f"  Deleted: {c['title'][:80]}")
        except Exception as e:
            print(f"  ERROR deleting {c['title'][:60]}: {e}")

    print(f"\n{'=' * 60}")
    print(f"CLEANUP COMPLETE")
    print(f"{'=' * 60}")
    print(f"  Deleted: {deleted_count} non-corruption cases")
    print(f"  Kept:    {len(to_keep)} corruption cases")
    print(f"  Total remaining: {len(cases) - deleted_count}")


if __name__ == "__main__":
    main()
