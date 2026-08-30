import {
  Controller,
  Get,
  Query,
  Body,
  HttpCode,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SlotConfigService } from './slot-config.service';
import { SlotConfigResponseDto } from './dto/slot-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Slot Configuration Controller
 * Handles data point slot configuration endpoints
 */
@ApiTags('Slot Configuration')
@Controller('settings/slots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class SlotConfigController {
  constructor(private readonly slotConfigService: SlotConfigService) {}

  /**
   * Get slot configurations for a device
   */
  @Get()
  @ApiOperation({
    summary: 'Get slot configurations',
    description:
      'Retrieve slot (data point) label and unit configurations for a device',
  })
  @ApiQuery({
    name: 'serial',
    type: 'string',
    description: 'Device serial number',
    example: 'DEVICE-2025-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot configurations',
    type: SlotConfigResponseDto,
    example: {
      data1: {
        label: 'Temperature',
        unit: '°C',
        active: true,
      },
      data2: {
        label: 'Humidity',
        unit: '%',
        active: true,
      },
      data3: {
        label: 'pH',
        unit: 'pH',
        active: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Serial number is required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSlotConfig(
    @Request() req,
    @Query('serial') serial: string,
  ): Promise<SlotConfigResponseDto> {
    const userId = parseInt(req.user.userId, 10);
    return this.slotConfigService.getSlotConfig(userId, serial);
  }

  /**
   * Update slot configurations
   */
  @Put()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create or Update slot configurations',
    description:
      'Saves or updates (upserts) the complete slot configuration for a device. This is an idempotent operation.',
  })
  @ApiQuery({
    name: 'serial',
    type: 'string',
    description: 'Device serial number',
    example: 'DEVICE-2025-001',
    required: true,
  })
  @ApiBody({
    description: 'An array of slot configuration objects.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slot_key: { type: 'string', example: 'data1' },
          label: { type: 'string', example: 'Temperature' },
          unit: { type: 'string', example: '°C' },
          active: { type: 'boolean', example: true },
        },
        required: ['slot_key', 'label', 'unit', 'active'],
      },
    },
    examples: {
      example1: {
        summary: 'Example payload',
        value: [
          {
            slot_key: 'data1',
            label: 'Temperature',
            unit: '°C',
            active: true,
          },
          {
            slot_key: 'data2',
            label: 'Humidity',
            unit: '%',
            active: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Slot configurations updated successfully',
    schema: { example: { message: 'Slot configurations saved successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Missing required data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateSlotConfig(
    @Request() req,
    @Query('serial') serial_number: string,
    @Body() slotConfigs: any[],
  ): Promise<{ message: string }> {
    const userId = parseInt(req.user.userId, 10);
    return this.slotConfigService.updateSlotConfig(
      userId,
      serial_number,
      slotConfigs,
    );
  }
}
