#!/usr/bin/env bash
# Restore an encrypted backup into a database (DESTRUCTIVE for the target):
#   DATABASE_URL=... BACKUP_PASSPHRASE=... scripts/restore-db.sh papote-XXXX.dump.enc
set -euo pipefail
FILE="${1:?usage: restore-db.sh <backup.dump.enc>}"
: "${DATABASE_URL:?DATABASE_URL (target database) is required}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is required}"
read -r -p "Restore $FILE into the target database (existing objects will be replaced)? Type yes: " ok
[ "$ok" = "yes" ] || { echo "Aborted."; exit 1; }
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$FILE" \
  | pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL"
echo "Restore finished."
