import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceDto } from './dto/device.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Devices Controller
 * Handles device management endpoints
 */
@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Get all devices for the authenticated user
   */
  @Get()
  @ApiOperation({
    summary: 'Get all devices',
    description: 'Retrieve all devices owned by the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of devices',
    type: [DeviceDto],
    example: [
      {
        id: 1,
        name: 'Greenhouse A1',
        location: 'North Block',
        status: 'Online',
        serial_number: 'DEVICE-2025-001',
      },
      {
        id: 2,
        name: 'Greenhouse B1',
        location: 'South Block',
        status: 'Offline',
        serial_number: 'DEVICE-2025-002',
      },
    ],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllDevices(@Req() req: any): Promise<DeviceDto[]> {
    return this.devicesService.getAllDevices(req.user.userId);
  }

  /**
   * Get a specific device by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get device by ID',
    description: 'Retrieve details of a specific device',
  })
  @ApiResponse({
    status: 200,
    description: 'Device details',
    type: DeviceDto,
    example: {
      id: 1,
      name: 'Greenhouse A1',
      location: 'North Block',
      status: 'Online',
      serial_number: 'DEVICE-2025-001',
    },
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeviceById(@Param('id') deviceId: string, @Req() req: any): Promise<DeviceDto> {
    return this.devicesService.getDeviceById(req.user.userId, parseInt(deviceId));
  }

  /**
   * Create a new device
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new device',
    description: 'Register a new device with serial number and location',
  })
  @ApiBody({
    type: CreateDeviceDto,
    examples: {
      example1: {
        value: {
          serialNumber: 'DEVICE-2025-001',
          deviceName: 'Greenhouse A1',
          location: 'North Block',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Device created successfully',
    type: DeviceDto,
    example: {
      id: 1,
      name: 'Greenhouse A1',
      location: 'North Block',
      status: 'Offline',
      serial_number: 'DEVICE-2025-001',
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Serial number already registered',
  })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDevice(
    @Body() createDeviceDto: CreateDeviceDto,
    @Req() req: any,
  ): Promise<DeviceDto> {
    return this.devicesService.createDevice(req.user.userId, createDeviceDto);
  }

  /**
   * Update a device
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a device',
    description: 'Update device information (name and/or location)',
  })
  @ApiBody({
    type: CreateDeviceDto,
    examples: {
      example1: {
        value: {
          deviceName: 'Greenhouse A1 Updated',
          location: 'North Block - Building 2',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: DeviceDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateDevice(
    @Param('id') deviceId: string,
    @Body() updateDeviceDto: Partial<CreateDeviceDto>,
    @Req() req: any,
  ): Promise<DeviceDto> {
    return this.devicesService.updateDevice(
      req.user.userId,
      parseInt(deviceId),
      updateDeviceDto,
    );
  }

  /**
   * Delete a device
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a device',
    description: 'Remove a device from the system',
  })
  @ApiResponse({ status: 204, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteDevice(@Param('id') deviceId: string, @Req() req: any): Promise<void> {
    return this.devicesService.deleteDevice(req.user.userId, parseInt(deviceId));
  }
}
