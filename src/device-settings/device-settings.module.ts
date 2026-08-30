import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DeviceSettingsController } from './device-settings.controller';
import { DeviceSettingsService } from './device-settings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DeviceSettingsController],
  providers: [DeviceSettingsService],
})
export class DeviceSettingsModule {}