import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

/**
 * Export Service
 * Handles sensor data export to CSV format
 */
@Injectable()
export class ExportService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Export sensor data to CSV
   * @param userId - The user's ID
   * @param serialNumber - Device serial number
   * @returns CSV data as string
   */
  async exportSensorDataToCSV(
    userId: number,
    serialNumber: string,
  ): Promise<string> {
    if (!serialNumber) {
      throw new BadRequestException('Device serial number is required');
    }

    const client = await this.dbService.getClient();
    try {
      // 1. Verify device ownership
      const deviceCheckQuery =
        'SELECT 1 FROM devices WHERE owner_user_id = $1 AND serial_number = $2';
      const deviceCheckResult = await client.query(deviceCheckQuery, [
        userId,
        serialNumber,
      ]);

      if (deviceCheckResult.rows.length === 0) {
        throw new NotFoundException('Device not found or access denied');
      }

      // 2. Fetch all historical sensor data
      const dataQuery = `
        SELECT time, data1, data2, data3, data4, data5, data6, data7, data8
        FROM sensor_data_averages 
        WHERE device_serial_number = $1 
        ORDER BY time ASC; 
      `;

      const dataResult = await client.query(dataQuery, [serialNumber]);

      // 3. Convert JSON to CSV
      const csvData = this.jsonToCsv(dataResult.rows);

      return csvData;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to export sensor data: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Convert JSON array to CSV string
   * @param jsonData - Array of objects to convert
   * @returns CSV formatted string
   */
  private jsonToCsv(jsonData: any[]): string {
    if (!jsonData || jsonData.length === 0) {
      return '';
    }

    // Extract headers from first object
    const headers = Object.keys(jsonData[0]);
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of jsonData) {
      const values = headers.map((header) => {
        // Escape double quotes and wrap all fields
        const escaped = ('' + row[header]).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
