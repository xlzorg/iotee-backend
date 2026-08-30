
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateDeviceRelayDto } from './dto/update-device-relay.dto';
import * as mqtt from 'mqtt';

@Injectable()
export class DeviceRelayService {
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
        console.log('DeviceRelayService: MQTT Client connected');
        this.reconnectAttempts = 0;
      });

      this.mqttClient.on('error', (error: Error) => {
        console.error('DeviceRelayService: MQTT Client error:', error);
      });

      this.mqttClient.on('close', () => {
        console.log('DeviceRelayService: MQTT Client closed, attempting reconnect...');
        this.scheduleReconnect();
      });
    } catch (error: any) {
      console.error('DeviceRelayService: Failed to initialize MQTT client:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('DeviceRelayService: Max reconnect attempts reached.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`DeviceRelayService: Reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);

    setTimeout(() => {
      this.initializeMqtt();
    }, delay);
  }

  private publishToMqtt(serialNumber: string, relayIndex: number, payload: any): void {
    try {
      if (!this.mqttClient || !this.mqttClient.connected) {
        console.warn('DeviceRelayService: MQTT client not connected, skipping publish');
        return;
      }

      const topic = `devices/${serialNumber}/relay/${relayIndex}/settings`;
      this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`DeviceRelayService: Failed to publish to MQTT topic ${topic}`, err);
        } else {
          console.log(`DeviceRelayService: Settings published to topic: ${topic}`);
        }
      });
    } catch (error) {
      console.error('DeviceRelayService: MQTT publish error:', error);
    }
  }

  async findAll(deviceSerialNumber: string) {
    const client = await this.db.getClient();
    try {
      const query = 'SELECT * FROM device_relay WHERE device_serial_number = $1 ORDER BY relay_index ASC';
      const result = await client.query(query, [deviceSerialNumber]);

      if (result.rows.length === 0) {
        const defaultRelays = [];
        for (let i = 1; i <= 8; i++) {
          defaultRelays.push({
            device_serial_number: deviceSerialNumber,
            relay_index: i,
            relay_name: `Relay ${i}`,
            output_condition: 0,
            static_start: null,
            static_stop: null,
            static_condition: 0,
            periodic_start: null,
            periodic_interval: 5,
            periodic_runtime: 5,
            periodic_limit: 3,
            sensor_trigger: 0,
            sensor_state: 0,
            sensor_slot: null,
            active: false,
          });
        }
        return defaultRelays;
      }

      return result.rows;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to find relays: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async findOne(deviceSerialNumber: string, relayIndex: number) {
    const client = await this.db.getClient();
    try {
      const query = 'SELECT * FROM device_relay WHERE device_serial_number = $1 AND relay_index = $2';
      const params = [deviceSerialNumber, relayIndex];
      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          device_serial_number: deviceSerialNumber,
          relay_index: relayIndex,
          relay_name: `Relay ${relayIndex}`,
          output_condition: 0,
          static_start: null,
          static_stop: null,
          static_condition: 0,
          periodic_start: null,
          periodic_interval: 5,
          periodic_runtime: 5,
          periodic_limit: 3,
          sensor_trigger: 0,
          sensor_state: 0,
          sensor_slot: null,
          active: false,
        };
      }

      return result.rows[0];
    } catch (error) {
      throw new InternalServerErrorException(`Failed to find relay: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async update(deviceSerialNumber: string, relayIndex: number, updateDeviceRelayDto: UpdateDeviceRelayDto) {
    const properties = Object.keys(updateDeviceRelayDto);

    if (properties.length > 0) {
      const client = await this.db.getClient();
      try {
        const columns = ['device_serial_number', 'relay_index', ...properties];
        const values = [deviceSerialNumber, relayIndex, ...properties.map(key => updateDeviceRelayDto[key])];
        const valuePlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const updateSetClauses = properties.map(key => `${key} = EXCLUDED.${key}`).join(', ');

        const query = `
          INSERT INTO device_relay (${columns.join(', ')}, updated_at)
          VALUES (${valuePlaceholders}, NOW())
          ON CONFLICT (device_serial_number, relay_index)
          DO UPDATE SET ${updateSetClauses}, updated_at = NOW();
        `;

        await client.query(query, values);
        
        // Publish the update to MQTT
        this.publishToMqtt(deviceSerialNumber, relayIndex, updateDeviceRelayDto);

      } catch (error) {
        throw new InternalServerErrorException(`Failed to update relay: ${error.message}`);
      } finally {
        client.release();
      }
    }

    return this.findOne(deviceSerialNumber, relayIndex);
  }
}
