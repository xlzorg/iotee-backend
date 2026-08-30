import { IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Schedule for sprayer, drip, or additional operations
 * @example
 * {
 *   "day": "Monday",
 *   "time": "08:00"
 * }
 */
export class ScheduleItemDto {
  @IsString()
  day: string;

  @IsString()
  time: string;
}

/**
 * Device Settings DTO for updates
 * @example
 * {
 *   "deviceId": 1,
 *   "lampOn": "06:00",
 *   "lampOff": "18:00",
 *   "sprayerDuration": "30",
 *   "sprayerSchedules": [{"day": "Monday", "time": "08:00"}],
 *   "dripDuration": "60",
 *   "dripSchedules": [{"day": "Monday", "time": "09:00"}],
 *   "additionalDuration": "45",
 *   "additionalSchedules": []
 * }
 */
export class UpdateDeviceSettingsDto {
  @IsNumber()
  deviceId: number;

  @IsString()
  lampOn: string;

  @IsString()
  lampOff: string;

  @IsNumber()
  sprayerDuration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  sprayerSchedules: ScheduleItemDto[];

  @IsNumber()
  dripDuration: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  dripSchedules: ScheduleItemDto[];

  @IsOptional()
  @IsNumber()
  additionalDuration?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  additionalSchedules?: ScheduleItemDto[];
}

/**
 * Device Settings Response DTO
 * @example
 * {
 *   "device_id": 1,
 *   "lamp_on_time": "06:00",
 *   "lamp_off_time": "18:00",
 *   "sprayer_duration_seconds": 30,
 *   "sprayer_schedules": [{"day": "Monday", "time": "08:00"}],
 *   "drip_duration_seconds": 60,
 *   "drip_schedules": [{"day": "Monday", "time": "09:00"}],
 *   "additional_duration_seconds": 45,
 *   "additional_schedules": [],
 *   "last_updated": "2025-03-08T10:30:00Z"
 * }
 */
export class DeviceSettingsDto {
  device_id: number;
  lamp_on_time: string;
  lamp_off_time: string;
  sprayer_duration_seconds: number;
  sprayer_schedules: ScheduleItemDto[];
  drip_duration_seconds: number;
  drip_schedules: ScheduleItemDto[];
  additional_duration_seconds?: number;
  additional_schedules?: ScheduleItemDto[];
  last_updated: Date;
}
