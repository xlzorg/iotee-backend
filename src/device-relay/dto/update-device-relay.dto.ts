
import { IsOptional, IsString, IsNumber, IsBoolean, Matches } from 'class-validator';

export class UpdateDeviceRelayDto {
  @IsString()
  @IsOptional()
  relay_name?: string;

  @IsNumber()
  @IsOptional()
  output_condition?: number;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'static_start must be in HH:MM format' })
  static_start?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'static_stop must be in HH:MM format' })
  static_stop?: string;

  @IsNumber()
  @IsOptional()
  static_condition?: number;

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'periodic_start must be in HH:MM format' })
  periodic_start?: string;

  @IsNumber()
  @IsOptional()
  periodic_interval?: number;

  @IsNumber()
  @IsOptional()
  periodic_runtime?: number;

  @IsNumber()
  @IsOptional()
  periodic_limit?: number;

  @IsNumber()
  @IsOptional()
  sensor_trigger?: number;

  @IsNumber()
  @IsOptional()
  sensor_state?: number;

  @IsString()
  @IsOptional()
  sensor_slot?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
