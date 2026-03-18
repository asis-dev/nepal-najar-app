#!/usr/bin/env bash
# Nepal Progress - Database backup script
# Usage: ./scripts/backup.sh [output_dir]
#
# Environment:
#   DATABASE_URL  - Postgres connection string (reads from .env if not set)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Load .env if DATABASE_URL is not already set ─────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="${PROJECT_ROOT}/.env"
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC2046
    export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it or create a .env file." >&2
  exit 1
fi

# ── Determine output directory ───────────────────────────────────────────
BACKUP_DIR="${1:-${PROJECT_ROOT}/backups}"
mkdir -p "$BACKUP_DIR"

# ── Create timestamped backup ────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="nepal_progress_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "Starting backup..."
echo "  Database: ${DATABASE_URL%%@*}@***"
echo "  Output:   ${FILEPATH}"

pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$FILEPATH"

# ── Report ───────────────────────────────────────────────────────────────
FILE_SIZE="$(du -h "$FILEPATH" | cut -f1)"
echo "Backup complete: ${FILEPATH} (${FILE_SIZE})"

# ── Rotate: keep last 7 backups ─────────────────────────────────────────
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name 'nepal_progress_*.sql.gz' -type f | wc -l | tr -d ' ')
if [[ "$BACKUP_COUNT" -gt 7 ]]; then
  REMOVE_COUNT=$((BACKUP_COUNT - 7))
  echo "Rotating: removing ${REMOVE_COUNT} old backup(s)..."
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/nepal_progress_*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
fi

echo "Done. ${BACKUP_COUNT} backup(s) in ${BACKUP_DIR} (max 7 kept)."
