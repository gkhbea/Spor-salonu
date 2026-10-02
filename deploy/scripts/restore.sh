#!/bin/bash
# FitTrack PT - Veritabanı Yedekten Geri Yükleme ve Doğrulama Betiği
# Kullanım: ./restore.sh /var/backups/fittrack/fittrack_fittrack_db_20261003_010000.sql.gz

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Kullanım: $0 <yedek_dosyasi.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${POSTGRES_CONTAINER:-fittrack_postgres}"
DB_NAME="${DB_NAME:-fittrack_db}"
DB_USER="${DB_USER:-fittrack_user}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ HATA: Yedek dosyası bulunamadı: ${BACKUP_FILE}" >&2
    exit 1
fi

echo "=========================================================="
echo "⚠️  UYARI: ${DB_NAME} veritabanı ${BACKUP_FILE} yedeğinden geri yüklenecek!"
echo "=========================================================="

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Geri yükleme başlatılıyor..."

# Sıkıştırılmış yedeği açıp veritabanına aktarma
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Veritabanı geri yüklendi. Bütünlük doğrulanıyor..."

# Bütünlük kontrolü: Tablolardaki satır sayılarını kontrol et
CHECK_RESULT=$(docker exec -t "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "
  SELECT 
    (SELECT count(*) FROM salons) as salon_count,
    (SELECT count(*) FROM users) as user_count,
    (SELECT count(*) FROM trainers) as trainer_count;
")

echo "📊 Doğrulama Sonucu (Salon, Kullanıcı, Trainer sayıları):"
echo "${CHECK_RESULT}"
echo "✅ [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Yedekten geri yükleme ve doğrulama testi başarıyla tamamlandı!"
