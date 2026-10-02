import { Pool } from 'pg';
import * as argon2 from 'argon2';
import { envConfig } from '../config/env.config';

async function runSeed() {
  console.log('=== FitTrack PT Başlangıç Tohum (Seed) İşlemi Başlatılıyor ===');
  const pool = new Pool({
    host: envConfig.database.host,
    port: envConfig.database.port,
    user: envConfig.database.user,
    password: envConfig.database.pass,
    database: envConfig.database.name,
    ssl: envConfig.database.ssl ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. İlk Salon / Şube Kontrolü ve Ekleme
    let salonResult = await client.query(
      `SELECT id, name FROM salons WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
      [envConfig.seed.salonSlug],
    );

    let salonId: string;
    if (salonResult.rows.length === 0) {
      console.log(`Yeni salon oluşturuluyor: ${envConfig.seed.salonName}`);
      const insertSalon = await client.query(
        `INSERT INTO salons (name, slug, email, phone, address, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id`,
        [
          envConfig.seed.salonName,
          envConfig.seed.salonSlug,
          'info@fittrack.com',
          '+902120000000',
          'Merkez Mah. Spor Cad. No:1 İstanbul',
        ],
      );
      salonId = insertSalon.rows[0].id;
      console.log(`✅ Salon oluşturuldu. ID: ${salonId}`);
    } else {
      salonId = salonResult.rows[0].id;
      console.log(`ℹ️ Mevcut salon kullanılıyor. ID: ${salonId}`);
    }

    // 2. Admin Kullanıcısı Kontrolü ve Ekleme
    const userResult = await client.query(
      `SELECT id, email FROM users WHERE salon_id = $1 AND email = $2 AND deleted_at IS NULL LIMIT 1`,
      [salonId, envConfig.seed.adminEmail],
    );

    let adminUserId: string;
    if (userResult.rows.length === 0) {
      console.log(`Admin kullanıcısı oluşturuluyor: ${envConfig.seed.adminEmail}`);
      // Argon2 ile güvenli hashleme
      const passwordHash = await argon2.hash(envConfig.seed.adminPass, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const insertAdmin = await client.query(
        `INSERT INTO users (salon_id, email, password_hash, first_name, last_name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'admin', true)
         RETURNING id`,
        [
          salonId,
          envConfig.seed.adminEmail,
          passwordHash,
          envConfig.seed.adminFirstName,
          envConfig.seed.adminLastName,
          envConfig.seed.adminPhone,
        ],
      );
      adminUserId = insertAdmin.rows[0].id;

      // Kritik işlem: audit_logs kaydı
      await client.query(
        `INSERT INTO audit_logs (salon_id, user_id, action, entity_name, entity_id, new_values)
         VALUES ($1, $2, 'SEED_ADMIN_CREATED', 'users', $3, $4)`,
        [
          salonId,
          adminUserId,
          adminUserId,
          JSON.stringify({
            email: envConfig.seed.adminEmail,
            role: 'admin',
            note: 'Otomatik seed ile oluşturuldu',
          }),
        ],
      );

      console.log(`✅ Admin kullanıcısı oluşturuldu. ID: ${adminUserId}`);
    } else {
      adminUserId = userResult.rows[0].id;
      console.log(`ℹ️ Admin kullanıcısı zaten mevcut. ID: ${adminUserId}`);
    }

    await client.query('COMMIT');
    console.log('✅ Tohum verileri başarıyla tamamlandı.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Tohum işlemi hatası:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

export { runSeed };
