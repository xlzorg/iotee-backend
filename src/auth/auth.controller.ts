
import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
  Get,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenResponseDto, LogoutResponseDto } from './dto/auth.response.dto';
import { GoogleAuthGuard } from './google-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto, SetPasswordDto } from './dto/reset-password.dto';
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {} 

  /**
   * Sets access and refresh tokens as secure, httpOnly cookies.
   * This is a helper method to centralize cookie logic.
   */
  private setTokenCookies(res: Response, tokens: TokenResponseDto, rememberMe: boolean, isOAuthCallback: boolean = false) {
    // For OAuth callbacks, use 'lax' to allow cookies to be set during cross-origin redirects
    // For regular login, use 'strict' for better security
    const sameSitePolicy = isOAuthCallback ? 'lax' : 'strict';

    // The access token is also set as a cookie, which our JwtStrategy can extract.
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // The refresh token has a longer lifespan.
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: sameSitePolicy,
      path: '/',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 30 days or 7 days
    });
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets the user\'s password using a valid token.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Your password has been reset successfully.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
    return { message: 'Your password has been reset successfully.' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Sends a password reset link to the user\'s email.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'An email has been sent with instructions to reset your password.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto.email, forgotPasswordDto.language);
    return { message: 'An email has been sent with instructions to reset your password.' };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('NEXTAUTH_URL');
      await this.authService.verifyEmail(token);
      // Redirect to a page that says "Email verified, you can now login"
      res.redirect(`${frontendUrl}/login?verified=true`);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {

    try {
      const tokens = await this.authService.login(req.user, true);
      const frontendUrl = this.configService.get<string>('NEXTAUTH_URL');

      const popup = req.query.popup === 'true' || req.cookies.oauth_popup === 'true';
      console.log('[OAuth] Popup flag:', popup, 'query:', req.query.popup, 'cookie:', req.cookies.oauth_popup);

      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      const clearCookieOptions: any = { path: '/' };
      if (isProduction) {
        clearCookieOptions.domain = '.iotee.id';
      }

      // Clear the temporary language preference cookie now that we're done with it.
      res.clearCookie('oauth_lang_pref', clearCookieOptions);
      res.clearCookie('oauth_popup', clearCookieOptions);

      // Set cookies directly for cross-subdomain access
      // Use sameSite: 'none' and domain to allow cookies on dashboard.iotee.id from api.iotee.id
      const cookieOptions: any = {
        httpOnly: true,
        secure: true, // secure is required for sameSite: 'none'
        sameSite: 'none' as const,
        path: '/',
      };
      
      if (isProduction) {
        cookieOptions.domain = '.iotee.id';
      } else {
        // For local development, 'lax' is more appropriate and doesn't require a domain
        cookieOptions.sameSite = 'lax';
        cookieOptions.secure = false; // secure can be false for localhost
      }

      // Set access token cookie
      res.cookie('access_token', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Set refresh token cookie (7 days)
      res.cookie('refresh_token', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      console.log('[OAuth] Cookies set for domain', isProduction ? '.iotee.id' : 'localhost');

      const redirectUrl = req.user.isNewUser
        ? `${frontendUrl}/set-password`
        : `${frontendUrl}`;

      if (popup) {
        console.log(`[OAuth] Popup flow detected. Notifying opener to redirect to ${redirectUrl} and closing popup.`);
        res.setHeader('Content-Type', 'text/html');
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Auth Success</title>
            </head>
            <body>
              <script>
                if(window.opener) {
                  window.opener.postMessage({ type: 'oauth-success', url: '${redirectUrl}' }, '${frontendUrl}');
                }
                window.close();
              </script>
              <p>Authentication successful! This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        // Simple redirect - cookies work across subdomains now
        console.log('[OAuth] Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      }
    } catch (error) {
      console.error('[OAuth] Error in google callback:', error);
      res.redirect(`${this.configService.get<string>('NEXTAUTH_URL')}/login?error=oauth-failed`);
    }
  }

  @Post('login')
  @ApiResponse({ status: 201, description: 'Login successful, returns tokens and a message.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { email, password, rememberMe } = loginDto;
    const user = await this.authService.validateUser(email, password);
    const tokens = await this.authService.login(user, rememberMe);
    this.setTokenCookies(res, tokens, rememberMe);
    return { tokens, message: 'Login successful' };
  }

  @Post('register')
  @ApiResponse({ status: 201, description: 'Registration successful, returns tokens.', type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'User with this email or username already exists.' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const { username, email, password, accountType, language } = registerDto;
    const tokens = await this.authService.register(
      username,
      email,
      password,
      accountType,
      language,
    );

    this.setTokenCookies(res, tokens, false);

    return tokens;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiResponse({ status: 201, description: 'Logout successful.', type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponseDto> {
    const userId = req.user.userId;
    await this.authService.logout(userId);
    // Clear cookies on the client side
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logout successful' };
  }

  @Post('refresh')
  @ApiResponse({ status: 201, description: 'Tokens refreshed successfully.', type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token not found in cookies' })
  @ApiForbiddenResponse({ description: 'Access Denied (Invalid or expired refresh token)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenResponseDto> {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    // The service now returns a new pair of tokens (token rotation)
    const newTokens = await this.authService.refreshToken(refreshToken);

    this.setTokenCookies(res, newTokens, false);

    return newTokens;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Set user password',
    description: 'Allows a logged-in user to set their password for the first time.',
  })
  @ApiBody({ type: SetPasswordDto })
  @ApiResponse({ status: 200, description: 'Your password has been set successfully.' })
  async setPassword(@Body() setPasswordDto: SetPasswordDto, @Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    await this.authService.setPassword(req.user.userId, setPasswordDto.password, setPasswordDto.username);
    return { message: 'Your password has been set successfully.' };
  }
}
