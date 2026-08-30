import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceSettingsService } from './device-settings.service';
import {
  UpdateDeviceSettingsDto,
  DeviceSettingsResponseDto,
} from './dto/device-settings.dto';

@ApiTags('Device Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('device-settings')
export class DeviceSettingsController {
  constructor(private readonly deviceSettingsService: DeviceSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get automation settings for a device' })
  @ApiQuery({ name: 'deviceId', type: 'number', required: true })
  @ApiResponse({
    status: 200,
    description: 'Device settings retrieved successfully',
    type: DeviceSettingsResponseDto,
  })
  async getDeviceSettings(
    @Req() req: any,
    @Query('deviceId', ParseIntPipe) deviceId: number,
  ): Promise<Partial<DeviceSettingsResponseDto>> {
    return this.deviceSettingsService.getDeviceSettings(
      req.user.userId,
      deviceId,
    );
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: 'Update automation settings for a device' })
  @ApiResponse({
    status: 200,
    description: 'Settings saved and synced successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateDeviceSettings(
    @Req() req: any,
    @Body() settingsDto: UpdateDeviceSettingsDto,
  ): Promise<{ message: string }> {
    // The DTO contains deviceId, which we use for the ownership check.
    return this.deviceSettingsService.updateDeviceSettings(
      req.user.userId,
      settingsDto,
    );
  }
}