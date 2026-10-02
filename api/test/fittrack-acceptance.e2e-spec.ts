import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('FitTrack PT - Faz 1 Kabul Kriterleri E2E Test Paketi', () => {
  let app: INestApplication;
  let db: DatabaseService;

  // Mock veritabanı kayıtları
  const mockSalonId = '00000000-0000-0000-0000-000000000001';
  const mockAdminId = '00000000-0000-0000-0000-000000000002';
  const mockTrainerUserId = '00000000-0000-0000-0000-000000000003';
  const mockTrainerId = '00000000-0000-0000-0000-000000000004';

  let adminPasswordHash: string;
  let trainerPasswordHash: string;

  beforeAll(async () => {
    adminPasswordHash = await argon2.hash('AdminSecret123!');
    trainerPasswordHash = await argon2.hash('TrainerSecret123!');

    const mockDbService = {
      query: jest.fn(async (text: string, params: any[]) => {
        // 1. Login Sorguları
        if (text.includes('FROM users u') && text.includes('LOWER(u.email) = LOWER($1)')) {
          const email = params[0];
          if (email.toLowerCase() === 'admin@fittrack.com') {
            return {
              rows: [
                {
                  id: mockAdminId,
                  salon_id: mockSalonId,
                  email: 'admin@fittrack.com',
                  password_hash: adminPasswordHash,
                  first_name: 'Sistem',
                  last_name: 'Yöneticisi',
                  role: 'admin',
                  is_active: true,
                  salon_name: 'FitTrack Merkez',
                  salon_active: true,
                },
              ],
              rowCount: 1,
            };
          } else if (email.toLowerCase() === 'trainer@fittrack.com') {
            return {
              rows: [
                {
                  id: mockTrainerUserId,
                  salon_id: mockSalonId,
                  email: 'trainer@fittrack.com',
                  password_hash: trainerPasswordHash,
                  first_name: 'Can',
                  last_name: 'Antrenör',
                  role: 'trainer',
                  is_active: true,
                  salon_name: 'FitTrack Merkez',
                  salon_active: true,
                },
              ],
              rowCount: 1,
            };
          }
          return { rows: [], rowCount: 0 };
        }

        // 2. JWT Strategy Kullanıcı Doğrulama
        if (text.includes('FROM users') && text.includes('WHERE id = $1')) {
          const userId = params[0];
          if (userId === mockAdminId) {
            return {
              rows: [
                {
                  id: mockAdminId,
                  salon_id: mockSalonId,
                  email: 'admin@fittrack.com',
                  first_name: 'Sistem',
                  last_name: 'Yöneticisi',
                  role: 'admin',
                  is_active: true,
                },
              ],
              rowCount: 1,
            };
          } else if (userId === mockTrainerUserId) {
            return {
              rows: [
                {
                  id: mockTrainerUserId,
                  salon_id: mockSalonId,
                  email: 'trainer@fittrack.com',
                  first_name: 'Can',
                  last_name: 'Antrenör',
                  role: 'trainer',
                  is_active: true,
                },
              ],
              rowCount: 1,
            };
          }
          return { rows: [], rowCount: 0 };
        }

        // 3. Refresh Tokens Insert
        if (text.includes('INSERT INTO refresh_tokens')) {
          return { rows: [], rowCount: 1 };
        }

        // 4. Audit Logs Insert
        if (text.includes('INSERT INTO audit_logs')) {
          return { rows: [], rowCount: 1 };
        }

        // 5. GET /trainers listesi
        if (text.includes('FROM trainers t') && text.includes('WHERE t.salon_id = $1')) {
          return {
            rows: [
              {
                id: mockTrainerId,
                salon_id: mockSalonId,
                specialty: 'Fitness',
                bio: 'Deneyimli PT',
                color_code: '#F97316',
                hire_date: '2025-01-01',
                is_active: true,
                created_at: new Date().toISOString(),
                user_id: mockTrainerUserId,
                email: 'trainer@fittrack.com',
                first_name: 'Can',
                last_name: 'Antrenör',
                phone: '+905551234567',
                role: 'trainer',
              },
            ],
            rowCount: 1,
          };
        }

        // 6. E-posta mevcudiyet kontrolü (yeni PT eklerken)
        if (text.includes('FROM users') && text.includes('LOWER(email)')) {
          return { rows: [], rowCount: 0 };
        }

        return { rows: [], rowCount: 0 };
      }),

      withTransaction: jest.fn(async (callback) => {
        const mockClient = {
          query: jest.fn(async (text: string, params: any[]) => {
            if (text.includes('INSERT INTO users')) {
              return { rows: [{ id: 'new-user-uuid' }] };
            }
            if (text.includes('INSERT INTO trainers')) {
              return { rows: [{ id: 'new-trainer-uuid', created_at: new Date().toISOString() }] };
            }
            if (text.includes('INSERT INTO audit_logs')) {
              return { rows: [{ id: 'audit-log-uuid' }] };
            }
            return { rows: [] };
          }),
        };
        return callback(mockClient);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDbService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    db = moduleFixture.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    await app.close();
  });

  let adminAccessToken: string;
  let trainerAccessToken: string;

  it('1. Kabul Kriteri A: Admin sisteme başarıyla giriş yapıp JWT token alabilmelidir', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@fittrack.com',
        password: 'AdminSecret123!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    adminAccessToken = res.body.data.accessToken;
  });

  it('2. Kabul Kriteri B: Admin giriş yaptıktan sonra yeni bir PT ekleyebilmelidir (POST /trainers)', async () => {
    const res = await request(app.getHttpServer())
      .post('/trainers')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        email: 'deniz.pt@fittrack.com',
        password: 'TrainerPassword2026!',
        firstName: 'Deniz',
        lastName: 'Acar',
        phone: '+905321112233',
        specialty: 'Crossfit & Kondisyon',
        colorCode: '#F97316',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe('deniz.pt@fittrack.com');
  });

  it('3. Kabul Kriteri C: PT kendi kullanıcı hesabı ve şifresiyle giriş yapabilmelidir', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'trainer@fittrack.com',
        password: 'TrainerSecret123!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.role).toBe('trainer');
    trainerAccessToken = res.body.data.accessToken;
  });

  it('4. Kabul Kriteri D: PT, admin uç noktalarına erişmeye çalıştığında 403 Forbidden almalıdır', async () => {
    const res = await request(app.getHttpServer())
      .get('/trainers')
      .set('Authorization', `Bearer ${trainerAccessToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(403);
    expect(res.body.message).toContain('Erişim reddedildi');
  });

  it('5. Kabul Kriteri E: Hatalı şifre girildiğinde 401 Unauthorized dönmelidir', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@fittrack.com',
        password: 'YanlisSifre999!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(401);
  });
});
