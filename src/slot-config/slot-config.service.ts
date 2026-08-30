import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SlotConfigResponseDto } from './dto/slot-config.dto';

/**
 * Defines the shape of an item in the update payload array.
 */
interface SlotConfigUpdateItem {
  slot_key: string;
  label: string;
  unit: string;
  active: boolean;
}

/**
 * Slot Configuration Service
 * Handles device slot (data point) configurations
 */
@Injectable()
export class SlotConfigService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Verifies that the user owns the device.
   * @param client - The database client.
   * @param userId - The ID of the user.
   * @param serialNumber - The serial number of the device.
   * @throws NotFoundException if the device is not found or the user does not own it.
   */
  private async verifyDeviceOwnership(
    client: any,
    userId: number,
    serialNumber: string,
  ) {
    const ownerQuery = `
      SELECT 1 FROM devices 
      WHERE owner_user_id = $1 AND serial_number = $2
    `;
    const ownerResult = await client.query(ownerQuery, [userId, serialNumber]);

    if (ownerResult.rows.length === 0) {
      throw new NotFoundException('Device not found or access denied');
    }
  }

  /**
   * Get slot configurations for a device
   * @param userId - The user's ID to verify ownership
   * @param serialNumber - Device serial number
   * @returns Slot configurations as a map
   */
  async getSlotConfig(
    userId: number,
    serialNumber: string,
  ): Promise<SlotConfigResponseDto> {
    if (!serialNumber) {
      throw new BadRequestException('Serial number is required');
    }

    const client = await this.dbService.getClient();
    try {
      // First, verify the user owns this device
      await this.verifyDeviceOwnership(client, userId, serialNumber);

      const query = `
        SELECT slot_key, label, unit, active 
        FROM slot_configurations 
        WHERE device_serial_number = $1
      `;

      const result = await client.query(query, [serialNumber]);

      // Convert array to object map: { data1: {...}, data2: {...} }
      const configMap: SlotConfigResponseDto = {};
      result.rows.forEach((row) => {
        configMap[row.slot_key] = {
          label: row.label,
          unit: row.unit,
          active: row.active ?? true,
        };
      });

      return configMap;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch slot configurations: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  /**
   * Update slot configurations for a device
   * @param userId - The user's ID to verify ownership
   * @param serial_number - The device serial number
   * @param slot_configs - Updated slot configurations as an array of objects
   * @returns Success message
   */
  async updateSlotConfig(
    userId: number,
    serial_number: string,
    slot_configs: SlotConfigUpdateItem[],
  ): Promise<{ message: string }> {
    if (!slot_configs || !serial_number) {
      throw new BadRequestException('Missing required data');
    }

    const client = await this.dbService.getClient();

    try {
      await client.query('BEGIN');

      // First, verify the user owns this device
      await this.verifyDeviceOwnership(client, userId, serial_number);

      // Iterate through each slot configuration and upsert
      for (const config of slot_configs) {
        const query = `
          INSERT INTO slot_configurations (device_serial_number, slot_key, label, unit, active, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (device_serial_number, slot_key) 
          DO UPDATE SET 
            label = EXCLUDED.label,
            unit = EXCLUDED.unit,
            active = EXCLUDED.active,
            updated_at = NOW();
        `;

        await client.query(query, [
          serial_number,
          config.slot_key,
          config.label,
          config.unit,
          config.active ?? true,
        ]);
      }

      await client.query('COMMIT');

      return { message: 'Slot configurations saved successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update slot configurations: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }
}
