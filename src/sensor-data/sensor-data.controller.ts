import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SensorDataService } from './sensor-data.service';
import { SensorDataResponseDto } from './dto/sensor-data.dto';

/**
 * Sensor Data Controller
 * Handles sensor data retrieval endpoints
 */
@ApiTags('Sensor Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sensordata')
export class SensorDataController {
  constructor(private readonly sensorDataService: SensorDataService) {}

  /**
   * Get sensor data for a device
   */
  @Get()
  @ApiOperation({
    summary: 'Get sensor data',
    description:
      'Retrieve sensor data and slot configurations for a specific device',
  })
  @ApiQuery({
    name: 'serial',
    type: 'string',
    description: 'Device serial number',
    example: 'DEVICE-2025-001',
  })
  @ApiQuery({
    name: 'range',
    type: 'string',
    enum: ['24h', '7d'],
    description: 'Time range for data retrieval',
    example: '24h',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Sensor data retrieved successfully',
    type: SensorDataResponseDto,
    example: {
      success: true,
      labels: {
        data1_label: 'Temperature',
        data1_unit: '°C',
        data2_label: 'Humidity',
        data2_unit: '%',
      },
      data: [
        {
          time: '2025-03-08T10:00:00Z',
          data1: 25.5,
          data2: 65,
          data3: null,
          data4: null,
          data5: null,
          data6: null,
          data7: null,
          data8: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Device serial number is required',
  })
  @ApiResponse({ status: 404, description: 'Device not found or access denied' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSensorData(
    @Query('serial') serial: string,
    @Query('range') range?: string,
    @Req() req?: any,
  ): Promise<SensorDataResponseDto> {
    if (!serial) {
      throw new BadRequestException('Device serial number is required');
    }

    const timeRange = (range === '7d' ? '7d' : '24h') as '24h' | '7d';

    return this.sensorDataService.getSensorData(
      req.user.userId,
      serial,
      timeRange,
    );
  }
}
