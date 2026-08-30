
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private authService: AuthService,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('NEXT_PUBLIC_API_URL')}/auth/google/callback`,
      scope: ['openid', 'email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, photos } = profile;

    // Read the language from the cookie set by the GoogleAuthGuard.
    // Fallback to 'en' if the cookie is not present for any reason.
    const language = (req.cookies?.oauth_lang_pref as string) || 'en';

    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found in Google profile.'), null);
    }

    const picture = photos?.[0]?.value;

    const validatedUser = await this.authService.validateOAuthLogin(
      email,
      'google',
      id,
      picture,
      language,
    );

    done(null, validatedUser);
  }
}
