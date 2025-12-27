import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(private configService: ConfigService) {
    const options: StrategyOptions = {
      clientID: configService.get<string>('FACEBOOK_APP_ID') || '',
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET') || '',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    };
    super(options);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: any) => void,
  ): Promise<void> {
    try {
      const { id, name, emails, photos } = profile;

      const user = {
        provider: 'FACEBOOK' as const,
        providerAccountId: id,
        email: emails?.[0]?.value,
        firstName: name?.givenName,
        lastName: name?.familyName,
        name: profile.displayName,
        avatarUrl: photos?.[0]?.value,
        accessToken,
        refreshToken,
      };

      this.logger.log(`Facebook OAuth: ${user.email || user.providerAccountId}`);
      done(null, user);
    } catch (error) {
      this.logger.error(`Facebook OAuth validation error: ${error}`);
      done(error as Error, undefined);
    }
  }
}
