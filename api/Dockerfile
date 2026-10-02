# --- AŞAMA 1: Yapılandırma ve Derleme (Build Stage) ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Paket tanımlarını kopyala ve bağımlılıkları yükle
COPY package*.json ./
RUN npm ci

# Kaynak kodları ve şemayı kopyala
COPY . .

# TypeScript derlemesini gerçekleştir
RUN npm run build

# Üretim ortamı için gereksiz devDependencies paketlerini temizle
RUN npm prune --production

# --- AŞAMA 2: Üretim Çalışma Ortamı (Production Stage) ---
FROM node:20-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Node kullanıcısı güvenliği (non-root)
USER node

# Sadece derlenmiş çıktıları ve üretim bağımlılıklarını kopyala
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/src/database/fittrack_schema.sql ./dist/database/fittrack_schema.sql

EXPOSE 3000

CMD ["node", "dist/main"]
