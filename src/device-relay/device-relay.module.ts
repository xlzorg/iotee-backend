
import { Module } from '@nestjs/common';
import { DeviceRelayService } from './device-relay.service';
import { DeviceRelayController } from './device-relay.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DeviceRelayController],
  providers: [DeviceRelayService],
})
export class DeviceRelayModule {}
