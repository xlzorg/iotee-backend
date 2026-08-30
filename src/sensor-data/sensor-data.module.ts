import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SensorDataService } from './sensor-data.service';
import { SensorDataController } from './sensor-data.controller';

@Module({
  imports: [DatabaseModule],
  providers: [SensorDataService],
  controllers: [SensorDataController],
  exports: [SensorDataService],
})
export class SensorDataModule {}
