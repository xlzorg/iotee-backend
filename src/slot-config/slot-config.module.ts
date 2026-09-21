import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SlotConfigService } from './slot-config.service';
import { SlotConfigController } from './slot-config.controller';
import { FieldsController } from './fields.controller';          // ← add this

@Module({
  imports: [DatabaseModule],
  providers: [SlotConfigService],
  controllers: [SlotConfigController, FieldsController],
  exports: [SlotConfigService],
})
export class SlotConfigModule {}
