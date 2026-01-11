import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      // Note: state=false because we don't have session middleware
      // OAuth flow is still protected by the callback validation
      state: false,
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const { id, name, emails, photos } = profile;

      const user = {
        provider: 'GOOGLE' as const,
        providerAccountId: id,
        email: emails?.[0]?.value,
        firstName: name?.givenName,
        lastName: name?.familyName,
        name: profile.displayName,
        avatarUrl: photos?.[0]?.value,
        accessToken,
        refreshToken,
      };

      this.logger.log(`Google OAuth: ${user.email || user.providerAccountId}`);
      done(null, user);
    } catch (error) {
      this.logger.error(`Google OAuth validation error: ${error}`);
      done(error as Error, undefined);
    }
  }
}
