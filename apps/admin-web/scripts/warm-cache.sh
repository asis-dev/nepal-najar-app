#!/bin/bash
# Warm critical API caches after deploy so no user hits a cold start.
# Usage: ./scripts/warm-cache.sh

BASE="https://www.nepalrepublic.org"
echo "Warming caches for $BASE..."

# Fire all requests in parallel
curl -sL -o /dev/null -w "ministers:     %{time_total}s\n" "$BASE/api/ministers?days=7" &
curl -sL -o /dev/null -w "daily-brief:  %{time_total}s\n" "$BASE/api/daily-brief" &
curl -sL -o /dev/null -w "trending:     %{time_total}s\n" "$BASE/api/trending" &
curl -sL -o /dev/null -w "complaints:   %{time_total}s\n" "$BASE/api/complaints?limit=1" &

wait
echo "Cache warming complete."
