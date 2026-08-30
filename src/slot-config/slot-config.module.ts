import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SlotConfigService } from './slot-config.service';
import { SlotConfigController } from './slot-config.controller';

@Module({
  imports: [DatabaseModule],
  providers: [SlotConfigService],
  controllers: [SlotConfigController],
  exports: [SlotConfigService],
})
export class SlotConfigModule {}
