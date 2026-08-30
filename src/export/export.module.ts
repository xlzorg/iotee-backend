import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ExportService],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}
