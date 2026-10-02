import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Geçerli refresh token' })
  @IsString({ message: 'Refresh token metin formatında olmalıdır.' })
  @IsNotEmpty({ message: 'Refresh token boş bırakılamaz.' })
  refreshToken: string;
}
