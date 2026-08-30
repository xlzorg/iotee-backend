import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';

/**
 * Export Controller
 * Handles data export endpoints
 */
@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Export sensor data as CSV
   */
  @Get()
  @ApiOperation({
    summary: 'Export sensor data to CSV',
    description: 'Download all sensor data for a device as a CSV file',
  })
  @ApiQuery({
    name: 'serial',
    type: 'string',
    description: 'Device serial number',
    example: 'DEVICE-2025-001',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example: '"time","data1","data2"\n"2025-03-08T10:00:00Z","25.5","65"',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Device serial number is required',
  })
  @ApiResponse({ status: 404, description: 'Device not found or access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportSensorData(
    @Query('serial') serial: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    if (!serial) {
      throw new BadRequestException('Device serial number is required');
    }

    try {
      const csvData = await this.exportService.exportSensorDataToCSV(
        req.user.userId,
        serial,
      );

      // Set response headers for file download
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${serial}_data_${new Date().toISOString()}.csv"`,
      });

      res.send(csvData);
    } catch (error) {
      throw error;
    }
  }
}
