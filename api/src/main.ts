import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { envConfig } from './config/env.config';

async function bootstrap() {
  const logger = new Logger('FitTrack-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. CORS İzinleri (Flutter Web / Windows / Mobile için)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global Filtreler ve Interceptorlar
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 3. Girdi Doğrulama (Strict Class Validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da tanımlı olmayan alanları otomatik sil
      forbidNonWhitelisted: true, // Bilinmeyen alan gelirse hata fırlat
      transform: true, // Tipleri otomatik dönüştür
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. OpenAPI / Swagger Dokümantasyonu
  const config = new DocumentBuilder()
    .setTitle('FitTrack PT API')
    .setDescription(
      'FitTrack PT Personal Trainer & Spor Salonu Yönetim Sistemi RESTful API Belirtimi',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'JWT Access Token giriniz',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Kimlik Doğrulama (Auth)')
    .addTag('Antrenör Yönetimi (Trainers - Sadece Admin)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'FitTrack PT API Dokümantasyonu',
  });

  const port = envConfig.port;
  await app.listen(port);
  logger.log(`🚀 FitTrack PT API servisi başlatıldı: http://localhost:${port}`);
  logger.log(`📚 Swagger Dokümantasyonu: http://localhost:${port}/api/docs`);
}

bootstrap();
