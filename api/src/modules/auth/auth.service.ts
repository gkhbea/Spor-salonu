import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { envConfig } from '../../config/env.config';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Token hash oluşturur (SHA-256 indekslenebilir ve hızlı doğrulama için).
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Kullanıcı girişi (Login)
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;

    // Kullanıcıyı e-posta ile ara (soft delete kontrolüyle)
    const userResult = await this.db.query(
      `SELECT u.id, u.salon_id, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active,
              s.name as salon_name, s.is_active as salon_active
       FROM users u
       JOIN salons s ON s.id = u.salon_id
       WHERE LOWER(u.email) = LOWER($1) AND u.deleted_at IS NULL AND s.deleted_at IS NULL
       LIMIT 1`,
      [email],
    );

    if (userResult.rows.length === 0) {
      this.logger.warn(`Giriş denemesi başarısız (kullanıcı yok): ${email}`);
      throw new UnauthorizedException('E-posta adresi veya şifre hatalı.');
    }

    const user = userResult.rows[0];

    // Salon aktif mi?
    if (!user.salon_active) {
      throw new UnauthorizedException('Kayıtlı olduğunuz salon şu anda aktif değildir.');
    }

    // Kullanıcı aktif mi?
    if (!user.is_active) {
      throw new UnauthorizedException('Hesabınız askıya alınmıştır. Lütfen salon yöneticisiyle görüşün.');
    }

    // Argon2 ile şifre doğrulaması
    const isPasswordValid = await argon2.verify(user.password_hash, password);
    if (!isPasswordValid) {
      await this.auditLogs.log({
        salonId: user.salon_id,
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityName: 'users',
        entityId: user.id,
        newValues: { email, reason: 'Geçersiz şifre' },
        ipAddress,
        userAgent,
      });
      this.logger.warn(`Hatalı şifre denemesi: ${email}`);
      throw new UnauthorizedException('E-posta adresi veya şifre hatalı.');
    }

    // Access Token üret
    const payload = {
      sub: user.id,
      salonId: user.salon_id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };
    const accessToken = this.jwtService.sign(payload);

    // Refresh Token üret (64 byte rastgele hex)
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    // 7 gün sonra sona erme (UTC)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Veritabanına kaydet
    await this.db.query(
      `INSERT INTO refresh_tokens (salon_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.salon_id, user.id, tokenHash, expiresAt.toISOString()],
    );

    // Başarılı giriş audit log kaydı
    await this.auditLogs.log({
      salonId: user.salon_id,
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityName: 'users',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: envConfig.jwt.accessExpiresIn,
      user: {
        id: user.id,
        salonId: user.salon_id,
        salonName: user.salon_name,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    };
  }

  /**
   * Token Yenileme (Refresh Token Rotation)
   */
  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const tokenHash = this.hashToken(refreshToken);

    // Aktif ve süresi geçmemiş refresh token'ı bul
    const tokenResult = await this.db.query(
      `SELECT rt.id, rt.salon_id, rt.user_id, rt.expires_at,
              u.email, u.first_name, u.last_name, u.role, u.is_active,
              s.name as salon_name, s.is_active as salon_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       JOIN salons s ON s.id = rt.salon_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > CURRENT_TIMESTAMP
         AND u.deleted_at IS NULL
         AND s.deleted_at IS NULL
       LIMIT 1`,
      [tokenHash],
    );

    if (tokenResult.rows.length === 0) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum anahtarı.');
    }

    const tokenRow = tokenResult.rows[0];

    if (!tokenRow.is_active || !tokenRow.salon_active) {
      throw new UnauthorizedException('Kullanıcı veya salon hesabı aktif değil.');
    }

    // Eski refresh token'ı iptal et (Rotate)
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [tokenRow.id],
    );

    // Yeni Access Token üret
    const payload = {
      sub: tokenRow.user_id,
      salonId: tokenRow.salon_id,
      email: tokenRow.email,
      role: tokenRow.role,
      firstName: tokenRow.first_name,
      lastName: tokenRow.last_name,
    };
    const newAccessToken = this.jwtService.sign(payload);

    // Yeni Refresh Token üret ve kaydet
    const newRawRefreshToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.query(
      `INSERT INTO refresh_tokens (salon_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenRow.salon_id, tokenRow.user_id, newTokenHash, expiresAt.toISOString()],
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: envConfig.jwt.accessExpiresIn,
    };
  }

  /**
   * Çıkış Yapma (Logout) - Refresh token'ı iptal eder
   */
  async logout(userId: string, salonId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.db.query(
        `UPDATE refresh_tokens
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE salon_id = $1 AND user_id = $2 AND token_hash = $3 AND revoked_at IS NULL`,
        [salonId, userId, tokenHash],
      );
    } else {
      // Refresh token verilmediyse kullanıcının bu salondaki tüm açık oturumlarını kapat
      await this.db.query(
        `UPDATE refresh_tokens
         SET revoked_at = CURRENT_TIMESTAMP
         WHERE salon_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [salonId, userId],
      );
    }

    await this.auditLogs.log({
      salonId,
      userId,
      action: 'AUTH_LOGOUT',
      entityName: 'users',
      entityId: userId,
    });

    return { message: 'Oturum başarıyla sonlandırıldı.' };
  }

  /**
   * Mevcut oturum açmış kullanıcı profilini getirir (GET /me)
   */
  async getMe(userId: string, salonId: string) {
    const userResult = await this.db.query(
      `SELECT u.id, u.salon_id, u.email, u.first_name, u.last_name, u.phone, u.role, u.is_active, u.created_at,
              s.name as salon_name, s.slug as salon_slug, s.address as salon_address, s.phone as salon_phone
       FROM users u
       JOIN salons s ON s.id = u.salon_id
       WHERE u.id = $1 AND u.salon_id = $2 AND u.deleted_at IS NULL
       LIMIT 1`,
      [userId, salonId],
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('Kullanıcı profili bulunamadı.');
    }

    const u = userResult.rows[0];

    // Eğer kullanıcı bir trainer (PT) ise antrenör profil detaylarını da dahil et
    let trainerInfo = null;
    if (u.role === 'trainer') {
      const trainerResult = await this.db.query(
        `SELECT id, specialty, bio, color_code, hire_date, is_active
         FROM trainers
         WHERE user_id = $1 AND salon_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [userId, salonId],
      );
      if (trainerResult.rows.length > 0) {
        trainerInfo = trainerResult.rows[0];
      }
    }

    return {
      id: u.id,
      salonId: u.salon_id,
      salonName: u.salon_name,
      salonSlug: u.salon_slug,
      salonAddress: u.salon_address,
      salonPhone: u.salon_phone,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      trainer: trainerInfo,
    };
  }
}
