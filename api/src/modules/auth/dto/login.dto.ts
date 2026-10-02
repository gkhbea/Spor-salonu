import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@fittrack.com', description: 'Kullanıcı e-posta adresi' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta adresi boş bırakılamaz.' })
  email: string;

  @ApiProperty({ example: 'AdminPassword123!', description: 'Kullanıcı parolası' })
  @IsString({ message: 'Parola metin formatında olmalıdır.' })
  @IsNotEmpty({ message: 'Parola boş bırakılamaz.' })
  @MinLength(6, { message: 'Parola en az 6 karakter olmalıdır.' })
  password: string;
}
