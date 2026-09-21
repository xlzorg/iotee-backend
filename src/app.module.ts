import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { DeviceSettingsModule } from './device-settings/device-settings.module';
import { SensorDataModule } from './sensor-data/sensor-data.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { PaymentModule } from './payment/payment.module';
import { UploadModule } from './upload/upload.module';
import { SlotConfigModule } from './slot-config/slot-config.module';
import { ExportModule } from './export/export.module';
import { DeviceRelayModule } from './device-relay/device-relay.module';
import { DeviceRulesModule } from './device-rules/device-rules.module';

import { MailModule } from './mail/mail.module';
import { DashboardModule } from './dashboard/dashboard.module';
//...
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.prod',
        '.env.dev',
        '.env',           // fallback
      ],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DevicesModule,
    DeviceSettingsModule,
    SensorDataModule,
    UserSettingsModule,
    PaymentModule,
    UploadModule,
    SlotConfigModule,
    ExportModule,
    DashboardModule,
    DeviceRelayModule,
    DeviceRulesModule,
    MailModule,
  ],
})
export class AppModule {}
