import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PassportModule,
    // Register the JwtModule. Secrets are handled by ConfigService
    // in the AuthService and JwtStrategy for better clarity and security.
    JwtModule.register({}),
    ConfigModule, // Explicitly import to ensure ConfigService is available for this module's providers
    MailModule,
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
