import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { DatabaseService } from '../../database/database.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('TrainersService (PT Yönetimi Birim Testleri)', () => {
  let service: TrainersService;
  let db: jest.Mocked<DatabaseService>;
  let auditLogs: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    const mockDb = {
      query: jest.fn(),
      withTransaction: jest.fn(),
    };

    const mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainersService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<TrainersService>(TrainersService);
    db = module.get(DatabaseService);
    auditLogs = module.get(AuditLogsService);
  });

  it('Yeni PT eklendiğinde users ve trainers tek bir transaction içinde oluşturulmalıdır', async () => {
    const salonId = 's-100';
    const adminUserId = 'admin-1';
    const dto = {
      email: 'mert.pt@fittrack.com',
      password: 'PassWord123!',
      firstName: 'Mert',
      lastName: 'Koç',
      phone: '+905554443322',
      specialty: 'Pilates & Core',
      bio: '5 yıllık tecrübe.',
      colorCode: '#F97316',
    };

    // Mevcut kullanıcı kontrolü (boş)
    db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    // Transaction mock
    const mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ id: 'user-new-id' }] }) // insert users
        .mockResolvedValueOnce({
          rows: [{ id: 'trainer-new-id', created_at: new Date().toISOString() }],
        }), // insert trainers
    };

    db.withTransaction.mockImplementation(async (callback) => {
      return callback(mockClient as any);
    });

    const result = await service.create(salonId, adminUserId, dto);

    expect(result.id).toBe('trainer-new-id');
    expect(result.userId).toBe('user-new-id');
    expect(result.email).toBe('mert.pt@fittrack.com');
    expect(auditLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRAINER_CREATED',
        entityName: 'trainers',
      }),
      mockClient,
    );
  });

  it('Aynı salonda aynı e-postaya sahip PT eklenmeye çalışıldığında ConflictException fırlatılmalıdır', async () => {
    const salonId = 's-100';
    const adminUserId = 'admin-1';
    const dto = {
      email: 'mert.pt@fittrack.com',
      password: 'PassWord123!',
      firstName: 'Mert',
      lastName: 'Koç',
    };

    // E-posta zaten var
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'existing-id' }],
      rowCount: 1,
    } as any);

    await expect(service.create(salonId, adminUserId, dto)).rejects.toThrow(ConflictException);
  });
});
