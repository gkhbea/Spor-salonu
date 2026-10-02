import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentSalonId } from '../../common/decorators/salon-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Antrenör Yönetimi (Trainers - Sadece Admin)')
@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') // Kritik Kural: Sadece Admin rolüne sahip kullanıcılar erişebilir (PT erişirse 403)
@ApiBearerAuth()
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  @ApiOperation({ summary: 'Salondaki Tüm PT’leri Listele (Admin)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Antrenör listesi döner.' })
  @ApiResponse({ status: 403, description: 'Erişim engellendi (Admin yetkisi gerekir).' })
  async findAll(
    @CurrentSalonId() salonId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.trainersService.findAll(salonId, includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tekil PT Detayı Getir (Admin)' })
  @ApiResponse({ status: 200, description: 'Antrenör detayları döner.' })
  @ApiResponse({ status: 404, description: 'Antrenör bulunamadı.' })
  async findOne(
    @CurrentSalonId() salonId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.trainersService.findOne(salonId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yeni PT Ekle (users + trainers tek transaction) (Admin)' })
  @ApiResponse({ status: 201, description: 'PT başarıyla oluşturuldu.' })
  @ApiResponse({ status: 409, description: 'Bu e-posta ile kayıtlı kullanıcı zaten var.' })
  async create(
    @CurrentSalonId() salonId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateTrainerDto,
    @Ip() ip: string,
  ) {
    return this.trainersService.create(salonId, adminUserId, dto, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'PT Bilgilerini Güncelle veya Pasife Al (Admin)' })
  @ApiResponse({ status: 200, description: 'PT güncellendi.' })
  @ApiResponse({ status: 404, description: 'PT bulunamadı.' })
  async update(
    @CurrentSalonId() salonId: string,
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainerDto,
    @Ip() ip: string,
  ) {
    return this.trainersService.update(salonId, adminUserId, id, dto, ip);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PT Sil (Soft Delete) (Admin)' })
  @ApiResponse({ status: 200, description: 'PT soft-delete yapıldı.' })
  @ApiResponse({ status: 404, description: 'PT bulunamadı.' })
  async remove(
    @CurrentSalonId() salonId: string,
    @CurrentUser('id') adminUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Ip() ip: string,
  ) {
    return this.trainersService.softDelete(salonId, adminUserId, id, ip);
  }
}
