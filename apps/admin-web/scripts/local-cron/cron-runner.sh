#!/bin/zsh
# cron-runner.sh — generic cron wrapper that hits a localhost API path.
#
# Usage:
#   cron-runner.sh <task-label> <api-path>
#
# Example:
#   cron-runner.sh sweep-full "/api/intelligence/sweep?mode=full"
#
# Reads CRON_SECRET from $HOME/Library/Application Support/nepal-republic/cron-secret
# (created by install.sh) and passes it via x-vercel-cron-secret header.
# Logs stdout+stderr to ~/Library/Logs/nepal-republic/<label>.log.
#
# Note: runs from `~/Library/Application Support/nepal-republic/` because launchd
# cannot read files in `~/Desktop/` due to macOS TCC. install.sh copies this
# script and the secret into that directory.

set -u

label="${1:?missing task label}"
api_path="${2:?missing api path}"
port="${LOCAL_CRON_PORT:-3030}"

support_dir="${HOME}/Library/Application Support/nepal-republic"
secret_file="${support_dir}/cron-secret"
log_dir="${HOME}/Library/Logs/nepal-republic"
log_file="${log_dir}/${label}.log"

mkdir -p "$log_dir"

cron_secret=""
if [[ -f "$secret_file" ]]; then
  cron_secret=$(cat "$secret_file")
fi

if [[ -z "$cron_secret" ]]; then
  echo "[$(date -Iseconds)] $label ERROR: CRON_SECRET not set in $secret_file (run install.sh)" >> "$log_file"
  exit 1
fi

ts="$(date -Iseconds)"
echo "[$ts] $label START $api_path" >> "$log_file"

# --max-time 1500 = 25 min hard ceiling.
http_code=$(curl -sS -o "/tmp/cron-runner-${label}.body" -w '%{http_code}' \
  --max-time 1500 \
  -H "x-vercel-cron-secret: ${cron_secret}" \
  -H "Authorization: Bearer ${cron_secret}" \
  "http://127.0.0.1:${port}${api_path}" 2>>"$log_file" || echo "000")

body_head=$(head -c 1000 "/tmp/cron-runner-${label}.body" 2>/dev/null || echo "")
ts_done="$(date -Iseconds)"
echo "[$ts_done] $label DONE http=${http_code} body_head=${body_head}" >> "$log_file"

case "$http_code" in
  2*) exit 0 ;;
  *)  exit 1 ;;
esac
