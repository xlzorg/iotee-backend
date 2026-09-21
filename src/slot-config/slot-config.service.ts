import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SlotConfigResponseDto } from './dto/slot-config.dto';

// ... existing imports and interface ...

interface SlotConfigUpdateItem {
  slot_key: string;
  label: string;
  unit: string;
  active: boolean;
  source_field?: string | null;
}

@Injectable()
export class SlotConfigService {
  constructor(private readonly dbService: DatabaseService) {}

  // ========== existing verifyDeviceOwnership ==========
  private async verifyDeviceOwnership(
    client: any,
    userId: number,
    serialNumber: string,
  ) {
    const ownerResult = await client.query(
      `SELECT 1 FROM devices 
       WHERE owner_user_id = $1 AND serial_number = $2`,
      [userId, serialNumber],
    );

    if (ownerResult.rows.length === 0) {
      throw new NotFoundException('Device not found or access denied');
    }
  }

  // ========== NEW: Get available fields from device_fields ==========
  async getAvailableFields(
    userId: number,
    serialNumber: string,
  ): Promise<{ field_name: string; last_seen: string }[]> {
    if (!serialNumber) {
      throw new BadRequestException('Serial number is required');
    }

    const client = await this.dbService.getClient();
    try {
      await this.verifyDeviceOwnership(client, userId, serialNumber);

      const result = await client.query(
        `
        SELECT field_name, last_seen
        FROM device_fields
        WHERE device_serial_number = $1
        ORDER BY last_seen DESC
        `,
        [serialNumber],
      );

return result.rows.map((row) => row.field_name);    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch available fields: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  // ========== GET slot config (now includes source_field) ==========
  async getSlotConfig(
    userId: number,
    serialNumber: string,
  ): Promise<SlotConfigResponseDto> {
    if (!serialNumber) {
      throw new BadRequestException('Serial number is required');
    }

    const client = await this.dbService.getClient();
    try {
      await this.verifyDeviceOwnership(client, userId, serialNumber);

      const result = await client.query(
        `
        SELECT slot_key, label, unit, active, source_field
        FROM slot_configurations 
        WHERE device_serial_number = $1
        `,
        [serialNumber],
      );

      const configMap: SlotConfigResponseDto = {};
      result.rows.forEach((row) => {
        configMap[row.slot_key] = {
          label: row.label,
          unit: row.unit,
          active: row.active ?? true,
          source_field: row.source_field ?? null,
        };
      });

      return configMap;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch slot configurations: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  // ========== UPDATE slot config (now saves source_field) ==========
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
      await this.verifyDeviceOwnership(client, userId, serial_number);

      for (const config of slot_configs) {
        await client.query(
          `
          INSERT INTO slot_configurations 
            (device_serial_number, slot_key, label, unit, active, source_field, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (device_serial_number, slot_key) 
          DO UPDATE SET 
            label = EXCLUDED.label,
            unit = EXCLUDED.unit,
            active = EXCLUDED.active,
            source_field = EXCLUDED.source_field,
            updated_at = NOW();
          `,
          [
            serial_number,
            config.slot_key,
            config.label,
            config.unit,
            config.active ?? true,
            config.source_field ?? null,
          ],
        );
      }

      await client.query('COMMIT');
      return { message: 'Slot configurations saved successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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