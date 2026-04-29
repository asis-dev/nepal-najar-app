#!/bin/zsh
# install.sh — install Nepal Republic local-cron plists into ~/Library/LaunchAgents.
#
# launchd jobs cannot read files in ~/Desktop due to macOS TCC, so we copy
# cron-runner.sh and a small cron-secret file into a TCC-allowed location:
#   ~/Library/Application Support/nepal-republic/
#
# Run once. After this:
#   - `next start` runs continuously on port 3030 (com.nepalrepublic.next-server)
#   - cron plists hit it on schedule (sweep / worker / daily-brief / daily-brief-audio)
#
# Re-run any time after editing a plist or the runner — it reloads each one.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
plists_dir="${here}/plists"
target_dir="${HOME}/Library/LaunchAgents"
log_dir="${HOME}/Library/Logs/nepal-republic"
support_dir="${HOME}/Library/Application Support/nepal-republic"
env_file="$(cd "${here}/../.." && pwd)/.env.local"

mkdir -p "$target_dir" "$log_dir" "$support_dir"

# 1. Copy cron-runner.sh into a TCC-allowed location.
cp "${here}/cron-runner.sh" "${support_dir}/cron-runner.sh"
chmod +x "${support_dir}/cron-runner.sh"
echo "Copied cron-runner.sh to ${support_dir}"

# 2. Extract CRON_SECRET from .env.local and write it to a private file.
if [[ ! -f "$env_file" ]]; then
  echo "ERROR: .env.local not found at $env_file"
  exit 1
fi
cron_secret=$(grep -E '^CRON_SECRET=' "$env_file" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
if [[ -z "$cron_secret" ]]; then
  echo "ERROR: CRON_SECRET not set in $env_file"
  exit 1
fi
secret_file="${support_dir}/cron-secret"
printf "%s" "$cron_secret" > "$secret_file"
chmod 600 "$secret_file"
echo "Wrote CRON_SECRET to ${secret_file} (mode 600)"

# 3. Install plists.
echo
echo "Installing plists to $target_dir"
for plist in "$plists_dir"/*.plist; do
  label=$(basename "$plist" .plist)
  dest="${target_dir}/${label}.plist"

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
