import {
  IsString,
  IsOptional,
  Matches,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTrainerDto {
  @ApiPropertyOptional({ example: 'Ahmet', description: 'PT Adı' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Yılmaz', description: 'PT Soyadı' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+905559876543', description: 'PT Telefon Numarası' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Fonksiyonel Antrenman & Kilo Verme', description: 'Uzmanlık Alanı' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: 'Güncellenmiş biyografi...', description: 'Biyografi' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '#0F172A', description: 'Takvim renk kodu' })
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6})$/, { message: 'Geçerli bir HEX renk kodu giriniz' })
  colorCode?: string;

  @ApiPropertyOptional({ example: true, description: 'Aktiflik Durumu' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'İşe başlama tarihi' })
  @IsOptional()
  @IsDateString()
  hireDate?: string;
}
