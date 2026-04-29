#!/bin/zsh
# install.sh — install Nepal Republic local-cron plists into ~/Library/LaunchAgents.
#
# Run once. After this:
#   - `next start` runs continuously on port 3000 (com.nepalrepublic.next-server)
#   - cron plists hit it on schedule (sweep / worker / daily-brief / daily-brief-audio)
#
# Re-run any time after editing a plist — it reloads each one.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
plists_dir="${here}/plists"
target_dir="${HOME}/Library/LaunchAgents"
log_dir="${HOME}/Library/Logs/nepal-republic"

mkdir -p "$target_dir" "$log_dir"

echo "Installing plists to $target_dir"

for plist in "$plists_dir"/*.plist; do
  label=$(basename "$plist" .plist)
  dest="${target_dir}/${label}.plist"

  # Unload first if already loaded (ignore errors — may not be loaded)
  launchctl unload "$dest" 2>/dev/null || true

  cp "$plist" "$dest"
  launchctl load "$dest"
  echo "  loaded: ${label}"
done

echo
echo "Installed. Tail logs with:"
echo "  tail -f $log_dir/*.log"
echo
echo "List loaded jobs:"
echo "  launchctl list | grep nepalrepublic"
echo
echo "Run a task manually (one-off):"
echo "  launchctl start com.nepalrepublic.cron-sweep"
