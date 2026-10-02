import * as dotenv from 'dotenv';
dotenv.config();

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    pass: string;
    name: string;
    ssl: boolean;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
  seed: {
    salonName: string;
    salonSlug: string;
    adminEmail: string;
    adminPass: string;
    adminFirstName: string;
    adminLastName: string;
    adminPhone: string;
  };
}

export const envConfig: EnvConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'fittrack_user',
    pass: process.env.DB_PASSWORD || 'fittrack_secure_password_2026!',
    name: process.env.DB_NAME || 'fittrack_db',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_dev_mode_only_123!',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_dev_mode_only_123!',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },
  seed: {
    salonName: process.env.SEED_SALON_NAME || 'FitTrack Merkez Spor Salonu',
    salonSlug: process.env.SEED_SALON_SLUG || 'fittrack-merkez',
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@fittrack.com',
    adminPass: process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!',
    adminFirstName: process.env.SEED_ADMIN_FIRST_NAME || 'Sistem',
    adminLastName: process.env.SEED_ADMIN_LAST_NAME || 'Yöneticisi',
    adminPhone: process.env.SEED_ADMIN_PHONE || '+905551112233',
  },
};
