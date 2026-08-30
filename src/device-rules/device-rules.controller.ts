
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DeviceRulesService } from './device-rules.service';
import { UpdateDeviceRulesDto } from './dto/update-device-rules.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('device-rules/:deviceSerialNumber')
@UseGuards(JwtAuthGuard)
export class DeviceRulesController {
  constructor(private readonly deviceRulesService: DeviceRulesService) {}

  @Get()
  getRules(@Param('deviceSerialNumber') deviceSerialNumber: string) {
    return this.deviceRulesService.getRules(deviceSerialNumber);
  }

  @Post()
  updateRules(
    @Param('deviceSerialNumber') deviceSerialNumber: string,
    @Body() updateDeviceRulesDto: UpdateDeviceRulesDto,
  ) {
    return this.deviceRulesService.updateRules(deviceSerialNumber, updateDeviceRulesDto);
  }
}
