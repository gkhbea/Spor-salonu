import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envConfig } from '../../../config/env.config';
import { DatabaseService } from '../../../database/database.service';

export interface JwtPayload {
  sub: string;
  salonId: string;
  email: string;
  role: 'admin' | 'trainer' | 'member';
  firstName: string;
  lastName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: envConfig.jwt.accessSecret,
    });
  }

  async validate(payload: JwtPayload) {
    // Kullanıcının halen aktif ve silinmemiş olduğunu teyit et
    const userResult = await this.db.query(
      `SELECT id, salon_id, email, first_name, last_name, role, is_active
       FROM users
       WHERE id = $1 AND salon_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [payload.sub, payload.salonId],
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedException('Kullanıcı hesabı bulunamadı veya silinmiş.');
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException('Kullanıcı hesabı pasife alınmıştır.');
    }

    return {
      id: user.id,
      salonId: user.salon_id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };
  }
}
