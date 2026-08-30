
import { Controller, Get, Body, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DeviceRelayService } from './device-relay.service';
import { UpdateDeviceRelayDto } from './dto/update-device-relay.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('device-relay/:deviceSerialNumber')
@UseGuards(JwtAuthGuard)
export class DeviceRelayController {
  constructor(private readonly deviceRelayService: DeviceRelayService) {}

  @Get()
  findAll(@Param('deviceSerialNumber') deviceSerialNumber: string) {
    return this.deviceRelayService.findAll(deviceSerialNumber);
  }

  @Get(':relayIndex')
  findOne(
    @Param('deviceSerialNumber') deviceSerialNumber: string,
    @Param('relayIndex', ParseIntPipe) relayIndex: number,
  ) {
    return this.deviceRelayService.findOne(deviceSerialNumber, relayIndex);
  }

  @Patch(':relayIndex')
  update(
    @Param('deviceSerialNumber') deviceSerialNumber: string,
    @Param('relayIndex', ParseIntPipe) relayIndex: number,
    @Body() updateDeviceRelayDto: UpdateDeviceRelayDto,
  ) {
    return this.deviceRelayService.update(deviceSerialNumber, relayIndex, updateDeviceRelayDto);
  }
}
