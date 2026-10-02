import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentSalonId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const salonId = request.user?.salonId;
    if (!salonId) {
      throw new UnauthorizedException('Geçersiz veya eksik salon kimliği.');
    }
    return salonId;
  },
);
