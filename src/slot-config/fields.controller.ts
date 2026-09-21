import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SlotConfigService } from './slot-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Settings - Fields')
@Controller('settings/fields')               // ← matches frontend exactly
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FieldsController {
  constructor(private readonly slotConfigService: SlotConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get available fields from device',
    description:
      'Returns field names that this device has ever sent (from device_fields table)',
  })
  @ApiQuery({
    name: 'serial',
    type: 'string',
    required: true,
    example: 'SN-APA-YA',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available fields',
    schema: {
      example: [
        { field_name: 'temperature', last_seen: '2026-09-05T08:30:00.000Z' },
        { field_name: 'humidity', last_seen: '2026-09-05T08:30:00.000Z' },
        { field_name: 'ph', last_seen: '2026-09-05T08:30:00.000Z' },
      ],
    },
  })
  async getAvailableFields(
    @Request() req,
    @Query('serial') serial: string,
  ) {
    const userId = parseInt(req.user.userId, 10);
    return this.slotConfigService.getAvailableFields(userId, serial);
  }
}