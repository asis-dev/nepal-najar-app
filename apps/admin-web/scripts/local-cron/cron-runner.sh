#!/bin/zsh
# cron-runner.sh — generic cron wrapper that hits a localhost API path.
#
# Usage:
#   cron-runner.sh <task-label> <api-path>
#
# Example:
#   cron-runner.sh sweep-full "/api/intelligence/sweep?mode=full"
#
# Reads CRON_SECRET from .env.local and passes it via x-vercel-cron-secret header
# (the API routes accept this header for cron auth — see isCronAuthed/validateScrapeAuth).
# Logs stdout+stderr to ~/Library/Logs/nepal-republic/<label>.log.

set -u

label="${1:?missing task label}"
path="${2:?missing api path}"
port="${LOCAL_CRON_PORT:-3030}"

repo_root="/Users/priyanka.shrestha/Desktop/nepal-progress"
env_file="${repo_root}/apps/admin-web/.env.local"
log_dir="${HOME}/Library/Logs/nepal-republic"
log_file="${log_dir}/${label}.log"

mkdir -p "$log_dir"

# Extract CRON_SECRET from .env.local without leaking other secrets.
cron_secret=""
if [[ -f "$env_file" ]]; then
  cron_secret=$(grep -E '^CRON_SECRET=' "$env_file" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
fi

if [[ -z "$cron_secret" ]]; then
  echo "[$(date -Iseconds)] $label ERROR: CRON_SECRET not set in $env_file" >> "$log_file"
  exit 1
fi

ts="$(date -Iseconds)"
echo "[$ts] $label START $path" >> "$log_file"

# Hit the local server. Long timeout to allow heavy sweeps to finish.
# --max-time 1500 = 25 min hard ceiling.
http_code=$(curl -sS -o /tmp/cron-runner-${label}.body -w '%{http_code}' \
  --max-time 1500 \
  -H "x-vercel-cron-secret: ${cron_secret}" \
  -H "Authorization: Bearer ${cron_secret}" \
  "http://127.0.0.1:${port}${path}" 2>>"$log_file" || echo "000")

body_head=$(head -c 1000 /tmp/cron-runner-${label}.body 2>/dev/null || echo "")
ts_done="$(date -Iseconds)"
echo "[$ts_done] $label DONE http=${http_code} body_head=${body_head}" >> "$log_file"

# Non-2xx → exit non-zero so launchd records a failure.
case "$http_code" in
  2*) exit 0 ;;
  *)  exit 1 ;;
esac
