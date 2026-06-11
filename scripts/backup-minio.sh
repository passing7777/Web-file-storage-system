#!/bin/bash

BACKUP_DIR="/backup/minio"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/minio_backup_$DATE.tar.gz"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "Starting MinIO backup at $(date)"

tar -czf $BACKUP_FILE -C /data .

if [ $? -eq 0 ]; then
    echo "MinIO backup completed successfully: $BACKUP_FILE"
    
    find $BACKUP_DIR -name "minio_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned up (older than $RETENTION_DAYS days)"
else
    echo "MinIO backup failed!"
    exit 1
fi