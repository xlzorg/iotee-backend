import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * Slot Configuration for a single data point
 * @example
 * {
 *   "label": "Temperature",
 *   "unit": "°C",
 *   "active": true
 * }
 */
export class SlotConfigItemDto {
  @IsString()
  label: string;

  @IsString()
  unit: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}

/**
 * Update Slot Configuration DTO
 * @example
 * {
 *   "slot_configs": {
 *     "data1": { "label": "Temperature", "unit": "°C", "active": true },
 *     "data2": { "label": "Humidity", "unit": "%", "active": true }
 *   },
 *   "serial_number": "DEVICE-2025-001"
 * }
 */
export class UpdateSlotConfigDto {
  slot_configs: Record<string, SlotConfigItemDto>;
  serial_number: string;
}

/**
 * Slot Configuration Response
 * @example
 * {
 *   "data1": {
 *     "label": "Temperature",
 *     "unit": "°C",
 *     "active": true
 *   },
 *   "data2": {
 *     "label": "Humidity",
 *     "unit": "%",
 *     "active": true
 *   }
 * }
 */
export class SlotConfigResponseDto {
  [key: string]: SlotConfigItemDto;
}
