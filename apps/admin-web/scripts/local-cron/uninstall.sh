#!/bin/zsh
# uninstall.sh — unload and remove Nepal Republic local-cron plists.

set -euo pipefail

target_dir="${HOME}/Library/LaunchAgents"

for label in \
  com.nepalrepublic.next-server \
  com.nepalrepublic.cron-sweep \
  com.nepalrepublic.cron-worker \
  com.nepalrepublic.cron-daily-brief \
  com.nepalrepublic.cron-daily-brief-audio
do
  dest="${target_dir}/${label}.plist"
  if [[ -f "$dest" ]]; then
    launchctl unload "$dest" 2>/dev/null || true
    rm -f "$dest"
    echo "  removed: ${label}"
  fi
done

echo "Uninstalled."
