// auth/strategies/jwt-refresh.strategy.ts
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const refreshTokenExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['refresh_token'] || req.cookies['refreshToken'];
  }
  if (!token && req.body && req.body.refreshToken) {
    token = req.body.refreshToken;
  }
  return token;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET_KEY');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET_KEY missing from environment.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshTokenExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = refreshTokenExtractor(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return { userId: payload.sub, refreshToken };
  }
}