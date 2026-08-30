import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * @example
 * {
 *   "serialNumber": "DEVICE-2025-001",
 *   "deviceName": "Greenhouse A1",
 *   "location": "North Block"
 * }
 */
export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(50)
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  deviceName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  location: string;
}
