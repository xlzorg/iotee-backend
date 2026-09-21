// Copyright (c) 2026 IOTEE. All rights reserved. See LICENSE for details.


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add cookie parser middleware to enable cookie-based authentication
  app.use(cookieParser());

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable CORS for web and mobile clients
  app.enableCors({
    origin: [
      'http://localhost:3000',      // Local development
      'http://localhost:8080',      // Alternative local port
      process.env.FRONTEND_URL || 'http://webapp:3000',  // Docker container
      process.env.MOBILE_APP_URL || '*',  // Mobile app (set in production)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('IoTEE3 REST API')
    .setDescription(
      'Complete REST API for IoTEE3 Smart Agriculture Platform. ' +
      'Includes device management, sensor data collection, user settings, and file uploads. ' +
      'All endpoints (except slot configuration) require JWT authentication.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log('✅ NestJS API running on port', port);
  console.log('📚 Swagger documentation available at http://localhost:' + port + '/api/docs');
  console.log('🔐 All endpoints require JWT Bearer token (except slot configuration GET)');
  console.log('📡 MQTT Broker:', process.env.MQTT_BROKER_URL || 'mqtt://broker:1883');
  console.log('💾 Database:', process.env.PG_HOST || 'postgres');
  console.log('📦 MinIO:', process.env.MINIO_ENDPOINT || 'http://minio:9000');
  console.log('💾 Database Host:             ', process.env.PG_HOST);
  console.log('💾 Database Port:             ', process.env.PG_PORT);
  console.log('💾 Database Name:             ', process.env.PG_DATABASE);

}

bootstrap().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});