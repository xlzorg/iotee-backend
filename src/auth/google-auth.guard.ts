
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }
  /**
   * Overrides the default options to set temporary cookies for language and popup flow.
   * This is a robust alternative to using the 'state' parameter for passing language.
   */
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const lang = (req.query.lang as string) || 'en';
    const popup = req.query.popup === 'true';

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    const cookieOptions: any = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 5 * 60 * 1000, // 5 minutes
    };
    
    if (isProduction) {
        cookieOptions.domain = '.iotee.id';
    }


    // Set a short-lived, http-only cookie with the language preference.
    res.cookie('oauth_lang_pref', lang, cookieOptions);

    // Also set a cookie to track popup flow (for use in callback)
    if (popup) {
      // This cookie needs to be httpOnly as it's only read by the server in the callback.
      res.cookie('oauth_popup', 'true', cookieOptions);
    }

    return { session: false };
  }
}
