import { Module } from '@nestjs/common';
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
} from './strategies';
import { EmailModule } from '../email/email.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ACCESS_TOKEN_EXPIRY } from '../../config/cookie.config';

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
    GoogleStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, TokenService, SessionService, OAuthService, WalletManagementService, TwoFactorService],
})
export class AuthModule {}
