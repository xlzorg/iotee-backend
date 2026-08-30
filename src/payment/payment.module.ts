import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

/**
 * Payment Module
 * Handles all Midtrans payment integration (separate from user settings)
 */
@Module({
  imports: [ConfigModule, DatabaseModule, UserSettingsModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
