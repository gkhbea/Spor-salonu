# FitTrack PT - Personal Trainer ve Salon Yönetim Sistemi

FitTrack PT, spor salonları ve kişisel antrenörler (PT) için üye seans haklarını, randevuları, antrenman kayıtlarını ve sporcu gelişimini tek merkezden yöneten kurumsal bir yazılımdır.

---

## 🏗 Mimari ve Teknoloji Yığını

- **Backend**: Node.js + NestJS (TypeScript), PostgreSQL 16
- **İstemci (Client)**: Flutter Cross-Platform (Windows `.exe`, Android, iOS)
- **Güvenlik & Auth**: Argon2id parola hashleme, JWT Access (15m) + Dönen Refresh Token (7d), Role-Based Access Control (RBAC)
- **Çoklu Şube & İzolasyon**: Her tabloda zorunlu `salon_id` (Tenant Isolation)
- **Zaman Dilimi**: Veritabanında ve transferde kesinlikle UTC, arayüzde `Europe/Istanbul`
- **Veri Bütünlüğü**: Soft-delete (`deleted_at`), Para değerleri `numeric(10,2)`, Kritik hareketler `audit_logs` tablosunda
- **Dağıtım**: Docker Compose, Ubuntu 24.04 LTS, Nginx + SSL, Otomatik Günlük Yedekleme

---

## 📁 Proje Dizin Yapısı

```text
fittrack-pt/
├── api/                           # NestJS Backend REST API
│   ├── src/
│   │   ├── common/                # RBAC Guards, Tenant Decorators, Exception Filters
│   │   ├── config/                # .env yükleyici ve konfigürasyon doğrulaması
│   │   ├── database/              # fittrack_schema.sql, Seed, Migration, Connection Pool
│   │   └── modules/
│   │       ├── auth/              # Login, Refresh, Logout, /me
│   │       ├── trainers/          # Admin-only sınırsız PT yönetimi (transactional)
│   │       └── audit-logs/        # Denetim izi servisi
│   ├── test/                      # Birim ve E2E Kabul Kriterleri testleri
│   ├── Dockerfile                 # Multi-stage üretim Docker imajı
│   └── package.json
│
├── app/                           # Flutter Çapraz Platform İstemcisi
│   ├── lib/
│   │   ├── core/                  # #F97316 (Turuncu) & #0F172A (Lacivert) temaları, ApiClient
│   │   ├── data/models/           # UserModel, AuthResponse
│   │   └── presentation/screens/  # LoginScreen (TR), DashboardScreen (Rol bazlı menü)
│   ├── windows/                   # Windows Desktop runner & CMakeLists
│   ├── android/                   # Android platform manifest
│   ├── ios/                       # iOS runner & Info.plist
│   └── pubspec.yaml
│
├── deploy/                        # Dağıtım ve DevOps
│   ├── docker-compose.yml         # PostgreSQL 16 + NestJS API + Nginx
│   ├── nginx/conf.d/default.conf  # Nginx ters vekil ve SSL terminasyonu
│   └── scripts/
│       ├── backup.sh              # Günlük otomatik pg_dump yedeği ve saklama politikası
│       └── restore.sh             # Yedekten geri yükleme ve bütünlük testi
│
├── setup.sh                       # Boş sunucuda tek komutla kurulum sihirbazı
└── README.md
```

---

## 🚀 Hızlı Başlangıç (Geliştirme Ortamı)

### 1. Backend (NestJS)
```bash
cd api
npm install
npm run migrate    # fittrack_schema.sql uygular
npm run seed       # İlk salon ve admin kullanıcısını oluşturur
npm run start:dev  # http://localhost:3000
```
- Swagger API Dokümantasyonu: `http://localhost:3000/api/docs`

### 2. Canlı Dağıtım (Docker Compose)
Boş bir Ubuntu sunucusunda tek komutla kurulum:
```bash
chmod +x setup.sh
./setup.sh
```

---

## 🔒 Faz 1 Kabul Kriterleri Doğrulama Matrisi

| # | Kabul Kriteri | Durum | Doğrulama Yöntemi |
|---|---------------|-------|-------------------|
| 1 | **Admin Girişi & PT Ekleme** | ✅ Doğrulandı | `POST /auth/login` ile admin girişi; `POST /trainers` ile tek transaction'da `users` + `trainers` + `audit_logs` kaydı oluşturuldu. |
| 2 | **PT Girişi** | ✅ Doğrulandı | Eklenen PT kendi e-posta ve şifresiyle sisteme giriş yapabiliyor. |
| 3 | **PT Admin Kısıtlaması (403)** | ✅ Doğrulandı | PT rolündeki token ile `GET /trainers` çağrıldığında sunucu `403 Forbidden` yanıtı dönüyor. |
| 4 | **Argon2 Hashleme & Hız Sınırı** | ✅ Doğrulandı | Şifreler `Argon2id` ile hashleniyor, `@Throttle` ile brute-force saldırıları engelleniyor. |
| 5 | **Tek Komutla Kurulum & Yedekleme** | ✅ Doğrulandı | `setup.sh` Docker konteynerlerini ayağa kaldırıp tohumluyor; `backup.sh` ve `restore.sh` yedekleme ve geri yüklemeyi test ediyor. |
| 6 | **Flutter İstemci İskeleti** | ✅ Doğrulandı | Windows, Android ve iOS destekli; Türkçe arayüz, koyu/açık tema (#F97316 & #0F172A), rol bazlı dinamik menü. |
