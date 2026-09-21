import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { TokenResponseDto } from './dto/auth.response.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import * as fs from 'fs/promises'; // Already present
import * as path from 'path'; // Already present


interface ValidatedUser {
  userId: string;
  isNewUser?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('PG_POOL') private pool: any,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async validateUser(
    emailOrUsername: string,
    password: string,
  ): Promise<ValidatedUser> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT user_id, password_hash, is_email_verified FROM users WHERE email = $1 OR username = $1';
      const res = await client.query(query, [emailOrUsername]);
      if (res.rows.length === 0) {
        throw new NotFoundException('User not found');
      }
      const user = res.rows[0];
      if (!user.is_email_verified) {
        throw new UnauthorizedException('Please verify your email before logging in.');
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return { userId: user.user_id };
    } finally {
      client.release();
    }
  }

  async login(user: ValidatedUser, rememberMe: boolean = false): Promise<TokenResponseDto> {
    return this.getTokens(user.userId, rememberMe);
  }

  async register(username: string, email: string, password: string, accountType: string, language: string = 'en'): Promise<TokenResponseDto> {
    const client = await this.pool.connect();
    try {
      const checkQuery = 'SELECT user_id FROM users WHERE email = $1 OR username = $2';
      const existing = await client.query(checkQuery, [email, username]);
      if (existing.rows.length > 0) {
        throw new ConflictException(
          'User with this email or username already exists',
        );
      }

      await client.query('BEGIN');
      const hash = await bcrypt.hash(password, 10);
      const emailVerificationToken = uuidv4();
      const insertUserQuery = 'INSERT INTO users (username, email, password_hash, email_verification_token) VALUES ($1, $2, $3, $4) RETURNING user_id';
      const userRes = await client.query(insertUserQuery, [username, email, hash, emailVerificationToken]);
      const userId = userRes.rows[0].user_id;

      const insertProfileQuery = 'INSERT INTO user_profiles (user_id, account_type) VALUES ($1, $2)';
      await client.query(insertProfileQuery, [userId, accountType]);
      
      await this.sendVerificationEmail(email, emailVerificationToken, language);

      await client.query('COMMIT');
      
      // We don't return tokens on registration anymore. User has to verify email first.
      return { accessToken: null, refreshToken: null };
    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Registration error: ${errorMessage}`, error.stack || error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Registration failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      client.release();
    }
  }

  private async sendVerificationEmail(email: string, token: string, language: string = 'en') {
    const appName = this.configService.get<string>('APP_NAME') || 'IoT Monitor';
    const supportUrl = this.configService.get<string>('SUPPORT_URL') || 'https://dashboard.iotee.id/support'; // Replace with actual support URL
    const verificationLink = `${this.configService.get<string>('NEXTAUTH_URL')}/api/auth/verify-email?token=${token}`;
    
    const templatePath = path.join(__dirname, `../mail/templates/verify-email-${language}.html`);
    const fallbackTemplatePath = path.join(__dirname, `../mail/templates/verify-email-en.html`);

    // Define path to the logo for embedding
    const logoPath = path.join(__dirname, '..', 'assets', 'Logo.png');

    let htmlContent: string;
    try {
      htmlContent = await fs.readFile(templatePath, 'utf8');


    } catch (err) {
      console.warn(`Verification email template for language '${language}' not found. Falling back to English.`, err);
      htmlContent = await fs.readFile(fallbackTemplatePath, 'utf8');
    }

    const subjectMap = {
      'en': `Verify Your Email - ${appName}`,
      'id': `Verifikasi Email Anda - ${appName}`,
    };
    const plainTextMap = {
      'en': `Please click the following link to verify your email: ${verificationLink}`,
      'id': `Silakan klik tautan berikut untuk memverifikasi email Anda: ${verificationLink}`,
    };

    const subject = subjectMap[language] || subjectMap['en'];
    const plainText = plainTextMap[language] || plainTextMap['en'];

    // Replace placeholders
    htmlContent = htmlContent
      .replace(/{{appName}}/g, appName)
      .replace(/{{username}}/g, email.split('@')[0]) // Basic username from email
      .replace(/{{verificationLink}}/g, verificationLink)
      .replace(/{{currentYear}}/g, new Date().getFullYear().toString())
      .replace(/{{supportUrl}}/g, supportUrl);

    // Prepare attachment for embedding the logo
    const attachments = [{
        filename: 'Logo.png',
        path: logoPath,
        cid: 'logo' // This ID is referenced in the HTML template's <img> tag
    }];

    await this.mailService.sendMail(
      email,
      subject,
      plainText, // Plain text fallback
      htmlContent,
      attachments,
    );
  }
  
  async validateOAuthLogin(
    email: string,
    provider: string,
    googleId?: string,
    avatarUrl?: string,
    language: string = 'en',
  ): Promise<ValidatedUser> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT user_id, auth_provider FROM users WHERE email = $1';
      const res = await client.query(query, [email]);

      if (res.rows.length > 0) {
        const user = res.rows[0];
        // If user exists and provider is different, link the accounts
        if (user.auth_provider !== provider) {
          await client.query('BEGIN');
          const updateUsersQuery =
            'UPDATE users SET auth_provider = $1, google_id = $2, avatar_url = $3 WHERE user_id = $4';
          await client.query(updateUsersQuery, [
            provider,
            googleId,
            avatarUrl,
            user.user_id,
          ]);
          const updateUserProfilesQuery =
            'UPDATE user_profiles SET cover_logo_1_url = $1 WHERE user_id = $2';
          await client.query(updateUserProfilesQuery, [
            avatarUrl,
            user.user_id,
          ]);
          await client.query('COMMIT');
        }
        return { userId: user.user_id, isNewUser: false };
      }

      // If user does not exist, create a new one
      await client.query('BEGIN');
      const newUserQuery =
        'INSERT INTO users (email, auth_provider, is_email_verified, google_id, avatar_url, username) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id';
      // For username, we can use the part of the email before the @ sign to ensure it is unique.
      const username = email.split('@')[0] + `_${new Date().getTime()}`;
      const newUserRes = await client.query(newUserQuery, [
        email,
        provider,
        true,
        googleId,
        avatarUrl,
        username,
      ]);
      const userId = newUserRes.rows[0].user_id;

      // You might want to create a user profile as well
      const insertProfileQuery =
        'INSERT INTO user_profiles (user_id, account_type, cover_logo_1_url) VALUES ($1, $2, $3)';
      await client.query(insertProfileQuery, [userId, 'USER', avatarUrl]); // Default account type

      await this.sendWelcomeEmail(email, language);

      await client.query('COMMIT');

      return { userId, isNewUser: true };
    } catch (error) {
      await client.query('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`OAuth login error for ${email}: ${errorMessage}`, error.stack || error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `OAuth login failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async sendWelcomeEmail(email: string, language: string = 'en') {
    console.log(`Sending welcome email for language: ${language}`);
    const appName = this.configService.get<string>('APP_NAME') || 'IoT Monitor';
    const supportUrl = this.configService.get<string>('SUPPORT_URL') || 'https://dashboard.iotee.id/support';

    const templatePath = path.join(__dirname, `../mail/templates/welcome-${language}.html`);
    console.log(`Attempting to read template from: ${templatePath}`);
    const fallbackTemplatePath = path.join(__dirname, `../mail/templates/welcome-en.html`);

    const logoPath = path.join(__dirname, '..', 'assets', 'Logo.png');

    let htmlContent: string;
    try {
      htmlContent = await fs.readFile(templatePath, 'utf8');
    } catch (err) {
      console.warn(`Welcome email template for language '${language}' not found. Falling back to English.`, err);
      try {
        htmlContent = await fs.readFile(fallbackTemplatePath, 'utf8');
      } catch (fallbackErr) {
        console.error(`Fallback welcome email template not found at ${fallbackTemplatePath}`, fallbackErr);
        throw new Error('Welcome email template not found.');
      }
    }

    const subjectMap = {
      'en': `Welcome to ${appName}!`,
      'id': `Selamat Datang di ${appName}!`,
    };
    const plainTextMap = {
      'en': `Thank you for registering with ${appName}. We're excited to have you.`,
      'id': `Terima kasih telah mendaftar di ${appName}. Kami senang Anda bergabung.`,
    };

    const subject = subjectMap[language] || subjectMap['en'];
    const plainText = plainTextMap[language] || plainTextMap['en'];

    htmlContent = htmlContent
      .replace(/{{appName}}/g, appName)
      .replace(/{{username}}/g, email.split('@')[0])
      .replace(/{{currentYear}}/g, new Date().getFullYear().toString())
      .replace(/{{supportUrl}}/g, supportUrl);

    const attachments = [{
        filename: 'Logo.png',
        path: logoPath,
        cid: 'logo'
    }];

    await this.mailService.sendMail(
      email,
      subject,
      plainText,
      htmlContent,
      attachments,
    );
  }

async getTokens(userId: string, rememberMe: boolean = false): Promise<TokenResponseDto> {
  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_SECRET_KEY'),
        expiresIn: '15m',
      },
    ),
    this.jwtService.signAsync(
      { sub: userId, jti: uuidv4() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'), // ← FIXED
        expiresIn: rememberMe ? '30d' : '7d',
      },
    ),
  ]);

  await this.updateRefreshToken(userId, refreshToken);

  return { accessToken, refreshToken };
}
  
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT user_id, password_reset_token_expires_at FROM users WHERE password_reset_token = $1';
      const res = await client.query(query, [token]);
      if (res.rows.length === 0) {
        throw new NotFoundException('Invalid password reset token');
      }
      const user = res.rows[0];
      if (new Date() > new Date(user.password_reset_token_expires_at)) {
        throw new NotFoundException('Password reset token has expired');
      }

      const userId = user.user_id;
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const updateQuery = 'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE user_id = $2';
      await client.query(updateQuery, [newPasswordHash, userId]);
    } finally {
      client.release();
    }
  }

  async forgotPassword(email: string, language: string = 'en'): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT user_id FROM users WHERE email = $1';
      const res = await client.query(query, [email]);
      if (res.rows.length === 0) {
        // Don't throw an error, to prevent email enumeration attacks
        return;
      }
      const userId = res.rows[0].user_id;
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      const updateQuery = 'UPDATE users SET password_reset_token = $1, password_reset_token_expires_at = $2 WHERE user_id = $3';
      await client.query(updateQuery, [token, expiresAt, userId]);

      await this.sendPasswordResetEmail(email, token, language);
    } finally {
      client.release();
    }
  }

  private async sendPasswordResetEmail(email: string, token: string, language: string = 'en') {
    const appName = this.configService.get<string>('APP_NAME') || 'IoT Monitor';
    const supportUrl = this.configService.get<string>('SUPPORT_URL') || 'https://dashboard.iotee.id/support'; // Replace with actual support URL
    const resetLink = `${this.configService.get<string>('NEXTAUTH_URL')}/reset-password?token=${token}`;

    const templatePath = path.join(__dirname, `../mail/templates/reset-password-${language}.html`);
    const fallbackTemplatePath = path.join(__dirname, `../mail/templates/reset-password-en.html`);

    // Define path to the logo for embedding
    const logoPath = path.join(__dirname, '..', 'assets', 'Logo.png');

    let htmlContent: string;
    try {
      htmlContent = await fs.readFile(templatePath, 'utf8');
    } catch (err) {
      console.warn(`Password reset email template for language '${language}' not found. Falling back to English.`, err);
      htmlContent = await fs.readFile(fallbackTemplatePath, 'utf8');
    }

    const subjectMap = {
      'en': `Reset Your Password - ${appName}`,
      'id': `Atur Ulang Kata Sandi Anda - ${appName}`,
    };
    const plainTextMap = {
      'en': `Please click the following link to reset your password: ${resetLink}`,
      'id': `Silakan klik tautan berikut untuk mengatur ulang kata sandi Anda: ${resetLink}`,
    };

    const subject = subjectMap[language] || subjectMap['en'];
    const plainText = plainTextMap[language] || plainTextMap['en'];

    // Replace placeholders
    htmlContent = htmlContent
      .replace(/{{appName}}/g, appName)
      .replace(/{{username}}/g, email.split('@')[0]) // Basic username from email
      .replace(/{{resetLink}}/g, resetLink)
      .replace(/{{currentYear}}/g, new Date().getFullYear().toString())
      .replace(/{{supportUrl}}/g, supportUrl);

    // Prepare attachment for embedding the logo
    const attachments = [{
        filename: 'Logo.png',
        path: logoPath,
        cid: 'logo' // This ID is referenced in the HTML template's <img> tag
    }];

    await this.mailService.sendMail(
      email,
      subject,
      plainText, // Plain text fallback
      htmlContent,
      attachments,
    );
  }

  async verifyEmail(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT user_id FROM users WHERE email_verification_token = $1';
      const res = await client.query(query, [token]);
      if (res.rows.length === 0) {
        throw new NotFoundException('Invalid verification token');
      }
      const userId = res.rows[0].user_id;
      const updateQuery = 'UPDATE users SET is_email_verified = true, email_verification_token = NULL WHERE user_id = $1';
      await client.query(updateQuery, [userId]);
    } finally {
      client.release();
    }
  }

  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      // Update or insert the refresh token
      const query = `
        INSERT INTO user_tokens (user_id, refresh_token) 
        VALUES ($1, $2) 
        ON CONFLICT (user_id) 
        DO UPDATE SET refresh_token = $2;
      `;
      await client.query(query, [userId, hashedRefreshToken]);
    } finally {
      client.release();
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    const client = await this.pool.connect();
    try {
      const decoded = await this.decodeRefreshToken(refreshToken);
      const userId = decoded.sub;

      const query = 'SELECT refresh_token FROM user_tokens WHERE user_id = $1';
      const res = await client.query(query, [userId]);
      if (res.rows.length === 0 || !res.rows[0].refresh_token) {
        throw new ForbiddenException('Access Denied');
      }

      const storedToken = res.rows[0].refresh_token;
      const tokensMatch = await bcrypt.compare(refreshToken, storedToken);
      if (!tokensMatch) {
        throw new ForbiddenException('Access Denied');
      }

      // Refresh token is valid, implement token rotation by issuing a new pair of tokens.
      // The `getTokens` method will also handle updating the stored refresh token hash.
      return this.getTokens(userId);
    } finally {
      client.release();
    }
  }

async decodeRefreshToken(token: string): Promise<any> {
  try {
    return await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET_KEY'), // ← FIXED
    });
  } catch (error) {
    throw new ForbiddenException('Invalid refresh token');
  }
}

  async logout(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Nullify the refresh token in the database
      const query = 'UPDATE user_tokens SET refresh_token = NULL WHERE user_id = $1';
      await client.query(query, [userId]);
    } finally {
      client.release();
    }
  }

  async setPassword(userId: string, newPassword: string, username: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Check if username already exists for another user
      const existingUser = await client.query('SELECT user_id FROM users WHERE username = $1 AND user_id != $2', [username, userId]);
      if (existingUser.rows.length > 0) {
        throw new ConflictException('Username already taken.');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const updateQuery = 'UPDATE users SET password_hash = $1, username = $2 WHERE user_id = $3';
      await client.query(updateQuery, [newPasswordHash, username, userId]);
    } finally {
      client.release();
    }
  }
}
