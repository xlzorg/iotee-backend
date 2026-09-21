
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateDeviceRulesDto } from './dto/update-device-rules.dto';
import * as mqtt from 'mqtt';

@Injectable()
export class DeviceRulesService {
  private mqttClient!: mqtt.MqttClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private db: DatabaseService) {
    this.initializeMqtt();
  }

  private initializeMqtt(): void {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker:1883';
      this.mqttClient = mqtt.connect(brokerUrl);

      this.mqttClient.on('connect', () => {
        console.log('DeviceRulesService: MQTT Client connected');
        this.reconnectAttempts = 0;
      });

      this.mqttClient.on('error', (error: Error) => {
        console.log('DeviceRulesService: MQTT Client error:', error);
      });

      this.mqttClient.on('close', () => {
        console.log('DeviceRulesService: MQTT Client closed, attempting reconnect...');
        this.scheduleReconnect();
      });
    } catch (error: any) {
      console.error('DeviceRulesService: Failed to initialize MQTT client:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('DeviceRulesService: Max reconnect attempts reached.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`DeviceRulesService: Reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);

    setTimeout(() => {
      this.initializeMqtt();
    }, delay);
  }

  private publishToMqtt(serialNumber: string, payload: any): void {
    try {
      if (!this.mqttClient || !this.mqttClient.connected) {
        console.warn('DeviceRulesService: MQTT client not connected, skipping publish');
        return;
      }

      const topic = `devices/${serialNumber}/rules`;
      this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`DeviceRulesService: Failed to publish to MQTT topic ${topic}`, err);
        } else {
          console.log(`DeviceRulesService: Rules published to topic: ${topic}`);
        }
      });
    } catch (error) {
      console.error('DeviceRulesService: MQTT publish error:', error);
    }
  }

  async getRules(deviceSerialNumber: string) {
    const client = await this.db.getClient();
    try {
      const query = 'SELECT rules FROM device_rules WHERE device_serial_number = $1';
      const result = await client.query(query, [deviceSerialNumber]);

      if (result.rows.length === 0) {
        return { rules: [] };
      }

      // Ensure the output is always { rules: [...] }
      return { rules: result.rows[0].rules || [] };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get rules: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async updateRules(deviceSerialNumber: string, updateDeviceRulesDto: UpdateDeviceRulesDto) {
    const client = await this.db.getClient();
    try {
      const { rules } = updateDeviceRulesDto;
      const query = `
        INSERT INTO device_rules (device_serial_number, rules)
        VALUES ($1, $2)
        ON CONFLICT (device_serial_number)
        DO UPDATE SET rules = $2, updated_at = NOW()
        RETURNING rules;
      `;
      const result = await client.query(query, [deviceSerialNumber, JSON.stringify(rules)]);
      
      this.publishToMqtt(deviceSerialNumber, { rules });

      return result.rows[0];
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update rules: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
