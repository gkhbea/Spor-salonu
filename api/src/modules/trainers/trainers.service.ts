import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { DatabaseService } from '../../database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

@Injectable()
export class TrainersService {
  private readonly logger = new Logger(TrainersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Salondaki tüm antrenörleri listeler (Multi-tenant: salon_id ile filtrelenir)
   */
  async findAll(salonId: string, includeInactive: boolean = false) {
    let query = `
      SELECT t.id, t.salon_id, t.specialty, t.bio, t.color_code, t.hire_date, t.is_active, t.created_at,
             u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.role
      FROM trainers t
      JOIN users u ON u.id = t.user_id
      WHERE t.salon_id = $1
        AND t.deleted_at IS NULL
        AND u.deleted_at IS NULL
    `;

    const params: any[] = [salonId];

    if (!includeInactive) {
      query += ` AND t.is_active = TRUE AND u.is_active = TRUE`;
    }

    query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

    const result = await this.db.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      salonId: row.salon_id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      specialty: row.specialty,
      bio: row.bio,
      colorCode: row.color_code,
      hireDate: row.hire_date,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }

  /**
   * Tekil antrenör detayı
   */
  async findOne(salonId: string, trainerId: string) {
    const result = await this.db.query(
      `SELECT t.id, t.salon_id, t.specialty, t.bio, t.color_code, t.hire_date, t.is_active, t.created_at,
              u.id as user_id, u.email, u.first_name, u.last_name, u.phone, u.role
       FROM trainers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.salon_id = $2 AND t.deleted_at IS NULL AND u.deleted_at IS NULL
       LIMIT 1`,
      [trainerId, salonId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Belirtilen antrenör bulunamadı.');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      salonId: row.salon_id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone,
      specialty: row.specialty,
      bio: row.bio,
      colorCode: row.color_code,
      hireDate: row.hire_date,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  /**
   * Yeni PT Ekleme: users + trainers kaydı tek bir TRANSACTION içinde oluşturulur ve audit_logs'a yazılır.
   */
  async create(salonId: string, adminUserId: string, dto: CreateTrainerDto, ipAddress?: string) {
    // 1. E-posta adresi bu salonda zaten var mı kontrol et
    const existing = await this.db.query(
      `SELECT id FROM users WHERE salon_id = $1 AND LOWER(email) = LOWER($2) AND deleted_at IS NULL LIMIT 1`,
      [salonId, dto.email],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException('Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut.');
    }

    // 2. Parolayı Argon2 ile hashle
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 3. Atomik Transaction Başlat
    return await this.db.withTransaction(async (client) => {
      // 3.1. users tablosuna ekle
      const userInsert = await client.query(
        `INSERT INTO users (salon_id, email, password_hash, first_name, last_name, phone, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'trainer', TRUE)
         RETURNING id`,
        [
          salonId,
          dto.email.toLowerCase(),
          passwordHash,
          dto.firstName,
          dto.lastName,
          dto.phone || null,
        ],
      );
      const newUserId = userInsert.rows[0].id;

      // 3.2. trainers tablosuna ekle
      const trainerInsert = await client.query(
        `INSERT INTO trainers (salon_id, user_id, specialty, bio, color_code, hire_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id, created_at`,
        [
          salonId,
          newUserId,
          dto.specialty || null,
          dto.bio || null,
          dto.colorCode || '#F97316',
          dto.hireDate || new Date().toISOString().split('T')[0],
        ],
      );
      const newTrainerId = trainerInsert.rows[0].id;
      const createdAt = trainerInsert.rows[0].created_at;

      // 3.3. Kritik işlem: audit_logs kaydı
      await this.auditLogs.log(
        {
          salonId,
          userId: adminUserId,
          action: 'TRAINER_CREATED',
          entityName: 'trainers',
          entityId: newTrainerId,
          newValues: {
            userId: newUserId,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            specialty: dto.specialty,
            colorCode: dto.colorCode || '#F97316',
          },
          ipAddress,
        },
        client,
      );

      this.logger.log(`Yeni PT kaydedildi: ${dto.email} (Trainer ID: ${newTrainerId}, Salon: ${salonId})`);

      return {
        id: newTrainerId,
        userId: newUserId,
        salonId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName: `${dto.firstName} ${dto.lastName}`,
        email: dto.email.toLowerCase(),
        phone: dto.phone || null,
        specialty: dto.specialty || null,
        bio: dto.bio || null,
        colorCode: dto.colorCode || '#F97316',
        hireDate: dto.hireDate || null,
        isActive: true,
        createdAt,
      };
    });
  }

  /**
   * PT Bilgilerini Güncelleme veya Pasife Alma (Soft Update & Audit Log)
   */
  async update(
    salonId: string,
    adminUserId: string,
    trainerId: string,
    dto: UpdateTrainerDto,
    ipAddress?: string,
  ) {
    const existing = await this.findOne(salonId, trainerId);

    return await this.db.withTransaction(async (client) => {
      // 1. users tablosunu güncelle (ad, soyad, telefon veya aktiflik)
      if (
        dto.firstName !== undefined ||
        dto.lastName !== undefined ||
        dto.phone !== undefined ||
        dto.isActive !== undefined
      ) {
        await client.query(
          `UPDATE users
           SET first_name = COALESCE($1, first_name),
               last_name = COALESCE($2, last_name),
               phone = COALESCE($3, phone),
               is_active = COALESCE($4, is_active),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5 AND salon_id = $6`,
          [
            dto.firstName !== undefined ? dto.firstName : null,
            dto.lastName !== undefined ? dto.lastName : null,
            dto.phone !== undefined ? dto.phone : null,
            dto.isActive !== undefined ? dto.isActive : null,
            existing.userId,
            salonId,
          ],
        );
      }

      // 2. trainers tablosunu güncelle (uzmanlık, bio, renk, aktiflik)
      await client.query(
        `UPDATE trainers
         SET specialty = COALESCE($1, specialty),
             bio = COALESCE($2, bio),
             color_code = COALESCE($3, color_code),
             hire_date = COALESCE($4, hire_date),
             is_active = COALESCE($5, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND salon_id = $7`,
        [
          dto.specialty !== undefined ? dto.specialty : null,
          dto.bio !== undefined ? dto.bio : null,
          dto.colorCode !== undefined ? dto.colorCode : null,
          dto.hireDate !== undefined ? dto.hireDate : null,
          dto.isActive !== undefined ? dto.isActive : null,
          trainerId,
          salonId,
        ],
      );

      // 3. audit_logs kaydı
      await this.auditLogs.log(
        {
          salonId,
          userId: adminUserId,
          action: dto.isActive === false ? 'TRAINER_DEACTIVATED' : 'TRAINER_UPDATED',
          entityName: 'trainers',
          entityId: trainerId,
          oldValues: existing,
          newValues: dto,
          ipAddress,
        },
        client,
      );

      return this.findOne(salonId, trainerId);
    });
  }

  /**
   * PT Silme (Soft Delete)
   */
  async softDelete(salonId: string, adminUserId: string, trainerId: string, ipAddress?: string) {
    const existing = await this.findOne(salonId, trainerId);

    return await this.db.withTransaction(async (client) => {
      // 1. trainers tablosunda soft delete
      await client.query(
        `UPDATE trainers SET deleted_at = CURRENT_TIMESTAMP, is_active = FALSE WHERE id = $1 AND salon_id = $2`,
        [trainerId, salonId],
      );

      // 2. users tablosunda soft delete
      await client.query(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = FALSE WHERE id = $1 AND salon_id = $2`,
        [existing.userId, salonId],
      );

      // 3. Kullanıcının tüm açık oturumlarını iptal et
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND salon_id = $2`,
        [existing.userId, salonId],
      );

      // 4. audit_logs kaydı
      await this.auditLogs.log(
        {
          salonId,
          userId: adminUserId,
          action: 'TRAINER_SOFT_DELETED',
          entityName: 'trainers',
          entityId: trainerId,
          oldValues: existing,
          ipAddress,
        },
        client,
      );

      return { message: 'Antrenör başarıyla silindi (soft-deleted).' };
    });
  }
}
