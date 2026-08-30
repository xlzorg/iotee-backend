import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RelayScheduleDto {
  @ApiProperty({ example: 'Everyday' })
  @IsString()
  @IsNotEmpty()
  day: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  time: string;
}

export class UpdateDeviceSettingsDto {
  @ApiProperty()
  @IsInt()
  deviceId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  serial_number: string;

  @ApiProperty({ example: '06:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  lampOn: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  lampOff: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  sprayerDuration: number;

  @ApiProperty({ type: [RelayScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelayScheduleDto)
  sprayerSchedules: RelayScheduleDto[];

  @ApiProperty({ example: 60 })
  @IsNumber()
  dripDuration: number;

  @ApiProperty({ type: [RelayScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelayScheduleDto)
  dripSchedules: RelayScheduleDto[];

  @ApiProperty({ example: 10 })
  @IsNumber()
  additionalDuration: number;

  @ApiProperty({ type: [RelayScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelayScheduleDto)
  additionalSchedules: RelayScheduleDto[];
}

export class DeviceSettingsResponseDto extends UpdateDeviceSettingsDto {}