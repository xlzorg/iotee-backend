import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Extracts JWT from the 'access_token' cookie. This is the primary method
 * since the AuthController sets tokens in httpOnly cookies.
 */
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_SECRET_KEY not found in environment variables. JWT Strategy cannot be initialized.');
    }
    super({
      // This strategy supports both cookie-based and bearer token authentication.
      // It will first try to get the token from the 'access_token' cookie.
      // If not found, it will fall back to the standard 'Authorization: Bearer <token>' header.
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any): Promise<{ userId: string }> {
    return { userId: payload.sub };
  }
}