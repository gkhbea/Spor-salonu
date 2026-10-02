#!/bin/bash
# FitTrack PT - Günlük Otomatik Veritabanı Yedekleme Betiği
# Kullanım: crontab -e -> 0 2 * * * /opt/fittrack-pt/deploy/scripts/backup.sh >> /var/log/fittrack_backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/fittrack}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-fittrack_postgres}"
DB_NAME="${DB_NAME:-fittrack_db}"
DB_USER="${DB_USER:-fittrack_user}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/fittrack_${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Veritabanı yedeği başlatılıyor: ${DB_NAME}..."

mkdir -p "${BACKUP_DIR}"

# Docker konteynerından pg_dump alıp gzip ile sıkıştırarak yazma
if docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ✅ Yedekleme başarıyla tamamlandı: ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ❌ HATA: Yedekleme işlemi başarısız oldu!" >&2
    exit 1
fi

# Eski yedekleri temizle (Retention kontrolü)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ${RETENTION_DAYS} günden eski yedekler temizleniyor..."
find "${BACKUP_DIR}" -type f -name "fittrack_${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Yedekleme süreci tamamlandı."
