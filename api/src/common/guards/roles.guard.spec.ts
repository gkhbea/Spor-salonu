import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (Yetkilendirme Güvenlik Testi)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (userRole?: string): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { id: 'u-1', role: userRole } : null,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('Rol gerektirmeyen uç noktalara herkes erişebilmelidir', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext('trainer');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('Admin rolü gerektiren bir uca Admin eriştiğinde izin verilmelidir', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('admin');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('Admin rolü gerektiren bir uca PT (trainer) eriştiğinde 403 Forbidden fırlatılmalıdır', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('trainer');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('Admin rolü gerektiren bir uca Üye (member) eriştiğinde 403 Forbidden fırlatılmalıdır', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('member');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('Kullanıcı nesnesi yoksa 403 Forbidden fırlatılmalıdır', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
