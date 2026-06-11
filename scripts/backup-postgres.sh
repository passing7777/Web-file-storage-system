#!/bin/bash

BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/postgres_backup_$DATE.sql.gz"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "Starting PostgreSQL backup at $(date)"

pg_dump -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "PostgreSQL backup completed successfully: $BACKUP_FILE"
    
    find $BACKUP_DIR -name "postgres_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned up (older than $RETENTION_DAYS days)"
else
    echo "PostgreSQL backup failed!"
    exit 1
fi