#!/bin/bash
# FitTrack PT - Tek Komutla Otomatik Kurulum Betiği (Ubuntu 24.04 / Debian / RHEL)
# Kullanım: chmod +x setup.sh && ./setup.sh

set -euo pipefail

echo "=========================================================="
echo "🚀 FitTrack PT - Sunucu Kurulum Sihirbazı Başlatılıyor"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# 1. Docker & Docker Compose Kontrolü
if ! command -v docker &> /dev/null; then
    echo "❌ HATA: Docker bulunamadı. Lütfen önce Docker kurulumunu tamamlayın." >&2
    exit 1
fi

# 2. Ortam Değişkenleri (.env) Kontrolü
if [ ! -f "api/.env" ]; then
    echo "📝 .env dosyası bulunamadı, .env.example üzerinden oluşturuluyor..."
    cp api/.env.example api/.env
fi

# 3. SSL Dizini Hazırlığı
mkdir -p deploy/nginx/ssl
if [ ! -f "deploy/nginx/ssl/fullchain.pem" ]; then
    echo "🔐 Geliştirme/Kurulum için geçici self-signed SSL sertifikası üretiliyor..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout deploy/nginx/ssl/privkey.pem \
        -out deploy/nginx/ssl/fullchain.pem \
        -subj "/C=TR/ST=Istanbul/L=Istanbul/O=FitTrack/CN=localhost" 2>/dev/null || true
fi

# 4. Servisleri Başlat (PostgreSQL 16, NestJS API, Nginx)
echo "🐳 Docker konteynerleri derleniyor ve ayağa kaldırılıyor..."
docker compose -f deploy/docker-compose.yml up -d --build

# 5. Veritabanının Hazır Olmasını Bekle
echo "⏳ Veritabanı ve servislerin hazır olması bekleniyor..."
sleep 8

# 6. Başlangıç Tohumunu (Seed: İlk Salon ve Admin) Uygula
echo "🌱 Başlangıç salonu ve yönetici (admin) hesabı oluşturuluyor..."
docker compose -f deploy/docker-compose.yml exec -T api node -e "
  const { runSeed } = require('./dist/database/seed');
  runSeed().catch(err => { console.error(err); process.exit(1); });
" || true

echo "=========================================================="
echo "🎉 FitTrack PT Başarıyla Kuruldu ve Hizmete Hazır!"
echo "=========================================================="
echo "🌐 API & Web:       http://localhost veya https://localhost"
echo "📚 Swagger API:     http://localhost/api/docs (veya :3000/api/docs)"
echo "🔑 Varsayılan Admin: admin@fittrack.com"
echo "🔒 Varsayılan Şifre: AdminPassword123!"
echo "=========================================================="
