import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { GeolocationService } from './geolocation.service';
import { OAuthService } from './oauth.service';
import { WalletManagementService } from './wallet-management.service';
import { TwoFactorService } from './two-factor.service';
import {
  JwtStrategy,
  JwtRefreshStrategy,
  LocalStrategy,
  GoogleStrategy,
  FacebookStrategy,
} from './strategies';
import { EmailModule } from '../email/email.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ACCESS_TOKEN_EXPIRY } from '../../config/cookie.config';

// Conditional provider factory for OAuth strategies
const createOAuthProviders = () => {
  const logger = new Logger('AuthModule');
  const providers: any[] = [];

  // Google OAuth - only register if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleStrategy);
    logger.log('Google OAuth strategy enabled');
  } else {
    logger.warn('Google OAuth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
  }

  // Facebook OAuth - only register if credentials are provided
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    providers.push(FacebookStrategy);
    logger.log('Facebook OAuth strategy enabled');
  } else {
    logger.warn('Facebook OAuth disabled: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not set');
  }

  return providers;
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: ACCESS_TOKEN_EXPIRY,
        },
      }),
      inject: [ConfigService],
    }),
    EmailModule,
    WalletModule,
    NotificationsModule,
  ],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    GeolocationService,
    OAuthService,
    WalletManagementService,
    TwoFactorService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    ...createOAuthProviders(),
  ],
  controllers: [AuthController],
  exports: [AuthService, TokenService, SessionService, OAuthService, WalletManagementService, TwoFactorService],
})
export class AuthModule {}
