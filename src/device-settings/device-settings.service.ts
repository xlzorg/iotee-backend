import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  UpdateDeviceSettingsDto,
  DeviceSettingsResponseDto,
} from './dto/device-settings.dto';
import * as mqtt from 'mqtt';


@Injectable()
export class DeviceSettingsService {
  private mqttClient!: mqtt.MqttClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private readonly dbService: DatabaseService) {
    this.initializeMqtt();
  }

  /**
   * Initialize MQTT client
   */
  private initializeMqtt(): void {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker:1883';
      this.mqttClient = mqtt.connect(brokerUrl);

      this.mqttClient.on('connect', () => {
        console.log('MQTT Client connected');
        this.reconnectAttempts = 0; // Reset on successful connect
      });

      this.mqttClient.on('error', (error: Error) => {
        console.log('MQTT Client error:', error);
      });

      this.mqttClient.on('close', () => {
        console.log('MQTT Client closed, attempting reconnect...');
        this.scheduleReconnect();
      });
    } catch (error: any) {
      console.log('Failed to initialize MQTT client:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts); // Exponential backoff
    console.log(`Reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);

    setTimeout(() => {
      this.initializeMqtt();
    }, delay);
  }

  private async verifyDeviceOwnership(
    client: any,
    userId: number,
    deviceId: number,
  ) {
    const ownerQuery = `SELECT 1 FROM devices WHERE device_id = $1 AND owner_user_id = $2`;
    const ownerResult = await client.query(ownerQuery, [deviceId, userId]);
    if (ownerResult.rows.length === 0) {
      throw new NotFoundException('Device not found or access denied');
    }
  }

  async getDeviceSettings(
    userId: number,
    deviceId: number,
  ): Promise<Partial<DeviceSettingsResponseDto>> {
    const client = await this.dbService.getClient();
    try {
      await this.verifyDeviceOwnership(client, userId, deviceId);

      const settingsQuery = `SELECT * FROM device_settings WHERE device_id = $1`;
      const settingsResult = await client.query(settingsQuery, [deviceId]);

      if (settingsResult.rows.length === 0) {
        // No settings found, return a default structure to prevent frontend errors.
        return {
          lampOn: '06:00',
          lampOff: '18:00',
        };
      }
      const settings = settingsResult.rows[0];

      // Map DB snake_case to DTO camelCase for a consistent API response
      const response: Partial<DeviceSettingsResponseDto> = {
        deviceId: settings.device_id,
        lampOn: settings.lamp_on_time?.substring(0, 5), // Format to HH:MM
        lampOff: settings.lamp_off_time?.substring(0, 5), // Format to HH:MM
        sprayerDuration: settings.sprayer_duration_seconds,
        dripDuration: settings.drip_duration_seconds,
        additionalDuration: settings.additional_duration_seconds,
        sprayerSchedules: settings.sprayer_schedules ? JSON.parse(settings.sprayer_schedules) : [],
        dripSchedules: settings.drip_schedules ? JSON.parse(settings.drip_schedules) : [],
        additionalSchedules: settings.additional_schedules ? JSON.parse(settings.additional_schedules) : [],
      };

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to get device settings: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

  async updateDeviceSettings(
    userId: number,
    settingsDto: UpdateDeviceSettingsDto,
  ): Promise<{ message: string }> {
    console.log('Received settings DTO:', JSON.stringify(settingsDto, null, 2));
    const client = await this.dbService.getClient();
    try {
      await client.query('BEGIN');

      await this.verifyDeviceOwnership(client, userId, settingsDto.deviceId);

      const upsertSettingsQuery = `
        INSERT INTO device_settings (device_id, lamp_on_time, lamp_off_time, sprayer_duration_seconds, drip_duration_seconds, additional_duration_seconds, sprayer_schedules, drip_schedules, additional_schedules)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (device_id) DO UPDATE SET
          lamp_on_time = EXCLUDED.lamp_on_time,
          lamp_off_time = EXCLUDED.lamp_off_time,
          sprayer_duration_seconds = EXCLUDED.sprayer_duration_seconds,
          drip_duration_seconds = EXCLUDED.drip_duration_seconds,
          additional_duration_seconds = EXCLUDED.additional_duration_seconds,
          sprayer_schedules = EXCLUDED.sprayer_schedules,
          drip_schedules = EXCLUDED.drip_schedules,
          additional_schedules = EXCLUDED.additional_schedules,
          last_updated = NOW()
        RETURNING settings_id;
      `;
      await client.query(upsertSettingsQuery, [
        settingsDto.deviceId,
        settingsDto.lampOn,
        settingsDto.lampOff,
        settingsDto.sprayerDuration,
        settingsDto.dripDuration,
        settingsDto.additionalDuration,
        JSON.stringify(settingsDto.sprayerSchedules),
        JSON.stringify(settingsDto.dripSchedules),
        JSON.stringify(settingsDto.additionalSchedules),
      ]);

      await client.query('COMMIT');
      
      // Publish to MQTT
      this.publishToMqtt(settingsDto.serial_number, {
        lamp: { on: settingsDto.lampOn, off: settingsDto.lampOff },
        sprayer: {
          schedules: settingsDto.sprayerSchedules,
          duration_sec: parseInt(settingsDto.sprayerDuration.toString(), 10),
        },
        drip: {
          schedules: settingsDto.dripSchedules,
          duration_sec: parseInt(settingsDto.dripDuration.toString(), 10),
        },
        additional: {
          schedules: settingsDto.additionalSchedules || [],
          duration_sec: settingsDto.additionalDuration
            ? parseInt(settingsDto.additionalDuration.toString(), 10)
            : 0,
        },
      });

      return { message: 'Settings saved & synced via MQTT!' };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Failed to update device settings: ${error.message}`,
      );
    } finally {
      client.release();
    }
  }

/**
   * Publish settings to MQTT broker
   * @param serialNumber - Device serial number
   * @param payload - Settings payload
   */
  private publishToMqtt(serialNumber: string, payload: any): void {
    try {
      if (!this.mqttClient || !this.mqttClient.connected) {
        console.warn('MQTT client not connected, skipping publish');
        return;
      }

      const topic = `sensors/${serialNumber}/settings`;
      this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('Failed to publish to MQTT:', err);
        } else {
          console.log(`Settings published to topic: ${topic}`);
        }
      });
    } catch (error) {
      console.log('MQTT publish error:', error);
    }
  }
}