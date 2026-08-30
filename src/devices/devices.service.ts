import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceDto } from './dto/device.dto';

/**
 * Devices Service
 * Handles all device-related database operations
 */
@Injectable()
export class DevicesService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Get all devices for a user
   * @param userId - The user's ID
   * @returns Array of devices
   */
  async getAllDevices(userId: number): Promise<DeviceDto[]> {
    const query =
      'SELECT device_id as id, device_name as name, location, status, serial_number as "serialNumber" FROM devices WHERE owner_user_id = $1';
    try {
      const result = await this.dbService.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  /**
   * Get a specific device by ID
   * @param userId - The user's ID
   * @param deviceId - The device ID
   * @returns Device details
   */
  async getDeviceById(userId: number, deviceId: number): Promise<DeviceDto> {
    const query =
      'SELECT device_id as id, device_name as name, location, status, serial_number as "serialNumber" FROM devices WHERE device_id = $1 AND owner_user_id = $2';
    try {
      const result = await this.dbService.query(query, [deviceId, userId]);
      if (result.rows.length === 0) {
        throw new NotFoundException('Device not found or access denied');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch device: ${error.message}`);
    }
  }

  /**
   * Create a new device
   * @param userId - The user's ID
   * @param createDeviceDto - Device creation data
   * @returns Created device
   */
  async createDevice(
    userId: number,
    createDeviceDto: CreateDeviceDto,
  ): Promise<DeviceDto> {
    const { serialNumber, deviceName, location } = createDeviceDto;

    // Validate input
    if (!serialNumber || !deviceName || !location) {
      throw new BadRequestException('Missing required fields');
    }

    const client = await this.dbService.getClient();
    try {
      // Check user's device limit
      const userQuery = 'SELECT packet FROM users WHERE user_id = $1';
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new NotFoundException('User not found');
      }

      const user = userResult.rows[0];

      const deviceCountQuery = 'SELECT COUNT(*) as device_count FROM devices WHERE owner_user_id = $1';
      const deviceCountResult = await client.query(deviceCountQuery, [userId]);
      const deviceCount = parseInt(deviceCountResult.rows[0].device_count, 10);

      if (user.packet === false && deviceCount >= 2) {
        throw new BadRequestException('Users on the free plan can only register up to 2 devices.');
      }

      if (deviceCount >= 20) {
        throw new BadRequestException('Maximum number of devices (20) reached.');
      }

      // Check if serial number already exists
      const checkQuery = 'SELECT 1 FROM devices WHERE serial_number = $1';
      const checkResult = await client.query(checkQuery, [serialNumber]);

      if (checkResult.rows.length > 0) {
        throw new BadRequestException('Serial number already registered');
      }

      // Insert new device
      const insertQuery = `
        INSERT INTO devices (owner_user_id, serial_number, device_name, location, status) 
        VALUES ($1, $2, $3, $4, 'Offline') 
        RETURNING device_id as id, device_name as name, location, status, serial_number as "serialNumber";
      `;

      const result = await client.query(insertQuery, [
        userId,
        serialNumber,
        deviceName,
        location,
      ]);

      return result.rows[0];
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to create device: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update a device
   * @param userId - The user's ID
   * @param deviceId - The device ID
   * @param updateData - Updated device data
   * @returns Updated device
   */
  async updateDevice(
    userId: number,
    deviceId: number,
    updateData: Partial<CreateDeviceDto>,
  ): Promise<DeviceDto> {
    const client = await this.dbService.getClient();
    try {
      // Verify device ownership
      const ownerQuery =
        'SELECT 1 FROM devices WHERE device_id = $1 AND owner_user_id = $2';
      const ownerResult = await client.query(ownerQuery, [deviceId, userId]);

      if (ownerResult.rows.length === 0) {
        throw new NotFoundException('Device not found or access denied');
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (updateData.deviceName) {
        updateFields.push(`device_name = $${paramIndex}`);
        queryParams.push(updateData.deviceName);
        paramIndex++;
      }

      if (updateData.location) {
        updateFields.push(`location = $${paramIndex}`);
        queryParams.push(updateData.location);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        // No fields to update
        return this.getDeviceById(userId, deviceId);
      }

      queryParams.push(deviceId);
      queryParams.push(userId);

      const updateQuery = `
        UPDATE devices 
        SET ${updateFields.join(', ')}
        WHERE device_id = $${paramIndex} AND owner_user_id = $${paramIndex + 1}
        RETURNING device_id as id, device_name as name, location, status, serial_number as "serialNumber";
      `;

      const result = await client.query(updateQuery, queryParams);
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update device: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a device
   * @param userId - The user's ID
   * @param deviceId - The device ID
   */
  async deleteDevice(userId: number, deviceId: number): Promise<void> {
    const client = await this.dbService.getClient();
    try {
      await client.query('BEGIN');

      // Get the serial number of the device to be deleted
      const deviceResult = await client.query(
        'SELECT serial_number FROM devices WHERE device_id = $1 AND owner_user_id = $2',
        [deviceId, userId],
      );

      if (deviceResult.rows.length === 0) {
        throw new NotFoundException('Device not found or access denied');
      }
      const serialNumber = deviceResult.rows[0].serial_number;

      // Delete related data from other tables
      await client.query('DELETE FROM slot_configurations WHERE device_serial_number = $1', [serialNumber]);
      await client.query('DELETE FROM device_relay WHERE device_serial_number = $1', [serialNumber]);
      await client.query('DELETE FROM device_configurations WHERE device_serial_number = $1', [serialNumber]);
      await client.query('DELETE FROM sensor_data WHERE device_serial_number = $1', [serialNumber]);
      await client.query('DELETE FROM sensor_data_averages WHERE device_serial_number = $1', [serialNumber]);

      // Delete the device itself
      const deleteDeviceResult = await client.query(
        'DELETE FROM devices WHERE device_id = $1 AND owner_user_id = $2',
        [deviceId, userId],
      );

      if (deleteDeviceResult.rowCount === 0) {
        throw new NotFoundException('Device not found or access denied during deletion');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete device: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
