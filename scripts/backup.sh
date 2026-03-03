#!/bin/bash
# =========================================================================
# MenuHorse - Database Backup Script (Phase 2)
# =========================================================================
# This script connects to the Supabase PostgreSQL database and dumps the 
# entire schema and data for disaster recovery. 
#
# Requirements:
# 1. Ensure `pg_dump` is installed.
# 2. Set the DATABASE_URL environment variable or replace it below.
#
# Usage (Cron job recommended):
# 0 2 * * * /path/to/menuhorse-mvp/scripts/backup.sh
# =========================================================================

# Ensure database URL is provided
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  echo "Please set it using: export DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'"
  exit 1
fi

# Create backups directory if it doesn't exist
BACKUP_DIR="$(pwd)/db_backups"
mkdir -p "$BACKUP_DIR"

# Generate filename with current date
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="menuhorse_backup_$DATE.sql"
BACKUP_PATH="$BACKUP_DIR/$FILENAME"

echo "Starting database backup to $BACKUP_PATH..."

# Execute pg_dump (or supabase db dump if using Supabase CLI locally)
# Using standard pg_dump for maximum compatibility across environments
pg_dump "$DATABASE_URL" --schema=public --clean --if-exists > "$BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed successfully: $BACKUP_PATH"
  
  # Optional: Compress the backup
  gzip "$BACKUP_PATH"
  echo "📦 Backup compressed: $BACKUP_PATH.gz"
  
  # Optional: Delete backups older than 30 days
  find "$BACKUP_DIR" -name "menuhorse_backup_*.sql.gz" -mtime +30 -delete
  echo "🧹 Cleaned up backups older than 30 days."
else
  echo "❌ Backup failed!"
  exit 1
fi
