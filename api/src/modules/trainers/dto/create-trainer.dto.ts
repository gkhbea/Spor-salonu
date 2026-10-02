import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainerDto {
  @ApiProperty({ example: 'ahmet.pt@fittrack.com', description: 'PT e-posta adresi' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta adresi boş bırakılamaz.' })
  email: string;

  @ApiProperty({ example: 'TrainerPassword123!', description: 'PT geçici/başlangıç parolası' })
  @IsString()
  @IsNotEmpty({ message: 'Parola boş bırakılamaz.' })
  @MinLength(6, { message: 'Parola en az 6 karakter olmalıdır.' })
  password: string;

  @ApiProperty({ example: 'Ahmet', description: 'PT Adı' })
  @IsString()
  @IsNotEmpty({ message: 'İsim boş bırakılamaz.' })
  firstName: string;

  @ApiProperty({ example: 'Yılmaz', description: 'PT Soyadı' })
  @IsString()
  @IsNotEmpty({ message: 'Soyisim boş bırakılamaz.' })
  lastName: string;

  @ApiPropertyOptional({ example: '+905559876543', description: 'PT Telefon Numarası' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Vücut Geliştirme & Hipertrofi', description: 'Uzmanlık Alanı' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: '8 yıllık fitness ve kondisyon antrenörü.', description: 'Biyografi' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '#F97316', description: 'Takvimde temsil edilecek renk kodu (#HEX)' })
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6})$/, { message: 'Geçerli bir HEX renk kodu giriniz (ör. #F97316)' })
  colorCode?: string;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'İşe başlama tarihi (YYYY-AA-GG)' })
  @IsOptional()
  @IsDateString({}, { message: 'Tarih formatı YYYY-AA-GG olmalıdır.' })
  hireDate?: string;
}
