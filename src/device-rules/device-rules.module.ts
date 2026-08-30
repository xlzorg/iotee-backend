
import { Module } from '@nestjs/common';
import { DeviceRulesController } from './device-rules.controller';
import { DeviceRulesService } from './device-rules.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DeviceRulesController],
  providers: [DeviceRulesService],
})
export class DeviceRulesModule {}
