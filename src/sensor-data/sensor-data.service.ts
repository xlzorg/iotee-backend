import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  SensorDataResponseDto,
  SensorDataPointDto,
  SlotLabelDto,
} from './dto/sensor-data.dto';

/**
 * Sensor Data Service
 * Handles sensor data queries and slot configurations
 */
@Injectable()
export class SensorDataService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Get sensor data for a device
   * @param userId - The user's ID
   * @param serialNumber - Device serial number
   * @param range - Time range ('24h' or '7d')
   * @returns Sensor data with labels
   */
  async getSensorData(
    userId: number,
    serialNumber: string,
    range: '24h' | '7d' = '24h',
  ): Promise<SensorDataResponseDto> {
    if (!serialNumber) {
      throw new BadRequestException('Device serial number is required');
    }

    const client = await this.dbService.getClient();
    try {
      // 1. Verify ownership
      const ownerQuery = `
        SELECT 1 FROM devices 
        WHERE owner_user_id = $1 AND serial_number = $2
      `;
      const ownerResult = await client.query(ownerQuery, [userId, serialNumber]);

      if (ownerResult.rows.length === 0) {
        throw new NotFoundException('Device not found or access denied');
      }

      // 2. Fetch slot configurations (labels and units)
      const slotsQuery = `
        SELECT slot_key, label, unit FROM slot_configurations
      `;
      const slotsResult = await client.query(slotsQuery);

      // Transform rows into format: { data1_label: "Temperature", data1_unit: "°C", ... }
      const labels: SlotLabelDto = {};
      slotsResult.rows.forEach((row) => {
        labels[`${row.slot_key}_label`] = row.label;
        labels[`${row.slot_key}_unit`] = row.unit;
      });

      // 3. Fetch historical sensor data
      const timeInterval =
        range === '24h' ? '24 hours' : range === '7d' ? '7 days' : '24 hours';

      const dataQuery = `
        SELECT time, data1, data2, data3, data4, data5, data6, data7, data8
        FROM sensor_data_averages
        WHERE device_serial_number = $1 
        AND time > NOW() - INTERVAL '${timeInterval}'
        ORDER BY time ASC 
        LIMIT 500;
      `;

      const dataResult = await client.query(dataQuery, [serialNumber]);

      return {
        success: true,
        labels,
        data: dataResult.rows as SensorDataPointDto[],
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to fetch sensor data: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
