import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { DatabaseService } from '../../database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AuthService (Kimlik Doğrulama Birim Testleri)', () => {
  let service: AuthService;
  let db: jest.Mocked<DatabaseService>;
  let jwtService: jest.Mocked<JwtService>;
  let auditLogs: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const mockDb = {
      query: jest.fn(),
      withTransaction: jest.fn(),
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_xyz'),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = module.get(DatabaseService);
    jwtService = module.get(JwtService);
    auditLogs = module.get(AuditLogsService);
  });

  it('Argon2 ile hashlenmiş şifreyle doğru giriş yapıldığında JWT ve Refresh token üretilmelidir', async () => {
    const rawPass = 'Secret123!';
    const hashedPass = await argon2.hash(rawPass);

    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'u-123',
            salon_id: 's-100',
            email: 'admin@fittrack.com',
            password_hash: hashedPass,
            first_name: 'Ahmet',
            last_name: 'Yönetici',
            role: 'admin',
            is_active: true,
            salon_name: 'FitTrack Merkez',
            salon_active: true,
          },
        ],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // refresh token insert

    const result = await service.login({ email: 'admin@fittrack.com', password: rawPass });

    expect(result.accessToken).toBe('mock_jwt_token_xyz');
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe('admin@fittrack.com');
    expect(auditLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_LOGIN_SUCCESS',
      }),
    );
  });

  it('Hatalı şifre girildiğinde UnauthorizedException fırlatılmalı ve audit_logs kaydı atılmalıdır', async () => {
    const rawPass = 'Secret123!';
    const hashedPass = await argon2.hash(rawPass);

    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'u-123',
          salon_id: 's-100',
          email: 'admin@fittrack.com',
          password_hash: hashedPass,
          first_name: 'Ahmet',
          last_name: 'Yönetici',
          role: 'admin',
          is_active: true,
          salon_name: 'FitTrack Merkez',
          salon_active: true,
        },
      ],
      rowCount: 1,
    } as any);

    await expect(
      service.login({ email: 'admin@fittrack.com', password: 'WrongPassword999!' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(auditLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_LOGIN_FAILED',
      }),
    );
  });

  it('Var olmayan e-posta ile giriş yapılmak istendiğinde UnauthorizedException fırlatılmalıdır', async () => {
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    await expect(
      service.login({ email: 'bilinmeyen@fittrack.com', password: 'any' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
