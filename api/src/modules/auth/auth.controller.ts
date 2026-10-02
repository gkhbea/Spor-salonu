import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentSalonId } from '../../common/decorators/salon-id.decorator';

@ApiTags('Kimlik Doğrulama (Auth)')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 1 dakikada en fazla 5 deneme (Brute-force koruması)
  @ApiOperation({ summary: 'Kullanıcı Girişi (Admin, PT, Üye)' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı, JWT token döner.' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri.' })
  @ApiResponse({ status: 429, description: 'Çok fazla hatalı giriş denemesi (Hız sınırı).' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Access Token Yenileme (Refresh Token Rotation)' })
  @ApiResponse({ status: 200, description: 'Yeni access ve refresh token döner.' })
  @ApiResponse({ status: 401, description: 'Geçersiz veya süresi dolmuş refresh token.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Oturumu Kapatma (Logout)' })
  @ApiResponse({ status: 200, description: 'Oturum sonlandırıldı.' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim.' })
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentSalonId() salonId: string,
    @Body() body?: { refreshToken?: string },
  ) {
    return this.authService.logout(userId, salonId, body?.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut Kullanıcı Profil Bilgilerini Getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı ve salon profili.' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim.' })
  async getMe(
    @CurrentUser('id') userId: string,
    @CurrentSalonId() salonId: string,
  ) {
    return this.authService.getMe(userId, salonId);
  }
}
