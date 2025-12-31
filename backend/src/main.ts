import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Trust proxy - required when behind Docker, nginx, or load balancer
  // This enables proper extraction of client IP from X-Forwarded-For header
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Global prefix
  app.setGlobalPrefix('api');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // Cookie parser for HttpOnly cookies
  app.use(cookieParser());

  // CORS configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation (only in development)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('HBCT Fire Protection API')
      .setDescription('API for HBCT Fire Protection Token Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('tokens', 'Token buy/sell endpoints')
      .addTag('affiliates', 'Affiliate/referral endpoints')
      .addTag('staking', 'Token staking endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Swagger docs available at: http://localhost:${port}/docs`);
  }
}
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
