import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { envConfig } from '../config/env.config';

async function runMigration() {
  console.log('=== FitTrack PT Veritabanı Migration Başlatılıyor ===');
  const pool = new Pool({
    host: envConfig.database.host,
    port: envConfig.database.port,
    user: envConfig.database.user,
    password: envConfig.database.pass,
    database: envConfig.database.name,
    ssl: envConfig.database.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    const schemaPath = path.join(__dirname, 'fittrack_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`Şema dosyası okunuyor: ${schemaPath}`);
    await pool.query(sql);
    console.log('✅ Veritabanı şeması ve tabloları başarıyla uygulandı.');
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration();
}

export { runMigration };
