#!/usr/bin/env bash
# Manual encrypted backup:  DATABASE_URL=... BACKUP_PASSPHRASE=... scripts/backup-db.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required (Render → database → External Database URL)}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
OUT="papote-$(date -u +%Y-%m-%dT%H%MZ).dump.enc"
pg_dump "$DATABASE_URL" --no-owner --no-privileges --format=custom \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE > "$OUT"
echo "Backup written: $OUT"
