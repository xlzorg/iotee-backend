import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * Sensor Data Query Parameters
 * @example
 * {
 *   "serial": "DEVICE-2025-001",
 *   "range": "24h"
 * }
 */
export class SensorDataQueryDto {
  @IsString()
  serial: string;

  @IsOptional()
  @IsEnum(['24h', '7d'])
  range?: '24h' | '7d' = '24h';
}

/**
 * Slot Label Configuration
 * @example
 * {
 *   "data1_label": "Temperature",
 *   "data1_unit": "°C",
 *   "data2_label": "Humidity",
 *   "data2_unit": "%"
 * }
 */
export class SlotLabelDto {
  [key: string]: string;
}

/**
 * Sensor Data Point Response
 * @example
 * {
 *   "time": "2025-03-08T10:00:00Z",
 *   "data1": 25.5,
 *   "data2": 65,
 *   "data3": 7.2,
 *   "data4": 1200,
 *   "data5": null,
 *   "data6": null,
 *   "data7": null,
 *   "data8": null
 * }
 */
export class SensorDataPointDto {
  time: Date;
  data1?: number;
  data2?: number;
  data3?: number;
  data4?: number;
  data5?: number;
  data6?: number;
  data7?: number;
  data8?: number;
}

/**
 * Sensor Data Response
 * @example
 * {
 *   "success": true,
 *   "labels": {
 *     "data1_label": "Temperature",
 *     "data1_unit": "°C"
 *   },
 *   "data": [...]
 * }
 */
export class SensorDataResponseDto {
  success: boolean;
  labels: SlotLabelDto;
  data: SensorDataPointDto[];
}
