#!/bin/bash
# scripts/backup-sqlite.sh
# This script backs up the SQLite database and retains the 5 most recent backups.

# Configuration
# We will use docker exec to run sqlite3 .backup safely inside the container.
BACKUP_DIR="/root/backups/venezuelajuntos"
DB_PATH="/app/data/data.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Find the exact container name that matches our app (Coolify uses dynamic names)
# Our resource UUID is dos0w8k40csk8go4gswcwck4
TARGET_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E '^dos0w8k40csk8go4gswcwck4' | head -n 1)

if [ -z "$TARGET_CONTAINER" ]; then
  echo "Error: Application container not found."
  exit 1
fi

echo "Starting backup of database in container: $TARGET_CONTAINER"

# Execute the sqlite3 backup command inside the container and stream it to the host
docker exec "$TARGET_CONTAINER" sqlite3 "$DB_PATH" ".backup" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"
else
  echo "Backup failed!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Rotate backups: keep only the last 5
echo "Rotating backups (keeping last 5)..."
cd "$BACKUP_DIR" || exit 1
ls -tp | grep -v '/$' | tail -n +6 | xargs -d '\n' -r rm --

echo "Backup process completed."
