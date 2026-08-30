import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(@Inject('PG_POOL') private pool: any) {}

  async getDashboardData(userId: string) {
    const client = await this.pool.connect();
    const numericId = parseInt(userId, 10); // ✅ Add this
    try {
      const settingsQuery = `
        SELECT 
            u.username, 
            up.app_name, 
            up.dashboard_bg_url,
            up.cover_logo_1_url,
            up.cover_logo_2_url,
            up.cover_logo_3_url,
            up.cover_logo_4_url,
            up.cover_logo_5_url,
            u.packet,
            u.packet_type,
            u.start_time,
            u.end_time
        FROM users u 
        JOIN user_profiles up ON u.user_id = up.user_id 
        WHERE u.user_id = $1
      `;
      
      const devicesQuery = `
        SELECT device_id as id, device_name as name, location, status, serial_number 
        FROM devices 
        WHERE owner_user_id = $1
      `;

      const [settingsResult, devicesResult] = await Promise.all([
      client.query(settingsQuery, [numericId]), // ✅ use numericId
      client.query(devicesQuery, [numericId]),  // ✅ use numericId
      ]);

      if (settingsResult.rows.length === 0) {
        throw new Error('User profile not found in the database.');
      }

      const settings = settingsResult.rows[0];
      const devices = devicesResult.rows;

      const stats = {
        total: devices.length,
        online: devices.filter(d => d.status === 'Online').length,
        warnings: devices.filter(d => d.status === 'Warning').length,
        offline: devices.filter(d => d.status === 'Offline').length,
      };

      return { 
        settings, 
        devices, 
        stats, 
        slot_configs: null 
      };

    } catch (error) {
      console.error("Database error in getDashboardData:", error);
      throw new Error('Failed to fetch dashboard data from the database.');
    } finally {
      client.release();
    }
  }
}
