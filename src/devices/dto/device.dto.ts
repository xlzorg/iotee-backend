import { IsString, IsNumber, IsEnum } from 'class-validator';

/**
 * Response DTO for Device
 * @example
 * {
 *   "id": 1,
 *   "name": "Greenhouse A1",
 *   "location": "North Block",
 *   "status": "Online",
 *   "serialNumber": "DEVICE-2025-001"
 * }
 */
export class DeviceDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsEnum(['Online', 'Offline', 'Warning'])
  status: 'Online' | 'Offline' | 'Warning';

  @IsString()
  serialNumber: string;
}
